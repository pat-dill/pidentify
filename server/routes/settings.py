import asyncio
from concurrent.futures.process import ProcessPoolExecutor

from fastapi import APIRouter
from starlette.requests import Request
from starlette.responses import FileResponse

from server.config import env_config
from server.db import get_history_entry
from server.exceptions import ErrorResponse
from server.models import HistoryEntry, ResponseModel, BaseModel
from server.redis_client import get_redis
from server.rip_tool.audio_data import get_audio_data_chart
from server.utils import is_local_client


# == Request/Response models ==


# == API routes ==

api = APIRouter(prefix="/api/settings")


