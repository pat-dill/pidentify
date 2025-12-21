import re
from difflib import SequenceMatcher

import httpx

from server.cache import cached, async_cached
from server.config import env_config, file_config
from server.logger import logger
from server.models import BaseModel, LastFMTrack, LastFMArtist
from server.utils import duration_to_seconds

duration_re = re.compile(r"((\d{1,2}:)+\d\d)")


class LastFMAlbum(BaseModel):
    pass


@async_cached(24 * 60 * 60, encoder=LastFMTrack.model_dump_json, decoder=LastFMTrack.model_validate_json, cache_none=True)
async def get_last_fm_track(title, artist) -> LastFMTrack | None:
    async with httpx.AsyncClient() as client:
        try:
            resp = (await client.post("https://ws.audioscrobbler.com/2.0", params={
                "method": "track.getInfo",
                "api_key": file_config.last_fm_key,
                "artist": artist,
                "track": title,
                "format": "json"
            })).json()

            if not resp.get("track"):
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
                "api_key": file_config.last_fm_key,
                "artist": name,
                "format": "json"
            })).json()

            if "artist" not in resp or not resp["artist"]:
                return None

            return LastFMArtist(**resp["artist"])
        except Exception as e:
            logger.info(e)
            return None


@async_cached(24 * 60 * 60, cache_none=True)
async def get_last_fm_album(artist: str, album: str) -> dict | None:
    """Get album info from LastFM, including track listing with positions."""
    async with httpx.AsyncClient() as client:
        try:
            resp = (await client.post("https://ws.audioscrobbler.com/2.0", params={
                "method": "album.getInfo",
                "api_key": file_config.last_fm_key,
                "artist": artist,
                "album": album,
                "format": "json"
            })).json()

            if "album" not in resp or not resp["album"]:
                return None

            return resp["album"]
        except Exception as e:
            logger.warning(e)
            return None


def extract_track_number_from_last_fm(track_data: dict, album_data: dict | None = None) -> int | None:
    """
    Extract track number from LastFM data.
    First tries track.album.@attr.position, then searches album.tracks.track for matching track.
    
    Args:
        track_data: LastFM track data (from track.getInfo)
        album_data: LastFM album data (from album.getInfo), optional
    
    Returns:
        Track number if found, None otherwise
    """
    # Try to get position from track's album info
    album = track_data.get("album", {})
    if album:
        attr = album.get("@attr", {})
        if attr and "position" in attr:
            try:
                return int(attr["position"])
            except (ValueError, TypeError):
                pass
    
    # If album data is provided, search for the track in the album's track list
    if album_data:
        tracks = album_data.get("tracks", {}).get("track", [])
        # Handle both single track dict and list of tracks
        if not isinstance(tracks, list):
            tracks = [tracks]
        
        track_name = track_data.get("name", "").lower()
        best_match = None
        best_ratio = 0.0
        similarity_threshold = 0.8  # Require at least 80% similarity
        
        for track in tracks:
            candidate_name = track.get("name", "").lower()
            if not candidate_name:
                continue
            
            # Calculate similarity ratio
            ratio = SequenceMatcher(None, track_name, candidate_name).ratio()
            
            # If exact match, return immediately
            if ratio == 1.0:
                attr = track.get("@attr", {})
                if attr and "rank" in attr:
                    try:
                        return int(attr["rank"])
                    except (ValueError, TypeError):
                        pass
            
            # Track the best match above threshold
            if ratio > best_ratio and ratio >= similarity_threshold:
                best_ratio = ratio
                best_match = track
        
        # Return the best match if found
        if best_match:
            attr = best_match.get("@attr", {})
            if attr and "rank" in attr:
                try:
                    return int(attr["rank"])
                except (ValueError, TypeError):
                    pass
    
    return None
