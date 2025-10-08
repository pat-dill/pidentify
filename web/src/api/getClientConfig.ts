import { get } from "@/api/request";
import { z } from "zod";
import {
  type QueryClient,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";

export const clientConfigSchema = z.object({
  can_skip: z.boolean(),
  can_save: z.boolean(),
  can_edit_history: z.boolean(),
  buffer_length_seconds: z.number(),
  temp_save_offset: z.number(),
});
export type ClientConfigT = z.infer<typeof clientConfigSchema>;

async function getClientConfig(): Promise<ClientConfigT> {
  const res = await get("/api/config");
  return clientConfigSchema.parse(await res.json());
}

export function getClientConfigQuery() {
  return {
    queryKey: ["client-config"],
    queryFn: () => getClientConfig(),
    staleTime: 0,
  };
}

export function prefetchClientConfig(queryClient: QueryClient) {
  const statusQuery = getClientConfigQuery();
  return queryClient.prefetchQuery(statusQuery);
}

type ClientConfigOpts = {
  suspend?: boolean;
};

export function useClientConfig(opts: ClientConfigOpts = {}) {
  const { suspend = false } = opts;
  const query = getClientConfigQuery();

  if (suspend) {
    return useSuspenseQuery(query);
  } else {
    return useQuery(query);
  }
}
