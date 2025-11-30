"use client";

import { toastPortal } from "@/components/Toast";
import clsx from "clsx";
import CurrentTrack from "@/features/NowPlaying/CurrentTrack";
import AboutTrack from "@/components/AboutTrack";
import { AlbumT, LastFMTrackT } from "@/schemas";
import AboutArtist from "@/components/AboutArtist";
import History from "@/features/History/History";
import { useStatus } from "@/contexts/StatusContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useLyrics } from "@/api/getLyrics";
import { LyricsMini } from "@/components/Lyrics";
import dayjs from "dayjs";
import AlbumOverview from "@/features/Album/AlbumOverview";

export function NowPlayingPage() {
  const status = useStatus();
  const { data: lyrics } = useLyrics();

  if (!status) return;

  return (
    <>
      <div className="w-full px-3 flex flex-row justify-center">
        <div className="relative w-full max-w-4xl pt-20 md:pt-10 pb-5 flex flex-col md:flex-row md:justify-center gap-6">
          <div
            className={clsx(
              "relative w-full md:h-full transition-all md:w-3/5",
            )}
          >
            <div
              className={clsx(
                "w-full",
                "md:sticky md:top-10 md:flex md:flex-col md:gap-8",
              )}
            >
              <CurrentTrack />

              <div className="hidden md:block sticky bottom-0">
                <toastPortal.Host />
              </div>
            </div>
          </div>

          <div
            className={clsx(
              "w-full flex-none flex flex-col gap-6 transition-all md:w-2/5",
            )}
          >
            <ThemeProvider sourceUrl={status.track?.track_image}>
              {lyrics && (
                <LyricsMini
                  startedAt={dayjs(status.started_at)}
                  lyrics={lyrics}
                />
              )}

              {status.last_fm_track?.wiki?.summary && (
                <AboutTrack track={status.last_fm_track as LastFMTrackT} />
              )}

              {status.last_fm_album?.tracks?.track && (
                <AlbumOverview album={status.last_fm_album as AlbumT} />
              )}

              {status.track && status.last_fm_artist && (
                <AboutArtist
                  artist={status.last_fm_artist}
                  track={status.track}
                />
              )}
            </ThemeProvider>

            <History />
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-full max-w-xl px-3">
        <div className="w-full flex flex-col gap-2">
          <toastPortal.Host />
        </div>
      </div>
    </>
  );
}
