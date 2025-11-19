from io import BytesIO

from server.models import BaseModel, MusicIdResult


class Config(BaseModel):
    pass


class TrackIdPlugin:
    is_async: bool
    format: str = "OGG"
    subtype: str | None = "VORBIS"
    requirements: list[str] = []

    def __init__(self, config: Config = None):
        self.config = config or Config()

    def identify_track(self, audio: BytesIO) -> MusicIdResult:
        raise NotImplementedError

    async def identify_track_async(self, audio: BytesIO) -> MusicIdResult:
        raise NotImplementedError
