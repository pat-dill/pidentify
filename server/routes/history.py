from pydantic import ConfigDict
from server.models import HistoryEntry


from datetime import datetime
from uuid import UUID

from fastapi import APIRouter
from starlette.requests import Request

from server import db, sql_schemas
from server.exceptions import ErrorResponse
from server.models import HistoryEntry, PaginateQuery, PaginatedResponse, ResponseModel, BaseModel
from server.auth import is_admin
from server.db import UniqueAlbum, UniqueArtist
from server.utils import utcnow, snake_to_camel


# Request models

class UpdateHistoryRequest(BaseModel):
    duration_seconds: float | None = None
    track_name: str | None = None
    artist_name: str | None = None
    album_name: str | None = None
    track_image: str | None = None
    artist_image: str | None = None


class BatchUpdateHistoryRequest(BaseModel):
    entry_ids: list[str]
    data: UpdateHistoryRequest


class BatchDeleteEntryRequest(BaseModel):
    entry_ids: list[str]


class AddManualEntryRequest(BaseModel):    
    started_at: datetime
    duration_seconds: float
    track_name: str
    album_name: str
    artist_name: str
    track_no: int
    track_image: str | None = None
    artist_image: str | None = None
    


# API Routes

api = APIRouter(prefix="/api/history")


def check_auth(request):
    if not is_admin(request):
        raise ErrorResponse(403, "not_authorized")


@api.get("")
@api.get("/")
def get_history(params: PaginateQuery) -> PaginatedResponse:
    return db.get_history_entries(
        page=params.page,
        page_size=params.page_size
    ).response()


@api.delete("/batch")
def batch_delete_entries(delete_data: BatchDeleteEntryRequest, request: Request) -> ResponseModel:
    check_auth(request)

    db.delete_history_entries(sql_schemas.HistoryEntry.entry_id.in_([UUID(entry_id) for entry_id in delete_data.entry_ids]))
    return ResponseModel()


@api.patch("/batch")
def batch_update_track(update_data: BatchUpdateHistoryRequest, request: Request) -> ResponseModel:
    check_auth(request)

    entries = db.multi_get_history_entry([UUID(entry_id) for entry_id in update_data.entry_ids])
    db.update_db_track(
        *[entry.track_guid for entry in entries],
        **update_data.data.model_dump(exclude_unset=True)
    )

    return ResponseModel(success=True)


@api.delete("/{entry_id}")
def delete_history_entry(entry_id: str, request: Request) -> ResponseModel:
    check_auth(request)

    db.delete_history_entries(entry_id=UUID(entry_id))
    return ResponseModel(success=True)


@api.patch("/{entry_id}")
def update_track(entry_id: str, update_data: UpdateHistoryRequest, request: Request) -> ResponseModel:
    check_auth(request)

    entry = db.get_history_entry(entry_id=entry_id)
    db.update_db_track(entry.track_guid, **update_data.model_dump(exclude_unset=True))
    return ResponseModel()


@api.post("/add-manual-entry")
def add_manual_entry(entry_data: AddManualEntryRequest, request: Request) -> ResponseModel[HistoryEntry]:
    check_auth(request)

    db_track = db.add_or_update_db_track_by_name(
        track_name=entry_data.track_name,
        artist_name=entry_data.artist_name,
        album_name=entry_data.album_name,
        track_image=entry_data.track_image,
        artist_image=entry_data.artist_image,
        track_no=entry_data.track_no,
        duration_seconds=entry_data.duration_seconds,
    )
    db_entry = db.save_history_entry(
        track_guid=db_track.track_guid,
        detected_at=entry_data.started_at,
        started_at=entry_data.started_at,
        is_manual=True,
    )

    return ResponseModel[HistoryEntry](success=True, data=HistoryEntry.model_validate(db_entry, from_attributes=True))

@api.get("/albums")
def get_albums_list() -> ResponseModel[list[UniqueAlbum]]:
    albums = db.get_unique_albums()

    return ResponseModel[list[UniqueAlbum]](data=albums)


@api.get("/artists")
def get_artists_list() -> ResponseModel[list[UniqueArtist]]:
    artists = db.get_unique_artists()

    return ResponseModel[list[UniqueArtist]](data=artists)
