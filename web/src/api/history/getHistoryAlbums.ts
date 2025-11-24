import z from "zod";
import { get } from "../request";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

const albumsResponse = z.object({
    data: z.array(z.object({
        artist: z.string(),
        album: z.string(),
        artist_image_url: z.string().nullish(),
        album_image_url: z.string().nullish(),
    }))
})

type AlbumsResponseT = z.infer<typeof albumsResponse>;

export async function getHistoryAlbums(): Promise<AlbumsResponseT> {
    const resp = await get("/api/history/albums");
    const data = await resp.json();
    return albumsResponse.parse(data);
}

export function getAlbumsQuery({ enabled }: { enabled?: boolean } = {}) {
    return {
        queryKey: ["history-albums"],
        queryFn: () => getHistoryAlbums(),
        staleTime: 0,
        enabled: enabled ?? true,
    };
}

export function useHistoryAlbums({ enabled }: { enabled?: boolean } = {}) {
    const albumsQuery = getAlbumsQuery({ enabled });

    return useQuery(albumsQuery);
}