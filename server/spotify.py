from datetime import datetime, timezone

import httpx

from server.cache import async_cached
from server.config import env_config
from server.models import BaseModel, Lyrics, SpotifyTrack, SpotifyAlbum
from server.redis_client import get_redis
from server.utils.snake_to_camel import snake_to_camel
from server.utils import utcnow

user_agent = "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36"


class SpotifyAccess(BaseModel):
    class Config:
        alias_generator = snake_to_camel

    client_id: str
    access_token: str
    access_token_expiration_timestamp_ms: int
    is_anonymous: bool

    @property
    def expires_at(self):
        return datetime.fromtimestamp(self.access_token_expiration_timestamp_ms / 1000, timezone.utc)


async def get_spotify_token() -> SpotifyAccess | None:
    rdb = get_redis()
    if raw_token := rdb.get("spotify_access_token"):
        return SpotifyAccess.model_validate_json(raw_token)

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://open.spotify.com/get_access_token?reason=transport&productType=web_player",
            cookies=dict(
                sp_dc=env_config.spotify_dc,
                sp_key=env_config.spotify_key,
                sp_t=env_config.spotify_t,
            )
        )

        try:
            token = SpotifyAccess.model_validate_json(resp.text)
        except Exception:
            return None

    rdb.set("spotify_access_token", token.model_dump_json(), px=token.expires_at - utcnow())
    return token


@async_cached(7 * 24 * 60 * 60, encoder=SpotifyTrack.model_dump_json, decoder=SpotifyTrack.model_validate_json, cache_none=True)
async def get_spotify_track(query: str) -> SpotifyTrack | None:
    access = await get_spotify_token()
    if access is None:
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.spotify.com/v1/search",
            params=dict(
                query=query,
                type="track",
                limit=10,
                access_token=access.access_token
            ),
        )
        tracks = resp.json()["tracks"]["items"]
        if not tracks:
            return None

        return SpotifyTrack(**tracks[0])


@async_cached(7 * 24 * 60 * 60, encoder=Lyrics.model_dump_json, decoder=Lyrics.model_validate_json, cache_none=True)
async def get_spotify_lyrics(track_id: str) -> Lyrics | None:
    access = await get_spotify_token()
    if access is None:
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://spclient.wg.spotify.com/color-lyrics/v2/track/{track_id}?format=json&market=from_token",
            headers={
                "User-Agent": user_agent,
                "App-platform": "WebPlayer",
                "Authorization": f"Bearer {access.access_token}",
            }
        )

        if (not resp.text) or resp.text == "too many requests":
            return None

        return Lyrics(**resp.json()["lyrics"])


@async_cached(7 * 24 * 60 * 60, encoder=SpotifyAlbum.model_dump_json, decoder=SpotifyAlbum.model_validate_json)
async def get_spotify_album(album_id: str) -> SpotifyAlbum | None:
    async with httpx.AsyncClient() as client:
        access = await get_spotify_token()
        if access is None:
            return None

        resp = await client.get(
            f"https://api.spotify.com/v1/albums/{album_id}",
            headers={
                "User-Agent": user_agent,
                "App-platform": "WebPlayer",
                "Authorization": f"Bearer {access.access_token}",
            }
        )

        if (not resp.text) or resp.text == "too many requests":
            return None

        return SpotifyAlbum(**resp.json())


async def add_to_spotify_playlist(playlist_id: str, *track_uris: str, position: int = None):
    if len(track_uris) > 100:
        raise ValueError("max 100 tracks")

    async with httpx.AsyncClient() as client:
        access = await get_spotify_token()
        if access is None:
            return None

        resp = await client.post(
            f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks",
            json=dict(
                uris=track_uris,
                **({"position": position} if position is not None else {}),
            ),
            headers={
                "User-Agent": user_agent,
                "App-platform": "WebPlayer",
                "Authorization": f"Bearer {access.access_token}",
            }
        )

        if not resp.is_success:
            raise ValueError(resp.text)

        return resp.json()
