from io import BytesIO

from server.models import MusicIdResult, BaseModel, MusicIdTrack
from server.music_id.base import TrackIdPlugin


class Match(BaseModel):
    offset: float
    timeskew: float
    frequencyskew: float


class ShazamTrack(BaseModel):
    key: int
    title: str
    subtitle: str
    images: dict[str, str]
    album: str | None = None
    label: str | None = None
    released: str | None = None


class ShazamPlugin(TrackIdPlugin):
    is_async = True
    requirements = [
        "shazamio==0.8.1"
    ]

    async def identify_track_async(self, audio: BytesIO) -> MusicIdResult:
        from shazamio import Shazam

        raw_result = await Shazam().recognize(audio.getvalue())
        matches = raw_result.get("matches", [])
        if not matches:
            return MusicIdResult(
                success=False,
                message="No match found",
            )

        match = Match(**matches[0])
        shazam_track = ShazamTrack(
            **raw_result["track"],
        )

        for section in raw_result["track"]["sections"]:
            if section["type"] == "SONG":
                for meta in section["metadata"]:
                    title, text = meta["title"], meta["text"]
                    if title == "Album":
                        shazam_track.album = text
                    elif title == "Label":
                        shazam_track.label = text
                    elif title == "Released":
                        shazam_track.released = text

        return MusicIdResult(
            success=True,
            track=MusicIdTrack(
                track_id=str(shazam_track.key),
                offset=match.offset,
                track_name=shazam_track.title.split(" (feat.")[0],
                album_name=shazam_track.album,
                artist_name=shazam_track.subtitle,
                label=shazam_track.label,
                released=shazam_track.released,
                track_image=shazam_track.images.get("coverarthq"),
                artist_image=shazam_track.images.get("background"),
            )
        )
