from fastapi import APIRouter
from starlette.requests import Request

from pidentify import db
from pidentify.exceptions import ErrorResponse
from pidentify.models import PaginateQuery, PaginatedResponse, ResponseModel, BaseModel
from pidentify.utils import is_local_client


# Request models


class UpdateHistoryRequest(BaseModel):
    duration_seconds: float | None = None
    track_name: str | None = None
    artist_name: str | None = None
    album_name: str | None = None


# API Routes

api = APIRouter(prefix="/api/history")


def check_auth(request):
    if not is_local_client(request):
        raise ErrorResponse(403, "not_authorized")


@api.get("")
@api.get("/")
def get_history(params: PaginateQuery) -> PaginatedResponse:
    return db.get_history_entries(
        page=params.page,
        page_size=params.page_size
    ).response()


@api.delete("/{entry_id}")
def delete_history_entry(entry_id: str, request: Request) -> ResponseModel:
    check_auth(request)

    db.delete_history_entries(entry_id=entry_id)
    return ResponseModel(success=True)


@api.patch("/{entry_id}")
def update_history_entry(entry_id: str, update_data: UpdateHistoryRequest, request: Request) -> ResponseModel:
    check_auth(request)

    entry = db.get_history_entry(entry_id=entry_id)
    db.update_history_entries(dict(track_id=entry.track_id), **update_data.model_dump(exclude_unset=True))
    return ResponseModel(success=True)
