import { delete_ } from "@/api/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getHistoryQuery } from "@/api/history/getHistory";

function deleteHistoryEntry(entryId: string) {
  return delete_(`/api/history/${entryId}`);
}

export function useDeleteHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => deleteHistoryEntry(entryId),
    onSettled: () => queryClient.invalidateQueries(getHistoryQuery()),
  });
}

function deleteHistoryEntries(entries: string[]) {
  return delete_(`/api/history/batch`, { entry_ids: entries });
}

export function useDeleteHistoryEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: string[]) => deleteHistoryEntries(entries),
    onSettled: () => queryClient.invalidateQueries(getHistoryQuery()),
  });
}
