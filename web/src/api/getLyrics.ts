import { get } from "@/api/request";
import { useQuery } from "@tanstack/react-query";
import { lyricsSchema, LyricsT } from "@/schemas";
import { useStatus } from "@/contexts/StatusContext";

async function getLyrics(): Promise<LyricsT> {
  const res = await get("/api/lyrics");
  return lyricsSchema.parse(await res.json());
}

export function useLyrics() {
  const status = useStatus();

  return useQuery({
    enabled: status?.success,
    queryKey: ["lyrics", status?.track?.track_id],
    queryFn: () => getLyrics(),
    retry: 2,
  });
}
