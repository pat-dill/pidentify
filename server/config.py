import json
import os
from pathlib import Path

from pydantic import BaseModel


# TODO: use a config file rather than env and provide web interface

class _EnvConfig(BaseModel):
    class Config:
        alias_generator = str.upper
        populate_by_name = True

    user_agent: str = "Pidentify <todo: add github url after publish>"

    redis_host: str = "localhost"
    redis_port: int = 6379
    db_url: str = "sqlite:////appdata/database.db"

    device: str | None = ""
    device_offset: float = 0  # how many seconds behind is the displayed timestamp from the actual timestamp
    sample_rate: int = 44100
    channels: int = 2
    blocksize: int = 8192
    latency: float = 1

    live_stats_frequency: float = 0.2

    duration: int = 15
    silence_threshold: float = 0.0004

    appdata_dir: Path = Path("/etc/pidentify/config")
    music_library_dir: Path = Path("/etc/pidentify/music")
    recorder_service_path: Path = Path("/run/service/recorder")


class FileConfig(BaseModel):
    class Config:
        populate_by_name = True

    buffer_length_seconds: int = 12 * 60
    temp_save_offset: int = 30
    
    last_fm_key: str = ""
    music_id_plugin: str = ""


env_config = _EnvConfig.model_validate(os.environ)


def load_file_config() -> FileConfig:
    config_path = env_config.appdata_dir / "config.json"
    if not config_path.is_file():
        return FileConfig()
    
    return FileConfig.model_validate_json(config_path.read_text())


file_config = load_file_config()


class ClientConfig(BaseModel):
    can_skip: bool
    can_save: bool
    can_edit_history: bool
    buffer_length_seconds: int
    temp_save_offset: int


