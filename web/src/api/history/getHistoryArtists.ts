import z from "zod";
import { get } from "../request";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

const artistsResponse = z.object({
    data: z.array(z.object({
        artist: z.string(),
        artist_image_url: z.string().nullish(),
    }))
})

type ArtistsResponseT = z.infer<typeof artistsResponse>;

export async function getHistoryArtists(): Promise<ArtistsResponseT> {
    const resp = await get("/api/history/artists");
    const data = await resp.json();
    return artistsResponse.parse(data);
}

export function getArtistsQuery({ enabled }: { enabled?: boolean } = {}) {
    return {
        queryKey: ["history-artists"],
        queryFn: () => getHistoryArtists(),
        staleTime: 0,
        enabled: enabled ?? true,
    };
}

export function useHistoryArtists({ enabled }: { enabled?: boolean } = {}) {
    const artistsQuery = getArtistsQuery({ enabled });

    return useQuery(artistsQuery);
}