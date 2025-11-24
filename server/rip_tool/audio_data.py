import statistics
from pathlib import Path
from urllib.parse import urlparse

import httpx
import numpy as np
import soundfile
from mutagen.flac import FLAC

from server.config import env_config
from server.logger import logger
from server.utils import chunk_list, safe_filename


def get_audio_data_chart(file_path: Path, parts: int):
    with file_path.open("rb") as file:
        sf = soundfile.SoundFile(file)
        duration = sf.frames / sf.samplerate
        raw_audio = sf.read(sf.frames, always_2d=True)

    return duration, [
        np.percentile(np.abs(chunk[:, 0]), 50) ** 2
        for chunk in chunk_list(raw_audio, parts)
    ]


def get_image_extension_from_url(url: str) -> str:
    """
    Extract file extension from image URL.
    
    Args:
        url: Image URL
    
    Returns:
        File extension (e.g., '.jpg', '.png') or '.jpg' as fallback
    """
    # Parse URL and get path
    parsed = urlparse(url)
    path = parsed.path
    
    # Extract extension from path (before any query parameters)
    if '.' in path:
        ext = Path(path).suffix.lower()
        # Valid image extensions
        valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'}
        if ext in valid_extensions:
            return ext
    
    # Fallback to .jpg if no valid extension found
    return '.jpg'


def download_and_save_image(image_url: str | None, base_output_path: Path, overwrite: bool = False) -> None:
    """
    Download an image from URL and save it.
    The file extension will match the URL's extension.
    
    Args:
        image_url: URL of the image to download
        base_output_path: Base path where to save the image (without extension)
        overwrite: If True, overwrite existing file. If False, skip if file exists.
    """
    if not image_url:
        return
    
    # Get extension from URL and construct full path
    ext = get_image_extension_from_url(image_url)
    output_path = base_output_path.with_suffix(ext)
    
    # Skip if file already exists and overwrite is False
    if not overwrite and output_path.exists():
        return
    
    try:
        with httpx.Client(timeout=30) as client:
            response = client.get(image_url, headers={"User-Agent": env_config.user_agent})
            response.raise_for_status()
            
            # Write image file
            output_path.write_bytes(response.content)
            logger.info(f"Downloaded cover image to {output_path}")
    except Exception as e:
        logger.warning(f"Failed to download image from {image_url}: {e}")


def trim_and_save_audio(
    source_path: Path,
    start_offset: float,
    end_offset: float,
    track_name: str,
    track_no: int,
    album_name: str,
    artist_name: str,
    track_image: str | None = None,
    artist_image: str | None = None,
    track_image_overwrite: bool = False,
    artist_image_overwrite: bool = False,
) -> Path:
    """
    Trim audio file and save to library with metadata tags.
    
    Args:
        source_path: Path to source audio file
        start_offset: Start offset in seconds from the beginning of the file
        end_offset: End offset in seconds from the end of the file
        track_name: Track name
        track_no: Track number
        album_name: Album name
        artist_name: Artist name
        track_image: URL of track/album cover image (optional)
        artist_image: URL of artist image (optional)
        track_image_overwrite: If True, overwrite existing track image
        artist_image_overwrite: If True, overwrite existing artist image
    
    Returns:
        Path to saved file
    """
    # Read source audio file
    with source_path.open("rb") as file:
        sf = soundfile.SoundFile(file)
        sample_rate = sf.samplerate
        total_frames = sf.frames
        total_duration = total_frames / sample_rate
        
        # Read entire audio file
        full_audio = sf.read(total_frames, always_2d=True)
    
    # Calculate frame range for trimming
    # start_offset is from the beginning of the file
    # end_offset is from the end of the file (negative or zero)
    start_frame = int(start_offset * sample_rate)
    end_frame = int((total_duration - end_offset) * sample_rate)
    
    # Ensure we don't exceed file bounds
    start_frame = max(0, min(start_frame, total_frames))
    end_frame = max(start_frame, min(end_frame, total_frames))
    
    # Trim audio data
    audio_data = full_audio[start_frame:end_frame]
    
    # Create directory structure: {music_library_dir}/{ArtistName}/{AlbumName}/
    safe_artist = safe_filename(artist_name)
    safe_album = safe_filename(album_name)
    safe_track = safe_filename(track_name)
    
    library_dir = env_config.music_library_dir / safe_artist / safe_album
    library_dir.mkdir(parents=True, exist_ok=True)
    
    # Create filename: {TrackNumber} - {TrackName}.flac
    filename = f"{track_no:02d} - {safe_track}.flac"
    output_path = library_dir / filename
    
    # Write trimmed audio file
    soundfile.write(output_path, audio_data, sample_rate, format="FLAC")
    
    # Add metadata tags
    audio_file = FLAC(output_path)
    audio_file["title"] = track_name
    audio_file["artist"] = artist_name
    audio_file["album"] = album_name
    audio_file["tracknumber"] = str(track_no)
    audio_file.save()
    
    # Download and save cover images
    # Album cover in album directory
    album_cover_base_path = library_dir / "cover"
    download_and_save_image(track_image, album_cover_base_path, overwrite=track_image_overwrite)
    
    # Artist image in artist directory
    artist_dir = env_config.music_library_dir / safe_artist
    artist_cover_base_path = artist_dir / "cover"
    download_and_save_image(artist_image, artist_cover_base_path, overwrite=artist_image_overwrite)
    
    return output_path