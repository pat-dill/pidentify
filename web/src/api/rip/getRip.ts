import { get } from "@/api/request";
import { historyEntrySchema, HistoryEntryT } from "@/schemas";
import {
  type QueryClient,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { z } from "zod";

const ripMetaSchema = z.object({
  history_entry: historyEntrySchema.nullish(),
});

type RipMetaT = z.infer<typeof ripMetaSchema>;

type GetRipArgs = { entryId: string };

async function getRipEntry({ entryId }: GetRipArgs): Promise<RipMetaT> {
  const res = await get(`/api/rip/${entryId}`);
  const data = await res.json();
  return ripMetaSchema.parse(data);
}

export function getRipQuery({ entryId }: GetRipArgs) {
  return {
    queryKey: ["get-rip", { entryId }],
    queryFn: () => {
      return getRipEntry({ entryId });
    },
  };
}

export function prefetchRipQuery(queryClient: QueryClient, args: GetRipArgs) {
  const ripQuery = getRipQuery(args);
  return queryClient.prefetchQuery(ripQuery);
}

export function useRipEntry({
  entryId,
  suspend = false,
}: GetRipArgs & { suspend?: boolean }) {
  const ripQuery = getRipQuery({ entryId });
  return suspend ? useSuspenseQuery(ripQuery) : useQuery(ripQuery);
}
