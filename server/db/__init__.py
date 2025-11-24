from datetime import datetime
from uuid import UUID

from sqlalchemy import distinct, select, tuple_, update, func as sqlfunc, insert, and_, or_, delete

from server import models
from server.db.sqlalchemy_context_client import db_client
from server.db.utils import paginate
from server.models import BaseModel, PaginatedResponse
from server.sql_schemas import HistoryEntry, Track, TrackId
from server.utils import get_keywords, handle_filters_arg, db_model_dict


# == Models ==


class UniqueAlbum(BaseModel):
    artist: str
    album: str
    artist_image_url: str | None = None
    album_image_url: str | None = None


# == Methods ==


def get_history_entries(
        *filters,
        page=1, page_size=100,
        order_by="detected_at", mode="desc",
        search: str = None,
) -> PaginatedResponse:
    keywords = []
    if search:
        keywords = [
            f"%{keyword}%"
            for keyword in get_keywords(search)
        ]

    with db_client.session() as session:
        query = (
            select(HistoryEntry, Track)
            .select_from(HistoryEntry)
            .join(Track, Track.track_guid == HistoryEntry.track_guid)
            .where(
                *handle_filters_arg(HistoryEntry, filters),
                and_(
                    *[or_(
                        sqlfunc.lower(Track.track_name).like(keyword),
                        sqlfunc.lower(Track.artist_name or "").like(keyword),
                        sqlfunc.lower(Track.album_name or "").like(keyword),
                    ) for keyword in keywords],
                ) if search else True,
            )
            .order_by(getattr(getattr(HistoryEntry, order_by), mode)())
        )

        def conv(row):
            db_entry, db_track = row
            entry = models.HistoryEntry.model_validate(db_entry, from_attributes=True)
            entry.track = models.DbTrack.model_validate(db_track, from_attributes=True)
            return entry

        return paginate(
            session,
            query,
            conv,
            page=page,
            page_size=page_size,
        )


def get_db_track_from_music_id(track_id: str, source: str = "", **kwargs) -> models.DbTrack:
    with db_client.session() as session:
        db_track = session.execute(
            select(Track, TrackId)
            .where(
                TrackId.track_id == track_id,
                Track.track_guid == TrackId.track_guid,
            )
        ).scalar_one_or_none()

        if db_track:
            return models.DbTrack.model_validate(db_track, from_attributes=True)

        db_track = session.execute(
            insert(Track)
            .values(**kwargs)
            .returning(Track)
        ).scalar_one()
        session.execute(
            insert(TrackId)
            .values(track_id=track_id, track_guid=db_track.track_guid, source=source)
        )
        session.commit()

        return models.DbTrack.model_validate(db_track, from_attributes=True)


def update_db_track(track_guid: UUID, **kwargs) -> models.DbTrack:
    with db_client.session() as session:
        db_track = session.execute(
            update(Track)
            .values(**kwargs)
            .where(Track.track_guid == track_guid)
            .returning(Track)
        ).scalar_one()
        session.commit()
        return models.DbTrack.model_validate(db_track, from_attributes=True)


def get_history_entry(entry_id) -> models.HistoryEntry | None:
    with db_client.session() as session:
        result = session.execute(
            select(HistoryEntry, Track)
            .where(
                HistoryEntry.entry_id == UUID(entry_id),
                Track.track_guid == HistoryEntry.track_guid,
            )
        ).one_or_none()

        if result is None:
            return None

        db_entry, db_track = result
        entry = models.HistoryEntry.model_validate(db_entry, from_attributes=True)
        entry.track = models.DbTrack.model_validate(db_track, from_attributes=True)
        return entry


def save_history_entry(*, track_guid, detected_at: datetime, started_at: datetime, **kwargs):
    with db_client.session() as session:
        last_track = session.execute(
            select(HistoryEntry)
            .order_by(HistoryEntry.detected_at.desc())
            .limit(1)
        ).scalar_one_or_none()

        if last_track and last_track.track_guid == track_guid:
            if (not last_track.started_at) or started_at < last_track.started_at:
                last_track = session.execute(
                    update(HistoryEntry)
                    .where(HistoryEntry.entry_id == last_track.entry_id)
                    .values(started_at=started_at)
                    .returning(HistoryEntry)
                ).scalar_one()
                session.commit()

            return models.HistoryEntry.model_validate(last_track, from_attributes=True)

        entry = session.execute(
            insert(HistoryEntry)
            .values(
                track_guid=track_guid,
                detected_at=detected_at,
                started_at=started_at,
                **kwargs
            )
            .returning(HistoryEntry)
        ).scalar_one()
        session.commit()
        return models.HistoryEntry.model_validate(entry, from_attributes=True)


def update_history_entries(
        *filters,
        **values,
) -> int:
    with db_client.session() as session:
        session.execute(
            update(HistoryEntry)
            .where(
                *handle_filters_arg(HistoryEntry, filters),
            )
            .values(**values)
        )
        updated_count = session.execute(
            select(sqlfunc.count(HistoryEntry.entry_id))
            .select_from(HistoryEntry)
            .where(
                *handle_filters_arg(HistoryEntry, filters),
            )
        ).scalar_one()

        session.commit()

        return updated_count


def delete_history_entries(*filter_args, **filter_kwargs):
    with db_client.session() as session:
        session.execute(
            delete(HistoryEntry)
            .where(
                *handle_filters_arg(HistoryEntry, [*filter_args, filter_kwargs]),
            )
        )
        session.commit()


def get_unique_albums():
    with db_client.session() as session:
        results = session.execute(
            select(Track.artist_name, Track.album_name, Track.artist_image, Track.track_image)
            .group_by(Track.artist_name, Track.album_name)
        ).all()

        return [
            UniqueAlbum(
                artist=result.artist_name,
                album=result.album_name,
                artist_image_url=result.artist_image, 
                album_image_url=result.track_image,
            )
             for result in results
             if result.album_name
            ]
