import asyncio
from concurrent.futures.process import ProcessPoolExecutor

from fastapi import APIRouter
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


# == API routes ==

api = APIRouter(prefix="/api/settings")


@api.get("/")
@api.get("")
def get_settings(request: Request) -> FileConfig:
    if not is_admin(request):
        raise ErrorResponse(403, "not_authorized")

    return FileConfig.load()


@api.get("/devices")
def get_audio_devices(request: Request):
    if not is_admin(request):
        raise ErrorResponse(403, "not_authorized")

    return sd.query_devices()