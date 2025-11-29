from types import NoneType
import uuid
from datetime import datetime
from pathlib import Path

from sqlalchemy import (
    MetaData,
    Text,
    BigInteger,
    ForeignKey,
    LargeBinary,
    func as sqlfunc,
    JSON,
    ARRAY, Index,
)

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy_utc import UtcDateTime
from sqlalchemy_utils import force_instant_defaults

from server.utils import utcnow

DBMeta = MetaData()

force_instant_defaults()


# assert DBMeta.schema


class DBModel(DeclarativeBase):
    metadata = DBMeta
    type_annotation_map = {
        datetime: UtcDateTime,
        str: Text,
        int: BigInteger,
        bytes: LargeBinary,
        dict: JSON,
    }


class Track(DBModel):
    __tablename__ = "tracks"

    track_guid: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4,
                                                  server_default=sqlfunc.gen_random_uuid())

    track_name: Mapped[str] = mapped_column()
    artist_name: Mapped[str | None] = mapped_column()
    album_name: Mapped[str | None] = mapped_column()
    track_no: Mapped[int | None] = mapped_column()
    label: Mapped[str | None] = mapped_column()
    released: Mapped[str | None] = mapped_column()
    track_image: Mapped[str | None] = mapped_column()
    artist_image: Mapped[str | None] = mapped_column()
    duration_seconds: Mapped[float | None] = mapped_column()
    last_fm: Mapped[dict | None] = mapped_column(nullable=True)

    file_path: Mapped[str | None] = mapped_column()


class TrackId(DBModel):
    __tablename__ = "track_ids"

    track_guid: Mapped[uuid.UUID] = mapped_column(ForeignKey(Track.track_guid), primary_key=True)
    track_id: Mapped[str] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column()


class HistoryEntry(DBModel):
    __tablename__ = "history"

    entry_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4,
                                                server_default=sqlfunc.gen_random_uuid())
    track_guid: Mapped[str] = mapped_column(ForeignKey(Track.track_guid))

    detected_at: Mapped[datetime] = mapped_column(default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column()
    is_manual: Mapped[bool] = mapped_column(default=False, server_default="false")

    saved_temp_buffer: Mapped[bool] = mapped_column(default=False, server_default="false")
    saved_to_library: Mapped[bool] = mapped_column(default=False, server_default="false")
