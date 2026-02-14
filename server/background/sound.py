import sys
import threading
from pathlib import Path

sys.path.append(str(Path(__file__).parents[2]))

import asyncio
import time
from datetime import timedelta, datetime, timezone
import numpy as np
import sounddevice as sd
import soundfile as sf

from server import music_id
from server.config import env_config, file_config
from server.logger import logger
from server.last_fm import get_last_fm_track, get_last_fm_artist, get_last_fm_album, extract_track_number_from_last_fm
from server.db import save_history_entry, get_history_entries, get_db_track_from_music_id
from server.utils import utcnow, normalize
from server.models import ResponseModel, IdentifyResult
from server.db import get_history_entry, update_history_entries
from server.utils import clamp
from server.circular_buffer import CircularBuffer
from server import sql_schemas
from server.ipc.peer import Peer, SyncPeer

buffer_lock = threading.Lock()


def get_effective_audio_params():
    """Get effective sample_rate and channels, using device defaults if not specified in config."""
    sample_rate = file_config.sample_rate
    channels = file_config.channels
    
    # If either is None, query the device for defaults
    if sample_rate is None or channels is None:
        device_name = file_config.device if file_config.device else None
        device_info = None
        
        try:
            if device_name:
                # Find the device by name
                devices = sd.query_devices()
                for dev in devices:
                    if dev.get("name", "").startswith(device_name):
                        device_info = dev
                        logger.info(f"Found device '{device_name}' for parameter lookup")
                        break
                if not device_info:
                    logger.warning(f"Device '{device_name}' not found, using defaults")
            else:
                # Use default input device
                default_device_idx = sd.default.device[0] if sd.default.device else None
                if default_device_idx is not None:
                    device_info = sd.query_devices(default_device_idx)
                    logger.info(f"Using default input device (index {default_device_idx}) for parameter lookup")
                else:
                    logger.warning("No default input device found, using fallback defaults")
            
            if device_info:
                if sample_rate is None:
                    sample_rate = int(device_info.get("default_samplerate", 44100))
                    logger.info(f"Using device default sample rate: {sample_rate} Hz")
                if channels is None:
                    # Use max_input_channels, but default to 2 (stereo) if available
                    max_channels = device_info.get("max_input_channels", 0)
                    channels = min(max_channels, 2) if max_channels > 0 else 2
                    logger.info(f"Using device default channels: {channels}")
            else:
                # Fallback defaults if device not found
                if sample_rate is None:
                    sample_rate = 44100
                    logger.info(f"Using fallback sample rate: {sample_rate} Hz")
                if channels is None:
                    channels = 2
                    logger.info(f"Using fallback channels: {channels}")
        except Exception as e:
            logger.warning(f"Error querying device parameters: {e}, using fallback defaults")
            if sample_rate is None:
                sample_rate = 44100
            if channels is None:
                channels = 2
    
    return sample_rate, channels


# Get effective audio parameters
effective_sample_rate, effective_channels = get_effective_audio_params()
buffer_size = effective_sample_rate * file_config.buffer_length_seconds


# ------------------------------------------------------------------
# IPC-based sleep (replaces Redis-based sleep)
# ------------------------------------------------------------------

def ipc_sleep(sync_peer: SyncPeer, sleep_id: str, seconds: int | float, poll_interval: float = 0.2):
    """Interruptible sleep via the IPC state manager.

    Sets a key ``sleep.<sleep_id>`` with a TTL equal to *seconds*.  Then
    polls the key; the sleep ends when the key expires **or** is deleted
    by the web server (e.g. scan-now).
    """
    if seconds <= 0:
        return
    elif seconds < poll_interval:
        time.sleep(seconds)
        return

    key = f"sleep.{sleep_id}"
    ends_at = utcnow() + timedelta(seconds=seconds)
    sync_peer.state_set(key, ends_at.isoformat(), ttl_ms=int(seconds * 1000))

    while sync_peer.state_get(key):
        time.sleep(poll_interval)


# ------------------------------------------------------------------
# Audio capture
# ------------------------------------------------------------------

def audio_capture(audio_buffer: CircularBuffer, timestamp_np: np.ndarray):
    """ Continuously captures stereo audio and updates shared memory buffer. """

    frames = file_config.blocksize

    def callback(in_data, n_frames, time_, _status):
        with buffer_lock:
            last_frame_time = time_.inputBufferAdcTime + (n_frames / effective_sample_rate)
            last_frame_time += (time.time() - time_.currentTime)
            timestamp_np[0] = last_frame_time + file_config.device_offset
            audio_buffer.write(in_data)

    with sd.InputStream(
        samplerate=effective_sample_rate,
        blocksize=frames,
        channels=effective_channels,
        device=file_config.device if file_config.device else None,
        dtype="float32",
        latency=file_config.latency,
        callback=callback,
    ) as stream:
        logger.info("Recording... Press Ctrl+C to stop.")
        stream.start()

        try:
            while True:
                pass

        except KeyboardInterrupt:
            logger.info("\nStopped recording.")


# ------------------------------------------------------------------
# Music identification loop
# ------------------------------------------------------------------

def run_music_id_loop(
    audio_buffer: CircularBuffer,
    timestamp_np: np.ndarray,
    loop: asyncio.BaseEventLoop,
    sync_peer: SyncPeer,
):
    asyncio.set_event_loop(loop)

    back_off = 0.0  # portion of configured duration time to wait before recording again
    duration = 0.7 * file_config.duration  # duration to record for
    subsequent_detects = 0  # number of times the same track has been detected subsequently
    is_waiting = True  # True when waiting for sound, False when actively scanning

    while True:
        try:
            if is_waiting:
                # Waiting mode: poll every second and check RMS
                sync_peer.state_delete("now_scanning")
                sync_peer.state_set("status", "waiting", ttl_ms=2000)
                logger.debug("Waiting for sound...")
                time.sleep(1.0)

                with buffer_lock:
                    # Check RMS of the last 1 second
                    check_frames = int(1.0 * effective_sample_rate)
                    audio_data = audio_buffer.read(check_frames)
                    last_frame_time = timestamp_np[0]

                rms = float(np.sqrt(np.mean(audio_data ** 2)))
                
                if rms >= file_config.silence_threshold:
                    # Sound detected, switch to scanning mode
                    logger.info(f"Sound detected (RMS: {rms}), starting scan...")
                    is_waiting = False
                    sync_peer.state_delete("status")
                    # Continue to scanning logic below
                else:
                    # Still no sound, continue waiting
                    continue

            # Scanning mode: perform full music identification
            sync_peer.state_set("now_scanning", (utcnow() + timedelta(seconds=duration)).isoformat())
            logger.info(f"scanning {duration}s...")
            time.sleep(duration)

            with buffer_lock:
                clip_frames = int(duration * effective_sample_rate)
                audio_data = audio_buffer.read(clip_frames)
                last_frame_time = timestamp_np[0]

            music_id_result = asyncio.run_coroutine_threadsafe(
                music_id.recognize_raw(audio_data, effective_sample_rate),
                loop
            ).result(10)
            result = IdentifyResult.model_validate({
                "recorded_at": datetime.fromtimestamp(last_frame_time - duration, timezone.utc),
                "rms": float(np.sqrt(np.mean(audio_data ** 2))),
                **(music_id_result.model_dump()),
            })

            if result.success:
                result.started_at = (result.recorded_at - timedelta(seconds=result.track.offset)).replace(microsecond=0)

                async def _fetch_meta():
                    # Fetch all metadata in parallel
                    async def _get_album():
                        if result.track.album_name:
                            return await get_last_fm_album(
                                result.track.artist_name.split(" & ")[0],
                                result.track.album_name
                            )
                        return None
                    
                    result.last_fm_track, result.last_fm_artist, result.last_fm_album = await asyncio.gather(
                        get_last_fm_track(result.track.track_name, result.track.artist_name),
                        get_last_fm_artist(result.track.artist_name.split(" & ")[0]),
                        _get_album(),
                    )

                asyncio.run_coroutine_threadsafe(_fetch_meta(), loop).result(10)

                if result.track.duration_seconds:
                    result.duration_seconds = result.track.duration_seconds
                elif result.last_fm_track and (duration_seconds := result.last_fm_track.duration_seconds):
                    result.duration_seconds = duration_seconds

                # Extract track number from LastFM data
                if not result.track.track_no and result.last_fm_track and result.last_fm_album:
                    track_data = result.last_fm_track.model_dump()
                    track_no = extract_track_number_from_last_fm(track_data, result.last_fm_album)
                    result.track.track_no = track_no


                db_track = get_db_track_from_music_id(
                    track_id=result.track.track_id,
                    source=file_config.music_id_plugin,
                    track_name=result.track.track_name,
                    artist_name=result.track.artist_name,
                    album_name=result.track.album_name,
                    track_no=result.track.track_no,
                    label=result.track.label,
                    released=result.track.released,
                    track_image=result.track.track_image,
                    artist_image=result.track.artist_image,
                    duration_seconds=result.duration_seconds,
                    last_fm=result.last_fm_track.model_dump(),
                )

                result.duration_seconds = db_track.duration_seconds

                if result.duration_seconds:
                    remaining_seconds = int(result.duration_seconds - (utcnow() - result.started_at).total_seconds())
                else:
                    remaining_seconds = 0

                if str(db_track.track_guid) == str(sync_peer.state_get("track_id")):
                    subsequent_detects += 1
                    if subsequent_detects >= 1:

                        save_history_entry(
                            track_guid=db_track.track_guid,
                            detected_at=utcnow(),
                            started_at=result.started_at,
                        )
                else:
                    subsequent_detects = 0
                    back_off = 0

                expire_after_ms = int((max(0, remaining_seconds) + (file_config.duration + 5) * 3) * 1000)

                sync_peer.state_set("now_playing", result.model_dump_json(), ttl_ms=expire_after_ms)
                sync_peer.state_set("track_id", str(db_track.track_guid), ttl_ms=expire_after_ms)
                sync_peer.state_set("offset", str(result.track.offset) if result.track.offset else None, ttl_ms=expire_after_ms)

                logger.info(
                    f"{result.track.artist_name} - {result.track.track_name}  "
                    f"({remaining_seconds}s remaining)"
                )

                if remaining_seconds < 2 * file_config.duration + 3:
                    if remaining_seconds == 0:
                        duration = file_config.duration
                    else:
                        # try to fetch the next song faster for a quick update
                        duration = 0.7 * file_config.duration
                        ipc_sleep(sync_peer, "next_scan", max(0, remaining_seconds + 1))

                else:
                    duration = file_config.duration
                    ipc_sleep(sync_peer, "next_scan", back_off * file_config.duration)
                    back_off = min(1.0, back_off + 0.25)

            else:
                logger.info(result.message)
                if sync_peer.state_get("track_id"):
                    back_off = 0

                # If RMS is below threshold, switch to waiting mode
                if result.rms < file_config.silence_threshold:
                    logger.info(f"No sound detected (RMS: {result.rms}), entering waiting mode...")
                    is_waiting = True
                    subsequent_detects = 0
                    back_off = 0
                    continue
                
                duration = file_config.duration
                ipc_sleep(sync_peer, "next_scan", back_off * file_config.duration)
                back_off = min(1.0, back_off + 0.25)
                subsequent_detects = 0

            sync_peer.state_set("message", result.message)
            sync_peer.state_set("recorded_at", result.recorded_at.isoformat())

        except Exception as e:
            sync_peer.state_delete("now_scanning")
            logger.warning(str(e))
            # raise e

            ipc_sleep(sync_peer, "next_scan", back_off * file_config.duration)
            back_off = min(1.0, back_off + 0.25)
            duration = file_config.duration
            subsequent_detects = 0


# ------------------------------------------------------------------
# Live stats
# ------------------------------------------------------------------

def run_live_stats(
    audio_buffer: CircularBuffer,
    timestamp_np: np.ndarray,
    sync_peer: SyncPeer,
):
    while True:
        try:
            time.sleep(env_config.live_stats_frequency)

            with buffer_lock:
                clip_frames = int(env_config.live_stats_frequency * effective_sample_rate)
                audio_data = audio_buffer.read(clip_frames)

            rms = float(np.sqrt(np.mean(audio_data ** 2)))

            ttl_ms = int((env_config.live_stats_frequency + 1) * 1000)
            sync_peer.state_set("rms", str(rms), ttl_ms=ttl_ms)

        except Exception as e:
            logger.warning(str(e))
            time.sleep(env_config.live_stats_frequency)


# ------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------

def start_recorder() -> None:
    """Start the recorder service.

    Creates its own asyncio event loop, connects a ``Peer("recorder")``
    to the broker, registers command handlers, and launches worker
    threads for audio capture, music identification, and live stats.

    This function blocks forever (runs the event loop).  Call it from a
    daemon thread when embedding inside another process.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    audio_buffer = CircularBuffer((buffer_size, effective_channels), dtype=np.float32)

    timestamp_np = np.ndarray((1,), dtype=np.float64)
    timestamp_np[0] = 0

    # -- IPC peer -------------------------------------------------------
    peer = Peer("recorder", env_config.ipc_broker_dir)
    sync_peer = SyncPeer(peer, loop)

    # -- Command handlers -----------------------------------------------
    # These closures capture audio_buffer and timestamp_np from the outer
    # scope so they can access the circular buffer when the server sends
    # save / dump commands.

    def _save_entry(entry_id: str) -> ResponseModel:
        entry = get_history_entry(entry_id)
        if entry is None:
            return ResponseModel(success=False, status="not_found")

        logger.info(f"Saving temp {entry.track.track_name}")

        if entry.started_at and entry.track.duration_seconds:
            started_at = entry.started_at.timestamp() - file_config.temp_save_offset
            ended_at = started_at + entry.track.duration_seconds + 2 * file_config.temp_save_offset
        else:
            started_at = time.time() - file_config.buffer_length_seconds
            ended_at = time.time()

        song_path = env_config.appdata_dir / "temp" / f"{entry.entry_id}.flac"
        song_path.parent.mkdir(parents=True, exist_ok=True)

        with buffer_lock:
            last_frame_time = timestamp_np[0]
            started_frame = clamp(
                int((started_at - last_frame_time) * effective_sample_rate),
                -file_config.buffer_length_seconds * effective_sample_rate,
                -1,
            )
            ended_frame = clamp(
                int((ended_at - last_frame_time) * effective_sample_rate),
                -file_config.buffer_length_seconds * effective_sample_rate,
                0,
            )
            audio_data = audio_buffer.slice(started_frame, ended_frame)

        sf.write(song_path, audio_data, effective_sample_rate, format="FLAC")

        update_history_entries(
            dict(entry_id=entry.entry_id),
            saved_temp_buffer=True
        )

        return ResponseModel(success=True, message="Saved temp song", data=song_path.absolute())

    def _dump_audio(seconds: float | None = None) -> ResponseModel:
        logger.info("Dumping audio buffer")

        with buffer_lock:
            raw = audio_buffer.read(int(seconds * effective_sample_rate) if seconds else None)

        raw = normalize(raw)
        path = env_config.appdata_dir / "dump.flac"
        sf.write(path, raw, effective_sample_rate, format="FLAC")
        return ResponseModel(
            success=True,
            message="Saved audio buffer",
            data=path.absolute(),
        )

    @peer.on_command("save")
    async def handle_save_command(data):
        """IPC command handler for 'save'."""
        try:
            resp = await loop.run_in_executor(None, _save_entry, data)
            return resp.model_dump()
        except Exception as e:
            logger.error(e)
            return ResponseModel(
                success=False,
                status="internal_error",
                message=str(e),
            ).model_dump()

    @peer.on_command("dump")
    async def handle_dump_command(data):
        """IPC command handler for 'dump'."""
        try:
            seconds = float(data) if data else None
            resp = await loop.run_in_executor(None, _dump_audio, seconds)
            return resp.model_dump()
        except Exception as e:
            logger.error(e)
            return ResponseModel(
                success=False,
                status="internal_error",
                message=str(e),
            ).model_dump()

    # -- Start peer (connects to broker) --------------------------------
    loop.run_until_complete(peer.start())

    # -- Start worker threads -------------------------------------------
    capture_thread = threading.Thread(
        target=audio_capture,
        args=(audio_buffer, timestamp_np),
        daemon=True,
    )
    capture_thread.start()

    music_id_thread = threading.Thread(
        target=run_music_id_loop,
        args=(audio_buffer, timestamp_np, loop, sync_peer),
        daemon=True,
    )
    music_id_thread.start()

    live_stats_thread = threading.Thread(
        target=run_live_stats,
        args=(audio_buffer, timestamp_np, sync_peer),
        daemon=True,
    )
    live_stats_thread.start()

    # Save and dump are handled by IPC command handlers on the event
    # loop – no dedicated threads needed.

    logger.info("Recorder service started")
    loop.run_forever()


if __name__ == "__main__":
    start_recorder()
