import { get } from "@/api/request";
import { z } from "zod";
import {
  albumSchema,
  lastFMArtistSchema,
  lastFMTrackSchema,
  trackSchema,
} from "@/schemas";
import {
  isServer,
  type QueryClient,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";

export const statusSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  recorded_at: z.string().nullish(),
  started_at: z.string().nullish(),
  rms: z.number().nullish(),
  track: trackSchema.nullish(),
  last_fm_track: lastFMTrackSchema.nullish(),
  last_fm_artist: lastFMArtistSchema.nullish(),
  last_fm_album: albumSchema.nullish(),
  duration_seconds: z.number().nullish(),
  next_scan: z.string().nullish(),
  scan_ends: z.string().nullish(),
});
export type StatusT = z.infer<typeof statusSchema>;

async function getStatusHttp(): Promise<StatusT> {
  const res = await get("/api/status");
  return statusSchema.parse(await res.json());
}

export function getStatusQuery() {
  return {
    queryKey: ["status"],
    queryFn: () => getStatusHttp(),
  };
}

export function prefetchStatusHttp(queryClient: QueryClient) {
  const statusQuery = getStatusQuery();
  return queryClient.prefetchQuery(statusQuery);
}

export function useStatusHttp({
  live,
  suspend = true,
}: {
  live?: boolean;
  suspend: boolean;
}) {
  const { queryKey, queryFn } = getStatusQuery();

  if (suspend) {
    return useSuspenseQuery({
      queryKey,
      queryFn: () => queryFn(),
      refetchInterval: () => {
        if (!isServer && live) {
          return 2500;
        } else {
          return false;
        }
      },
      refetchOnWindowFocus: "always",
      staleTime: 10 * 1000,
    });
  } else {
    return useQuery({
      queryKey,
      queryFn: () => queryFn(),
      refetchInterval: () => {
        if (!isServer && live) {
          return 2500;
        } else {
          return false;
        }
      },
      refetchOnWindowFocus: "always",
      staleTime: 10 * 1000,
    });
  }
}
