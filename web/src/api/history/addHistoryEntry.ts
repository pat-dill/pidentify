import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post } from "../request";
import { getHistoryQuery } from "@/api/history/getHistory";

type AddHistoryEntryArgs = {
    started_at: Date,
    duration_seconds: number,
    track_name: string,
    track_no: number,
    album_name: string,
    artist_name: string,
    track_image: string,
    artist_image: string,
}

export const addHistoryEntry = async (args: AddHistoryEntryArgs) => {
    const response = await post("/api/history/add-manual-entry", args);
    return response.json();
}

export const useAddHistoryEntry = ({ onSuccess }: { onSuccess?: () => void }) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: AddHistoryEntryArgs) => addHistoryEntry(args),
        onSuccess: () => {
            queryClient.invalidateQueries(getHistoryQuery());
            onSuccess?.();
        },
    });
}