import asyncio
import importlib
import inspect
from io import BytesIO
from pathlib import Path

import numpy as np
import soundfile as sf

from server.config import env_config, file_config
from server.models import MusicIdResult
from server.music_id.base import TrackIdPlugin


plugins_dir = Path(__file__).parent / "plugins"
plugins_dir.mkdir(parents=True, exist_ok=True)

plugins_init = plugins_dir / "__init__.py"
if not plugins_init.is_file():
    plugins_init.write_text("\n")


def load_plugin(plugin_name: str) -> TrackIdPlugin:
    plugin_module = importlib.import_module("." + plugin_name, package="server.music_id.plugins")
    for name, item in inspect.getmembers(plugin_module):
        if issubclass(item, TrackIdPlugin):
            return item()

    raise ValueError(f"Plugin {plugin_name} not found")


async def recognize_raw(raw, sample_rate, downsample_to=44100):
    raw = np.array(raw, np.float32)

    rms = float(np.sqrt(np.mean(raw ** 2)))
    if rms < file_config.silence_threshold:
        return MusicIdResult(
            success=False,
            message=f"No sound detected. RMS: {rms}",
        )
    else:
        frame_skip = sample_rate // downsample_to
        if frame_skip >= 2:
            raw = raw[::frame_skip]

        raw_norm = 2 * (raw - raw.min()) / (raw.max() - raw.min()) - 1  # normalize

        plugin = load_plugin(file_config.music_id_plugin)

        audio_buffer = BytesIO()
        sf.write(audio_buffer, raw_norm, int(sample_rate / frame_skip), format=plugin.format, subtype=plugin.subtype)
        audio_buffer.seek(0)

        if plugin.is_async:
            return await plugin.identify_track_async(audio_buffer)
        else:
            return await asyncio.to_thread(plugin.identify_track, audio_buffer)
