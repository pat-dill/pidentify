import { get } from "@/api/request";
import { z } from "zod";
import {
  type QueryClient,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";

const devicesResponse = z.array(z.object({
  name: z.string(),
  max_input_channels: z.number(),
  max_output_channels: z.number(),
  default_samplerate: z.number(),
}))
type DevicesResponseT = z.infer<typeof devicesResponse>;

async function getDevices(): Promise<DevicesResponseT> {
  const res = await get(`/api/settings/devices`);
  const data = await res.json();
  return devicesResponse.parse(data);
}

export function getDevicesQuery() {
  return {
    queryKey: ["devices"],
    queryFn: () => {
      return getDevices();
    },
    staleTime: 10 * 60 * 1000,
  };
}

export function prefetchDevices(queryClient: QueryClient) {
  return queryClient.prefetchQuery(getDevicesQuery());
}

export function useDevices({ suspend }: { suspend?: boolean } = {}) {
  const devicesQuery = getDevicesQuery();
  if (suspend) {
    return useSuspenseQuery(devicesQuery);
  } else {
    return useQuery(devicesQuery);
  }
}
