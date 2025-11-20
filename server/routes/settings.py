import asyncio
from concurrent.futures.process import ProcessPoolExecutor

from fastapi import APIRouter
from pydantic_core.core_schema import NoneSchema
from sqlalchemy_utils.types.password import passlib
from starlette.requests import Request


from server.auth import is_admin
from server.config import FileConfig, env_config
from server.db import get_history_entry
from server.exceptions import ErrorResponse
from server.models import HistoryEntry, ResponseModel, BaseModel
from server.redis_client import get_redis
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


# == API routes ==

api = APIRouter(prefix="/api/settings")


@api.get("/")
@api.get("")
def get_settings(request: Request) -> FileConfig:
    if not is_admin(request):
        raise ErrorResponse(403, "not_authorized")

    return FileConfig.load()


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

    config.save()

    return config


@api.get("/devices")
def get_audio_devices(request: Request):
    if not is_admin(request):
        raise ErrorResponse(403, "not_authorized")

    return sd.query_devices()