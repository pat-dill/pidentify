import { getQueryClient } from "@/utils/getQueryClient";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { StatusContextProvider } from "@/contexts/StatusContext";
import { RipSongPage } from "@/features/RipSongTool/RipSongPage";
import { getRipQuery, prefetchRipQuery } from "@/api/rip/getRip";
import { FloatingCurrentTrack } from "@/features/NowPlaying/FloatingCurrentTrack";
import { prefetchClientConfig } from "@/api/getClientConfig";
import { notFound, redirect } from "next/navigation";

type RipSongProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RipSong({ params }: RipSongProps) {
  const queryClient = getQueryClient();
  const { id } = await params;

  try {
    await getRipQuery({ entryId: id }).queryFn();
  } catch (e) {
    notFound();
    return null;
  }

  await Promise.all([
    prefetchRipQuery(queryClient, { entryId: id }),
    prefetchClientConfig(queryClient),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatusContextProvider suspend={false}>
        <FloatingCurrentTrack>
          <RipSongPage />
        </FloatingCurrentTrack>
      </StatusContextProvider>
    </HydrationBoundary>
  );
}
