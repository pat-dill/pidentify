import { get } from "@/api/request";
import { z } from "zod";
import { historyEntrySchema } from "@/schemas";
import {
  type QueryClient,
  useInfiniteQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";

const historyResponse = z.object({
  data: z.array(historyEntrySchema),
  total_count: z.number(),
  page: z.number(),
  next_page: z.number().nullish(),
});
type HistoryResponseT = z.infer<typeof historyResponse>;

async function getHistory({
  page,
}: {
  page: number;
}): Promise<HistoryResponseT> {
  const res = await get(`/api/history?page=${page}`);
  const data = await res.json();
  return historyResponse.parse(data);
}

export function getHistoryQuery() {
  return {
    queryKey: ["history"],
    queryFn: ({ pageParam }: { pageParam: number }) => {
      return getHistory({ page: pageParam });
    },
    initialPageParam: 1,
    getNextPageParam: (prev: HistoryResponseT) => prev.next_page,
    staleTime: 10 * 60 * 1000,
  };
}

export function prefetchHistory(queryClient: QueryClient) {
  const historyQuery = getHistoryQuery();
  return queryClient.prefetchInfiniteQuery({
    ...historyQuery,
    pages: 1,
  });
}

export function useHistory({ suspend }: { suspend?: boolean } = {}) {
  const historyQuery = getHistoryQuery();
  if (suspend ?? true) {
    return useSuspenseInfiniteQuery(historyQuery);
  } else {
    return useInfiniteQuery(historyQuery);
  }
}
