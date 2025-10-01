import { get } from "@/api/request";
import {
  keepPreviousData,
  type QueryClient,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";

type getAudioDataArgs = { entryId?: string; chartParts: number };

type AudioDataResponse = {
  chart: number[];
  duration: number;
};

async function getAudioDataEntry({
  entryId,
  chartParts,
}: getAudioDataArgs): Promise<AudioDataResponse> {
  const res = await get(
    `/api/rip/${entryId}/audio-data?chart_parts=${chartParts}`,
  );
  return (await res.json()) as AudioDataResponse;
}

export function getAudioDataQuery({ entryId, chartParts }: getAudioDataArgs) {
  return {
    queryKey: ["get-audio-frames", { entryId, chartParts }],
    queryFn: () => {
      return getAudioDataEntry({ entryId, chartParts });
    },
    enabled: !!entryId && chartParts > 0,
    placeholderData: (prev: any) => keepPreviousData(prev),
  };
}

export function prefetchAudioDataQuery(
  queryClient: QueryClient,
  args: getAudioDataArgs,
) {
  const ripQuery = getAudioDataQuery(args);
  return queryClient.prefetchQuery(ripQuery);
}

export function useAudioData({
  entryId,
  chartParts,
  suspend = false,
}: getAudioDataArgs & { suspend?: boolean }) {
  const ripQuery = getAudioDataQuery({ entryId, chartParts });
  return suspend ? useSuspenseQuery(ripQuery) : useQuery(ripQuery);
}
