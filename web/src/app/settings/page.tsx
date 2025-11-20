import { StatusContextProvider } from "@/contexts/StatusContext";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/utils/getQueryClient";
import { SettingsPage } from "@/features/Settings/SettingsPage";
import Debug from "@/components/Debug";
import { prefetchSettings } from "@/api/settings/getSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Settings() {
  const queryClient = getQueryClient();

  await prefetchSettings(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatusContextProvider suspend={false}>
        <SettingsPage />

        <Debug />
      </StatusContextProvider>
    </HydrationBoundary>
  );
}
