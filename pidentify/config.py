import os
from pathlib import Path
from pydantic import BaseModel


# Environment variables config
# this is the stuff that should only be editable by the docker compose

class _EnvConfig(BaseModel):
    class Config:
        alias_generator = str.upper
        populate_by_name = True

    user_agent: str = "Pidentify <todo: add github url after publish>"

    redis_host: str = "localhost"
    redis_port: int = 6379
    db_url: str = "sqlite+libsql:////appdata/database.db"

    device: str | None = ""
    device_offset: float = 0  # how many seconds behind is the displayed timestamp from the actual timestamp
    sample_rate: int = 44100
    channels: int = 2
    blocksize: int = 8192
    latency: float = 1

    live_stats_frequency: float = 0.2

    duration: int = 15
    silence_threshold: float = 0.0004

    buffer_length_seconds: int = 12 * 60
    temp_save_offset: int = 30

    appdata_dir: Path = Path("/appdata")
    music_library_dir: Path = Path("/music")

    last_fm_key: str = ""

    spotify_dc: str = ""
    spotify_key: str = ""
    spotify_t: str = ""
    spotify_history_playlist: str = ""

    music_id_plugin: str = ""


class ClientConfig(BaseModel):
    can_skip: bool
    can_save: bool
    can_edit_history: bool
    buffer_length_seconds: int
    temp_save_offset: int


env_config = _EnvConfig.model_validate(os.environ)
