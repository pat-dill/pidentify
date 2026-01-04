import { HistoryPage } from "@/features/History/HistoryPage";
import { StatusContextProvider } from "@/contexts/StatusContext";

export default function History() {
  return (
    <StatusContextProvider suspend={false}>
      <HistoryPage />
    </StatusContextProvider>
  );
}
