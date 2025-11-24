import { prefetchStatusHttp } from "@/api/getStatus";
import { NowPlayingPage } from "@/features/NowPlaying/NowPlayingPage";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/utils/getQueryClient";
import { prefetchHistory } from "@/api/history/getHistory";
import { StatusContextProvider } from "@/contexts/StatusContext";
import Debug from "@/components/Debug";
import { prefetchCheckAuth } from "@/api/auth/checkAuth";
import { NavBar } from "@/layouts/NavBar";
import { prefetchClientConfig } from "@/api/getClientConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const queryClient = getQueryClient();

  prefetchHistory(queryClient);

  await Promise.all([
    prefetchStatusHttp(queryClient),
    prefetchCheckAuth(queryClient),
    prefetchClientConfig(queryClient),
  ])


  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatusContextProvider>
        <NowPlayingPage />

        <Debug />
        <NavBar />
      </StatusContextProvider>
    </HydrationBoundary>
  );
}
