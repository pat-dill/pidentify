import { useQuery } from "@tanstack/react-query";
import { get } from "./request";

export function getWebsocketHost(): Promise<string> {
    return get(
        `/api/status/websocket-host?scheme=${window.location.protocol.replace(":", "")}`,
    ).then((res) => res.json());
}

export function useWebsocketHost() {
    return useQuery({
        queryKey: ["websocket-host"],
        queryFn: () => getWebsocketHost(),
        staleTime: 0,
    });
}
