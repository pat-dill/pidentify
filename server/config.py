import json
import os
from pathlib import Path

from pydantic import BaseModel
from pydantic_yaml import parse_yaml_raw_as, to_yaml_str


class EnvConfig(BaseModel):
    class Config:
        alias_generator = str.upper
        populate_by_name = True

    user_agent: str = "Pidentify <todo: add github url after publish>"

    redis_host: str = "localhost"
    redis_port: int = 6379
    db_url: str = "sqlite:////appdata/database.db"

    live_stats_frequency: float = 0.2

    duration: int = 15
    silence_threshold: float = 0.0004

    appdata_dir: Path = Path("/etc/pidentify/config")
    music_library_dir: Path = Path("/etc/pidentify/music")
    recorder_service_path: Path = Path("/run/service/recorder")


env_config = EnvConfig.model_validate(os.environ)
config_fp = env_config.appdata_dir / "config.yaml"


class FileConfig(BaseModel):
    class Config:
        populate_by_name = True
    
    device: str | None = ""
    device_offset: float = 0  # how many seconds behind is the displayed timestamp from the actual timestamp
    sample_rate: int = 44100
    channels: int = 2
    blocksize: int = 8192
    latency: float = 1

    buffer_length_seconds: int = 12 * 60
    temp_save_offset: int = 30
    
    last_fm_key: str = ""
    music_id_plugin: str = ""
    
    def save(self):
        config_fp.write_text(to_yaml_str(self))

    @classmethod
    def load(cls):
        if not config_fp.is_file():
            config = cls()
            config.save()  # create config file if it does not exist
            return config
        
        return parse_yaml_raw_as(cls, config_fp.read_text())
        

file_config = FileConfig.load()


class ClientConfig(BaseModel):
    can_skip: bool
    can_save: bool
    can_edit_history: bool
    buffer_length_seconds: int
    temp_save_offset: int


