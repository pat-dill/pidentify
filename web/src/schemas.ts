import { z } from "zod";

export const lastFMArtistSchema = z.object({
  name: z.string(),
  url: z.string(),
  image: z
    .array(
      z.object({
        ["#text"]: z.string(),
        size: z.string(),
      }),
    )
    .default([]),
  bio: z
    .object({
      content: z.string().nullish(),
      summary: z.string().nullish(),
    })
    .nullish(),
});
export type LastFMArtistT = z.infer<typeof lastFMArtistSchema>;

export const lastFMTrackSchema = z.object({
  name: z.string(),
  url: z.string(),
  duration: z.number(),
  duration_seconds: z.number(),
  wiki: z
    .object({
      summary: z.string(),
      content: z.string(),
    })
    .nullish(),
});
export type LastFMTrackT = z.infer<typeof lastFMTrackSchema>;

export const trackSchema = z.object({
  track_id: z.string().nullish(),
  track_guid: z.string().nullish(),
  duration_seconds: z.number().nullish(),
  track_name: z.string(),
  artist_name: z.string().nullish(),
  album_name: z.string().nullish(),
  track_image: z.string().nullish(),
  artist_image: z.string().nullish(),
  last_fm: lastFMTrackSchema.nullish(),
  released: z.string().nullish(),
});

export type TrackT = z.infer<typeof trackSchema>;

export const lyricsSchema = z.object({
  synced: z.boolean(),
  lines: z.array(
    z.object({
      startTimeMs: z.number(),
      words: z.string(),
    }),
  ),
});
export type LyricsT = z.infer<typeof lyricsSchema>;

export const historyEntrySchema = z.object({
  track_guid: z.string(),
  entry_id: z.string(),
  detected_at: z.string(),
  started_at: z.string().nullish(),
  track: trackSchema,
  saved_temp_buffer: z.boolean(),
});
export type HistoryEntryT = z.infer<typeof historyEntrySchema>;
