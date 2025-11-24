import { post } from "../request";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";

const responseSchema = z.object({
    success: z.boolean(),
    status: z.string().optional(),
    message: z.string().optional(),
    data: z.string().optional(),
});
export type SaveRipToLibraryResponseT = z.infer<typeof responseSchema>;

type SaveRipToLibraryRequest = {
    track_name: string;
    track_no?: number;
    album_name: string;
    artist_name: string;
    start_offset: number;
    end_offset: number;
    track_image?: string | null;
    artist_image?: string | null;
};

async function saveRipToLibrary(
    buffer_id: string,
    data: SaveRipToLibraryRequest,
): Promise<SaveRipToLibraryResponseT> {
    const res = await post(`/api/rip/${buffer_id}/save`, data);
    return responseSchema.parse(await res.json());
}

type SaveRipToLibraryOpts = {
    buffer_id: string;
    data: SaveRipToLibraryRequest;
};

export function useSaveRipToLibrary({ onSuccess }: { onSuccess?: () => void } = {}) {
    return useMutation({
        mutationFn: async (opts: SaveRipToLibraryOpts) => {
            const { buffer_id, data } = opts;
            return await saveRipToLibrary(buffer_id, data);
        },
        onSuccess: () => {
            onSuccess?.();
        },
    });
}

