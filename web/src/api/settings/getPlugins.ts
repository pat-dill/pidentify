import { get } from "@/api/request";
import { z } from "zod";
import {
  type QueryClient,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";

const pluginsResponse = z.array(z.string());
type PluginsResponseT = z.infer<typeof pluginsResponse>;

async function getPlugins(): Promise<PluginsResponseT> {
  const res = await get(`/api/settings/music-id-plugins`);
  const data = await res.json();
  return pluginsResponse.parse(data);
}

export function getPluginsQuery() {
  return {
    queryKey: ["music-id-plugins"],
    queryFn: () => {
      return getPlugins();
    },
    staleTime: 1 * 60 * 1000,
  };
}

export function prefetchPlugins(queryClient: QueryClient) {
  return queryClient.prefetchQuery(getPluginsQuery());
}

export function usePlugins({ suspend }: { suspend?: boolean } = {}) {
  const pluginsQuery = getPluginsQuery();
  if (suspend ?? true) {
    return useSuspenseQuery(pluginsQuery);
  } else {
    return useQuery(pluginsQuery);
  }
}
