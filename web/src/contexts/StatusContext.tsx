"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import { statusSchema, StatusT, useStatusHttp } from "@/api/getStatus";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { AutoThemeProvider } from "@/contexts/ThemeContext";
import useSafeClientSplit from "@/utils/useSafeClientSplit";

type StatusContextT = StatusT | undefined;

const HTTP_WEBSOCKET_URL = `${process.env.NEXT_PUBLIC_HTTP_WEBSOCKET_PROXY}/api/status/ws`;
const HTTPS_WEBSOCKET_URL = `${process.env.NEXT_PUBLIC_HTTPS_WEBSOCKET_PROXY}/api/status/ws`;

const statusContext = createContext<StatusContextT>(undefined!);

export function StatusContextProvider({
  children,
  suspend = true,
}: {
  children: ReactNode;
  suspend?: boolean;
}) {
  const websocketUrl = useSafeClientSplit(() => {
    return window.location.protocol === "https:"
      ? HTTPS_WEBSOCKET_URL
      : HTTP_WEBSOCKET_URL;
  });

  const websocket = useWebSocket(websocketUrl as string);
  const { data: httpStatus } = useStatusHttp({
    live: websocket.readyState !== ReadyState.OPEN,
    suspend,
  });

  const liveStatus = useMemo(() => {
    if (
      websocket.readyState === ReadyState.OPEN &&
      websocket.lastMessage?.data
    ) {
      try {
        return statusSchema.parse(JSON.parse(websocket.lastMessage.data));
      } catch (e) {
        console.warn(e);
      }
    }

    return httpStatus;
  }, [httpStatus, websocket.lastMessage, websocket.readyState]);

  return (
    <statusContext.Provider value={liveStatus}>
      <AutoThemeProvider root>{children}</AutoThemeProvider>
    </statusContext.Provider>
  );
}

export const useStatus = () => useContext(statusContext);
