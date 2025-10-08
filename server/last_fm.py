import re

import httpx

from server.cache import cached, async_cached
from server.config import env_config
from server.logger import logger
from server.models import LastFMTrack, LastFMArtist
from server.utils import duration_to_seconds

duration_re = re.compile(r"((\d{1,2}:)+\d\d)")


@async_cached(60 * 60, encoder=LastFMTrack.model_dump_json, decoder=LastFMTrack.model_validate_json, cache_none=True)
async def get_last_fm_track(title, artist) -> LastFMTrack | None:
    async with httpx.AsyncClient() as client:
        try:
            resp = (await client.post("https://ws.audioscrobbler.com/2.0", params={
                "method": "track.getInfo",
                "api_key": env_config.last_fm_key,
                "artist": artist,
                "track": title,
                "format": "json"
            })).json()

            if "track" not in resp or not resp["track"]:
                return None

            track = LastFMTrack(**resp["track"])

            if track.duration:
                track.duration_seconds = track.duration / 1000
            else:
                # attempt to scrape duration from HTML (why isn't this always sent in the API response??)
                html_resp = await client.get(track.url, follow_redirects=True)
                match = duration_re.search(html_resp.text)

                if match:
                    track.duration_seconds = duration_to_seconds(match[0])
                    track.duration = track.duration_seconds * 1000

            return track
        except Exception as e:
            logger.warning(e)
            return None


@async_cached(24 * 60 * 60, encoder=LastFMArtist.model_dump_json, decoder=LastFMArtist.model_validate_json)
async def get_last_fm_artist(name: str) -> LastFMArtist | None:
    async with httpx.AsyncClient() as client:
        try:
            resp = (await client.post("https://ws.audioscrobbler.com/2.0", params={
                "method": "artist.getinfo",
                "api_key": env_config.last_fm_key,
                "artist": name,
                "format": "json"
            })).json()

            if "artist" not in resp or not resp["artist"]:
                return None

            return LastFMArtist(**resp["artist"])
        except Exception as e:
            logger.info(e)
            return None
