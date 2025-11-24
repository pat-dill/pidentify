from io import BytesIO

from server.models import BaseModel, MusicIdResult


class TrackIdPlugin:
    is_async: bool
    format: str = "OGG"
    subtype: str | None = "VORBIS"
    requirements: list[str] = []

    class PluginOptions(BaseModel):
        pass

    def __init__(self, options: PluginOptions = None):
        self.options = options or TrackIdPlugin.PluginOptions()

    def identify_track(self, audio: BytesIO) -> MusicIdResult:
        raise NotImplementedError

    async def identify_track_async(self, audio: BytesIO) -> MusicIdResult:
        raise NotImplementedError
