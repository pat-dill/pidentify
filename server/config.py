import json
import os
from pathlib import Path

from pydantic import BaseModel
import secrets
import yaml


class EnvConfig(BaseModel):
    class Config:
        alias_generator = str.upper
        populate_by_name = True

    user_agent: str = "Pidentify <todo: add github url after publish>"

    redis_host: str = "localhost"
    redis_port: int = 6379
    db_url: str = "sqlite:////etc/pidentify/config/database.db"

    http_websocket_url: str = ""
    https_websocket_url: str = ""

    live_stats_frequency: float = 0.2

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
    sample_rate: int | None = None
    channels: int | None = None
    blocksize: int = 8192
    latency: float = 1

    duration: int = 15
    silence_threshold: float = 0.0004

    buffer_length_seconds: int = 12 * 60
    temp_save_offset: int = 30

    last_fm_key: str = ""
    music_id_plugin: str = ""

    admin_username: str = "admin"
    admin_password_hash: str | None = None

    jwt_secret_key: str = secrets.token_urlsafe(32)

    initial_setup_complete: bool = False
    
    def save(self):
        yaml_str = yaml.dump(self.model_dump(exclude_defaults=True, include=["jwt_secret_key"]))
        config_fp.write_text(yaml_str)

    @classmethod
    def load(cls):
        if not config_fp.is_file():
            # create initial config file
            config = cls()
            config.save()
            return config
        
        config_obj = yaml.safe_load(config_fp.read_text())
        return cls.model_validate(config_obj)
        

file_config = FileConfig.load()


class ClientConfig(BaseModel):
    can_skip: bool
    can_save: bool
    can_edit_history: bool
    buffer_length_seconds: int
    temp_save_offset: int
    initial_setup_complete: bool
    is_admin: bool
