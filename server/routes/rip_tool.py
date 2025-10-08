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


# Request/Response models

class RipMetaResponse(BaseModel):
    history_entry: HistoryEntry | None


class AudioDataRequest(BaseModel):
    chart_parts: int


class AudioDataResponse(BaseModel):
    duration: float
    chart: list[float]


class SaveToLibrary(BaseModel):
    track_name: str
    track_no: int = 1
    album_name: str
    artist_name: str
    start_offset: float
    duration_seconds: float


# API

api = APIRouter(prefix="/api/rip")


pool = ProcessPoolExecutor()


def check_auth(request):
    if not is_local_client(request):
        raise ErrorResponse(403, "not_authorized")


@api.post("/{entry_id}/start")
def start_rip(request: Request, entry_id: str) -> ResponseModel:
    check_auth(request)

    entry = get_history_entry(entry_id)

    if entry is None:
        return ResponseModel(success=False, status="not_found")

    rdb = get_redis()
    rdb.publish("save", str(entry.entry_id))

    ps = rdb.pubsub()
    ps.subscribe(str(entry.entry_id))
    ps.get_message(timeout=1)
    resp = ps.get_message(timeout=10)

    if resp is None:
        raise ErrorResponse(code=500, status="timed_out")
    else:
        resp = ResponseModel.model_validate_json(resp["data"])
        return resp


@api.get("/{entry_id}")
def get_entry(entry_id: str) -> RipMetaResponse:
    entry = get_history_entry(entry_id)
    file_path = env_config.appdata_dir / "temp" / f"{entry_id}.flac"
    if not file_path.exists():
        raise ErrorResponse(code=404, status="rip_not_found", message="Audio buffer not found")

    return RipMetaResponse(history_entry=entry)


@api.get("/{entry_id}/audio.flac", response_model=None)
def get_audio_file(entry_id: str, request: Request) -> ResponseModel | FileResponse:
    check_auth(request)

    file_path = env_config.appdata_dir / "temp" / f"{entry_id}.flac"

    if not file_path.is_file():
        raise ErrorResponse(code=404, status="rip_not_found", message="Audio buffer not found")
    else:
        return FileResponse(
            file_path,
            filename=f"{entry_id}.flac"
        )


@api.get("/{entry_id}/audio-data")
async def get_audio_data(entry_id: str, request: Request) -> AudioDataResponse:
    req = AudioDataRequest.model_validate(request.query_params)
    file_path = env_config.appdata_dir / "temp" / f"{entry_id}.flac"
    if not file_path.is_file():
        raise ErrorResponse(code=404, status="rip_not_found", message="Audio buffer not found")

    loop = asyncio.get_event_loop()
    duration, vol_chart = await loop.run_in_executor(pool, get_audio_data_chart, file_path, req.chart_parts)

    return AudioDataResponse(duration=duration, chart=vol_chart)


@api.post("/{buffer_id}/save")
def save_to_library(buffer_id: str, request: Request) -> ResponseModel:
    check_auth(request)

    file_path = env_config.appdata_dir / "temp" / f"{buffer_id}.flac"

    if not file_path.is_file():
        raise ErrorResponse(code=404, status="rip_not_found", message="Audio buffer not found")

    # TODO
    pass
