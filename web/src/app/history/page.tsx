import { HistoryPage } from "@/features/History/HistoryPage";
import { StatusContextProvider } from "@/contexts/StatusContext";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/utils/getQueryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function History() {
  const queryClient = getQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatusContextProvider suspend={false}>
        <HistoryPage />
      </StatusContextProvider>
    </HydrationBoundary>
  );
}
