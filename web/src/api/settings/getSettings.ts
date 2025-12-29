import { get } from "@/api/request";
import { z } from "zod";
import {
  type QueryClient,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";

const settingsResponse = z.object({
  device: z.string(),
  device_offset: z.number(),
  sample_rate: z.number().nullish(),
  channels: z.number().nullish(),
  blocksize: z.number(),
  latency: z.number(),

  duration: z.number(),
  silence_threshold: z.number(),

  buffer_length_seconds: z.number(),
  temp_save_offset: z.number(),

  last_fm_key: z.string(),
  music_id_plugin: z.string(),

  admin_username: z.string(),
  has_password: z.boolean(),
});
type SettingsResponseT = z.infer<typeof settingsResponse>;

async function getSettings(): Promise<SettingsResponseT> {
  const res = await get(`/api/settings`);
  const data = await res.json();
  return settingsResponse.parse(data);
}

export function getSettingsQuery() {
  return {
    queryKey: ["settings"],
    queryFn: () => {
      return getSettings();
    },
    staleTime: 10 * 60 * 1000,
  };
}

export function prefetchSettings(queryClient: QueryClient) {
  return queryClient.prefetchQuery(getSettingsQuery());
}

export function useSettings({ suspend }: { suspend?: boolean } = {}) {
  const settingsQuery = getSettingsQuery();
  if (suspend ?? true) {
    return useSuspenseQuery(settingsQuery);
  } else {
    return useQuery(settingsQuery);
  }
}
