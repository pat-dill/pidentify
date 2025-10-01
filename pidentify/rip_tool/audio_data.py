import statistics
from pathlib import Path

import soundfile

from pidentify.utils import chunk_list


def get_audio_data_chart(file_path: Path, parts: int):
    with file_path.open("rb") as file:
        sf = soundfile.SoundFile(file)
        duration = sf.frames / sf.samplerate
        raw_audio = sf.read(sf.frames, always_2d=True)

    return duration, [
        statistics.mean(abs(v[0]) ** 2 for v in chunk)
        for chunk in chunk_list(raw_audio, parts)
    ]