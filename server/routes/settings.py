import asyncio
from concurrent.futures.process import ProcessPoolExecutor
from pathlib import Path
import argon2
from fastapi import APIRouter
from pydantic import computed_field
from pydantic_core.core_schema import NoneSchema
from sqlalchemy_utils.types.password import passlib
from starlette.requests import Request


from server.auth import check_password, is_admin
from server.config import FileConfig, env_config
from server.db import get_history_entry
from server.exceptions import ErrorResponse
from server.models import HistoryEntry, ResponseModel, BaseModel
from server.rip_tool.audio_data import get_audio_data_chart
from server.utils import is_local_client

import sounddevice as sd


# == Request/Response models ==


class UpdateSettingsRequest(BaseModel):
    device: str | None = None
    device_offset: float | None = None
    sample_rate: int | None = None
    channels: int | None = None
    blocksize: int | None = None
    latency: float | None = None

    duration: int | None = None
    silence_threshold: float | None = None

    buffer_length_seconds: int | None = None
    temp_save_offset: int | None = None

    last_fm_key: str | None = None
    music_id_plugin: str | None = None

    admin_username: str | None = None
    old_password: str | None = None
    new_password: str | None = None


class SettingsResponse(FileConfig):
    @computed_field
    def has_password(self) -> bool:
        return self.admin_password_hash is not None


# == API routes ==

api = APIRouter(prefix="/api/settings")


@api.get("/")
@api.get("")
def get_settings(request: Request) -> SettingsResponse:
    if not is_admin(request):
        raise ErrorResponse(403, "not_authorized")

    return SettingsResponse.load()


@api.patch("/")
@api.patch("")
def update_settings(request: Request, data: UpdateSettingsRequest) -> FileConfig:
    if not is_admin(request):
        raise ErrorResponse(403, "not_authorized")
    
    config = FileConfig.load()
    config_updates = data.model_dump(exclude_unset=True)

    for key, value in config_updates.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    if data.new_password:
        if config.admin_password_hash and not check_password(data.old_password, config.admin_password_hash):
            raise ErrorResponse(403, "invalid_credentials")
        
        ph = argon2.PasswordHasher()
        config.admin_password_hash = ph.hash(data.new_password)

    config.save()

    return config


@api.get("/devices")
def get_audio_devices(request: Request):
    if not is_admin(request):
        raise ErrorResponse(403, "not_authorized")

    return sd.query_devices()


@api.get("/music-id-plugins")
def get_music_id_plugins(request: Request):
    if not is_admin(request):
        raise ErrorResponse(403, "not_authorized")

    plugins_dir = Path(__file__).parent.parent / "music_id" / "plugins"
    plugins = [plugin.stem for plugin in plugins_dir.glob("*")]
    return [plugin for plugin in plugins if not plugin.startswith("__")]    
