import { toastPortal } from "@/components/Toast";
import { ReactNode, useEffect, useState } from "react";
import { getQueryClient } from "@/utils/getQueryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AntdPatchForReact19 from "@/utils/AntdPatchForReact19";

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
    <QueryClientProvider client={queryClient}>
      <toastPortal.Provider>{children}</toastPortal.Provider>
      <AntdPatchForReact19 />
    </QueryClientProvider>
  );
}
