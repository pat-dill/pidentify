import asyncio
from concurrent.futures.process import ProcessPoolExecutor

from fastapi import APIRouter
from pydantic import Field
from starlette.requests import Request
from starlette.responses import FileResponse

from server.auth import is_admin
from server.config import env_config
from server.db import get_history_entry, update_history_entries
from server.exceptions import ErrorResponse
from server.models import HistoryEntry, ResponseModel, BaseModel
from server.redis_client import get_redis
from server.rip_tool.audio_data import get_audio_data_chart, trim_and_save_audio, get_image_extension_from_url
from server.utils import safe_filename


# Request/Response models

class RipMetaResponse(BaseModel):
    history_entry: HistoryEntry | None


class AudioDataRequest(BaseModel):
    chart_parts: int


class AudioDataResponse(BaseModel):
    duration: float
    chart: list[float]


class SaveToLibraryRequest(BaseModel):
    track_name: str
    track_no: int = 1
    album_name: str
    artist_name: str
    start_offset: float
    end_offset: float = Field(..., ge=0, description="Offset from end of file (negative or zero)")
    track_image: str | None = None
    artist_image: str | None = None


# API

api = APIRouter(prefix="/api/rip")


pool = ProcessPoolExecutor()


def check_auth(request):
    if not is_admin(request):
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
def save_to_library(buffer_id: str, save_data: SaveToLibraryRequest, request: Request) -> ResponseModel:
    check_auth(request)

    file_path = env_config.appdata_dir / "temp" / f"{buffer_id}.flac"

    if not file_path.is_file():
        raise ErrorResponse(code=404, status="rip_not_found", message="Audio buffer not found")

    # Determine which images to use and whether to overwrite
    # Client-provided images override defaults and should overwrite existing files
    # Default images from database should only be used if file doesn't exist
    
    # Get default images from history entry
    entry = get_history_entry(buffer_id)
    default_track_image = entry.track.track_image if entry and entry.track else None
    default_artist_image = entry.track.artist_image if entry and entry.track else None
    
    # Use client-provided images if provided, otherwise use defaults
    track_image = save_data.track_image if save_data.track_image else default_track_image
    artist_image = save_data.artist_image if save_data.artist_image else default_artist_image
    
    # Determine overwrite flags: True if client provided image, False if using default
    track_image_overwrite = save_data.track_image is not None
    artist_image_overwrite = save_data.artist_image is not None
    
    # For default images, check if file already exists (don't overwrite)
    if not track_image_overwrite and track_image:
        safe_artist = safe_filename(save_data.artist_name)
        safe_album = safe_filename(save_data.album_name)
        library_dir = env_config.music_library_dir / safe_artist / safe_album
        ext = get_image_extension_from_url(track_image)
        album_cover_path = (library_dir / "cover").with_suffix(ext)
        if album_cover_path.exists():
            track_image = None  # Skip downloading if already exists
    
    if not artist_image_overwrite and artist_image:
        safe_artist = safe_filename(save_data.artist_name)
        artist_dir = env_config.music_library_dir / safe_artist
        ext = get_image_extension_from_url(artist_image)
        artist_cover_path = (artist_dir / "cover").with_suffix(ext)
        if artist_cover_path.exists():
            artist_image = None  # Skip downloading if already exists

    try:
        saved_path = trim_and_save_audio(
            source_path=file_path,
            start_offset=save_data.start_offset,
            end_offset=save_data.end_offset,
            track_name=save_data.track_name,
            track_no=save_data.track_no,
            album_name=save_data.album_name,
            artist_name=save_data.artist_name,
            track_image=track_image,
            artist_image=artist_image,
            track_image_overwrite=track_image_overwrite,
            artist_image_overwrite=artist_image_overwrite,
        )
        
        # Update history entry to mark it as saved to library
        if entry:
            update_history_entries(
                dict(entry_id=entry.entry_id),
                saved_to_library=True
            )
        
        return ResponseModel(
            success=True,
            message="Audio saved to library",
            data=str(saved_path)
        )
    except Exception as e:
        raise e

        # raise ErrorResponse(
        #     code=500,
        #     status="save_failed",
        #     message=f"Failed to save audio: {str(e)}"
        # )
