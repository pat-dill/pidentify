import { StatusContextProvider } from "@/contexts/StatusContext";
import { SettingsPage } from "@/features/Settings/SettingsPage";
import Debug from "@/components/Debug";

export default function Settings() {
  return (
    <StatusContextProvider suspend={false}>
      <SettingsPage />
      <Debug />
    </StatusContextProvider>
  );
}
