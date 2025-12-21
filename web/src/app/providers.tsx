"use client";

import { toastPortal } from "@/components/Toast";
import { ReactNode, useEffect, useState } from "react";
import { getQueryClient } from "@/utils/getQueryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ViewTransitions } from "next-view-transitions";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AntdPatchForReact19 from "@/utils/AntdPatchForReact19";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/store";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  useEffect(() => {
    persistQueryClient({
      queryClient,
      persister: createAsyncStoragePersister({
        storage: window.localStorage,
      }),
    });
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <ViewTransitions>
            <toastPortal.Provider>{children}</toastPortal.Provider>

            <AntdPatchForReact19 />
          </ViewTransitions>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
