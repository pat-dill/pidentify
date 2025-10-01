import { patch } from "@/api/request";

type UpdateHistoryOpts = {
  duration: number | null;
  track_name: string | null;
  artist: string | null;
  album: string | null;
};

export function updateHistoryEntries(entryId: string, opts: UpdateHistoryOpts) {
  return patch(`/api/history/${entryId}`, opts);
}
