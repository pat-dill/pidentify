import { patch } from "@/api/request";

export type UpdateHistoryOpts = {
  duration: number | null;
  track_name: string | null;
  artist: string | null;
  album: string | null;
  [_: string]: any;
};

export function updateHistoryEntries(
  entryIds: string[],
  opts: UpdateHistoryOpts,
) {
  return patch(`/api/history/batch`, { entry_ids: entryIds, data: opts });
}
