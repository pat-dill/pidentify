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
from server.last_fm import get_last_fm_track, get_last_fm_artist
from server.redis_client import sleep
from server.db import save_history_entry, get_history_entries, get_db_track_from_music_id
from server.utils import utcnow, normalize
from server.models import ResponseModel, IdentifyResult
from server.redis_client import get_redis
from server.db import get_history_entry, update_history_entries
from server.utils import clamp
from server.circular_buffer import CircularBuffer
from server import sql_schemas

buffer_lock = threading.Lock()
buffer_size = env_config.sample_rate * file_config.buffer_length_seconds


def audio_capture(audio_buffer: CircularBuffer, timestamp_np: np.ndarray):
    """ Continuously captures stereo audio and updates shared memory buffer. """

    frames = env_config.blocksize

    def callback(in_data, n_frames, time_, _status):
        with buffer_lock:
            last_frame_time = time_.inputBufferAdcTime + (n_frames / env_config.sample_rate)
            last_frame_time += (time.time() - time_.currentTime)
            timestamp_np[0] = last_frame_time + env_config.device_offset
            audio_buffer.write(in_data)

    with sd.InputStream(
        samplerate=env_config.sample_rate,
        blocksize=frames,
        channels=env_config.channels,
        device=env_config.device,
        dtype="float32",
        latency=env_config.latency,
        callback=callback,
    ) as stream:
        logger.info("Recording... Press Ctrl+C to stop.")
        stream.start()

        try:
            while True:
                pass

        except KeyboardInterrupt:
            logger.info("\nStopped recording.")


def run_music_id_loop(audio_buffer: CircularBuffer, timestamp_np: np.ndarray, loop: asyncio.BaseEventLoop):
    asyncio.set_event_loop(loop)

    back_off = 0.0  # portion of configured duration time to wait before recording again
    duration = 0.7 * env_config.duration  # duration to record for
    subsequent_detects = 0  # number of times the same track has been detected subsequently

    while True:
        rdb = get_redis()

        try:
            rdb.set("now_scanning", (utcnow() + timedelta(seconds=duration)).isoformat())
            logger.info(f"scanning {duration}s...")
            time.sleep(duration)

            with buffer_lock:
                clip_frames = int(duration * env_config.sample_rate)
                audio_data = audio_buffer.read(clip_frames)
                last_frame_time = timestamp_np[0]

            music_id_result = asyncio.run_coroutine_threadsafe(
                music_id.recognize_raw(audio_data, env_config.sample_rate),
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
                    result.last_fm_track, result.last_fm_artist = await asyncio.gather(
                        get_last_fm_track(result.track.track_name, result.track.artist_name),
                        get_last_fm_artist(result.track.artist_name.split(" & ")[0]),
                    )

                asyncio.run_coroutine_threadsafe(_fetch_meta(), loop).result(10)

                if result.track.duration_seconds:
                    result.duration_seconds = result.track.duration_seconds
                elif result.last_fm_track and (duration_seconds := result.last_fm_track.duration_seconds):
                    result.duration_seconds = duration_seconds

                db_track = get_db_track_from_music_id(
                    track_id=result.track.track_id,
                    source=file_config.music_id_plugin,
                    track_name=result.track.track_name,
                    artist_name=result.track.artist_name,
                    album_name=result.track.album_name,
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

                if str(db_track.track_guid) == str(rdb.get("track_id")):
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

                expire_after = timedelta(seconds=max(0, remaining_seconds) + (env_config.duration + 5) * 3)

                rdb.set("now_playing", result.model_dump_json(), px=expire_after)
                rdb.set("track_id", str(db_track.track_guid), px=expire_after)
                rdb.set("offset", result.track.offset or None, px=expire_after)

                logger.info(
                    f"{result.track.artist_name} - {result.track.track_name}  "
                    f"({remaining_seconds}s remaining)"
                )

                if remaining_seconds < 2 * env_config.duration + 3:
                    if remaining_seconds == 0:
                        duration = env_config.duration
                    else:
                        # try to fetch the next song faster for a quick update
                        duration = 0.7 * env_config.duration
                        sleep("next_scan", max(0, remaining_seconds + 1))

                else:
                    duration = env_config.duration
                    sleep("next_scan", back_off * env_config.duration)
                    back_off = min(1.0, back_off + 0.25)

            else:
                logger.info(result.message)
                if rdb.get("track_id"):
                    back_off = 0

                duration = env_config.duration
                sleep("next_scan", back_off * env_config.duration)
                back_off = min(1.0, back_off + 0.25)
                subsequent_detects = 0

            rdb.set("message", result.message)
            rdb.set("recorded_at", result.recorded_at.isoformat())

        except Exception as e:
            rdb.delete("now_scanning")
            logger.warning(str(e))
            raise e

            sleep("next_scan", back_off * env_config.duration)
            back_off = min(1.0, back_off + 0.25)
            duration = env_config.duration
            subsequent_detects = 0


def run_live_stats(audio_buffer: CircularBuffer, timestamp_np: np.ndarray):
    while True:
        rdb = get_redis()

        try:
            time.sleep(env_config.live_stats_frequency)

            with buffer_lock:
                clip_frames = int(env_config.live_stats_frequency * env_config.sample_rate)
                audio_data = audio_buffer.read(clip_frames)

            rms = float(np.sqrt(np.mean(audio_data ** 2)))

            rdb.set("rms", rms, px=timedelta(seconds=env_config.live_stats_frequency + 1))

        except Exception as e:
            logger.warning(str(e))
            time.sleep(env_config.live_stats_frequency)


def run_save_music(audio_buffer: CircularBuffer, timestamp_np: np.ndarray):
    def save_entry(entry_id: str):
        entry = get_history_entry(entry_id)
        if entry is None:
            return ResponseModel(success=False, status="not_found")

        logger.info(f"Saving temp {entry.track.track_name}")

        if entry.started_at and entry.track.duration_seconds:
            started_at = entry.started_at.timestamp() - file_config.temp_save_offset
            ended_at = started_at + entry.track.duration_seconds + file_config.temp_save_offset
        else:
            started_at = time.time() - file_config.buffer_length_seconds
            ended_at = time.time()

        song_path = env_config.appdata_dir / "temp" / f"{entry.entry_id}.flac"
        song_path.parent.mkdir(parents=True, exist_ok=True)

        with buffer_lock:
            last_frame_time = timestamp_np[0]
            started_frame = clamp(
                int((started_at - last_frame_time) * env_config.sample_rate),
                -file_config.buffer_length_seconds * env_config.sample_rate,
                -1,
            )
            ended_frame = clamp(
                int((ended_at - last_frame_time) * env_config.sample_rate),
                -file_config.buffer_length_seconds * env_config.sample_rate,
                0,
            )
            audio_data = audio_buffer.slice(started_frame, ended_frame)

        sf.write(song_path, audio_data, env_config.sample_rate, format="FLAC")

        # metadata = FLAC(song_path)
        # metadata["title"] = entry.track_name
        # metadata["artist"] = entry.artist
        # metadata["album"] = entry.album or "[Unknown Album]"
        # metadata.save()

        update_history_entries(
            dict(entry_id=entry.entry_id),
            saved_temp_buffer=True
        )

        return ResponseModel(success=True, message="Saved temp song", data=song_path.absolute())

    rdb = get_redis()
    ps = rdb.pubsub()
    ps.subscribe("save")
    for evt in ps.listen():
        if evt["type"] != "message":
            continue

        entry_id = evt["data"]

        try:
            resp = save_entry(entry_id)
            rdb.publish(entry_id, resp.model_dump_json())
        except Exception as e:
            logger.error(e)
            rdb.publish(
                entry_id,
                ResponseModel(
                    success=False,
                    status="internal_error",
                    message=str(e)
                ).model_dump_json()
            )


def run_dump_audio(audio_buffer: CircularBuffer):
    def dump_audio(seconds: float = None):
        logger.info(f"Dumping audio buffer")

        with buffer_lock:
            raw = audio_buffer.read(int(seconds * env_config.sample_rate if seconds else None))

        raw = normalize(raw)
        path = env_config.appdata_dir / "dump.flac"
        sf.write(path, raw, env_config.sample_rate, format="FLAC")
        return ResponseModel(
            success=True,
            message="Saved audio buffer",
            data=path.absolute(),
        )

    rdb = get_redis()
    ps = rdb.pubsub()
    ps.subscribe("dump")
    for evt in ps.listen():
        if evt["type"] != "message":
            continue

        try:
            resp = dump_audio(float(evt["data"]) if evt["data"] else None)
            rdb.publish("dump_response", resp.model_dump_json())
        except Exception as e:
            logger.error(e)
            rdb.publish(
                "dump_response",
                ResponseModel(
                    success=False,
                    status="internal_error",
                    message=str(e)
                ).model_dump_json()
            )


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    audio_buffer = CircularBuffer((buffer_size, env_config.channels), dtype=np.float32)

    timestamp_np = np.ndarray((1,), dtype=np.float64)
    timestamp_np[0] = 0

    # Start audio capture process
    capture_process = threading.Thread(
        target=audio_capture,
        args=(audio_buffer, timestamp_np),
        daemon=True
    )
    capture_process.start()

    music_id_thread = threading.Thread(
        target=run_music_id_loop,
        args=(audio_buffer, timestamp_np, loop),
        daemon=True
    )
    music_id_thread.start()

    live_stats_process = threading.Thread(
        target=run_live_stats,
        args=(audio_buffer, timestamp_np),
        daemon=True
    )
    live_stats_process.start()

    save_process = threading.Thread(
        target=run_save_music,
        args=(audio_buffer, timestamp_np),
        daemon=True
    )
    save_process.start()

    dump_process = threading.Thread(
        target=run_dump_audio,
        args=(audio_buffer,),
        daemon=True
    )
    dump_process.start()

    loop.run_forever()
    capture_process.join()
    music_id_thread.join()
    live_stats_process.join()
    save_process.join()
    dump_process.join()
