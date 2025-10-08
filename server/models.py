from datetime import datetime
from typing import Optional, TypeVar, Generic, Annotated
from uuid import UUID

from fastapi import Query
from pydantic import BaseModel as _BaseModel, Field
from starlette.responses import Response

from server.utils.snake_to_camel import snake_to_camel


class BaseModel(_BaseModel):
    class Config:
        populate_by_name = True

    def model_dump_json(self, *args, **kwargs):
        return _BaseModel.model_dump_json(self, *args, by_alias=True, **kwargs)


class Provider(BaseModel):
    caption: str
    type: str
    images: dict[str, str]
    actions: list[dict[str, str]]


class LastFMTrack(BaseModel):
    name: str
    url: str
    duration: int = 0
    duration_seconds: float = 0.0
    artist: dict = Field(default_factory=dict)
    wiki: Optional[dict[str, str]] = None
    top_tags: dict = Field(alias="toptags", default_factory=lambda: dict(tag=[]))


class LastFMArtist(BaseModel):
    name: str
    mbid: str | None = None
    url: str
    image: list[dict] = Field(default_factory=dict)
    bio: dict = Field(default_factory=dict)


class SpotifyTrack(BaseModel):
    id: str
    name: str
    disc_number: Optional[int] = None
    track_number: Optional[int] = None
    duration_ms: int = 0
    external_urls: dict | None = Field(default_factory=dict)
    external_ids: dict[str, str] = Field(default_factory=dict)
    album: dict = Field(default_factory=dict)


class SpotifyTracks(BaseModel):
    items: list[SpotifyTrack]


class SpotifyAlbum(BaseModel):
    id: str
    type_: str = Field(alias="type")
    total_tracks: int
    external_urls: dict = Field(default_factory=dict)
    external_ids: dict[str, str] = Field(default_factory=dict)
    images: list[dict]
    name: str
    tracks: SpotifyTracks
    release_date: str = ""
    label: str = ""


class LyricLine(BaseModel):
    class Config:
        alias_generator = snake_to_camel

    start_time_ms: int
    words: str


class Lyrics(BaseModel):
    class Config:
        alias_generator = snake_to_camel

    synced: bool
    lines: list[LyricLine]


class MusicIdTrack(BaseModel):
    offset: float
    track_id: str
    track_name: str
    artist_name: str | None = None
    album_name: str | None = None
    label: str | None = None
    released: str | None = None
    track_image: str | None = None
    artist_image: str | None = None
    duration_seconds: float | None = None


class MusicIdResult(BaseModel):
    success: bool
    message: str = ""
    track: MusicIdTrack | None = None


class IdentifyResult(MusicIdResult):
    recorded_at: datetime
    started_at: datetime | None = None
    last_fm_track: LastFMTrack | None = None
    last_fm_artist: LastFMArtist | None = None
    rms: float | None = None
    duration_seconds: float | None = None


class StatusResponse(IdentifyResult):
    recorded_at: Optional[datetime] = None
    scan_ends: Optional[datetime] = None
    next_scan: Optional[datetime] = None
    lyrics: Optional[Lyrics] = None
    can_skip: bool = False


class DbTrack(BaseModel):
    track_guid: UUID
    track_name: str
    artist_name: str | None = None
    album_name: str | None = None
    label: str | None = None
    released: str | None = None
    track_image: str | None = None
    artist_image: str | None = None
    duration_seconds: float | None = None
    last_fm: dict | None = None


class TrackId(BaseModel):
    track_guid: UUID
    track_id: str
    source: str


class HistoryEntry(BaseModel):
    entry_id: UUID
    track_guid: UUID
    detected_at: datetime
    started_at: datetime | None = None

    saved_temp_buffer: bool

    track: DbTrack | None = None


# Request models


class PaginateArgs(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=10, le=100)


PaginateQuery = Annotated[PaginateArgs, Query()]


# Response Models

T = TypeVar('T')


class ResponseModel(BaseModel, Generic[T]):
    success: bool = True
    status: str = "ok"
    message: str = ""
    data: T | None = None

    def response(self, **kwargs):
        return Response(
            self.model_dump_json(**kwargs),
            headers={"Content-Type": "application/json"}
        )


class PaginatedResponse(ResponseModel, Generic[T]):
    data: list[T]
    total_count: int
    page: int
    next_page: Optional[int]
