import { BrowserRouter, Routes, Route } from "react-router-dom";
import RootLayout from "./app/layout";
import HomePage from "./app/page";
import HistoryPage from "./app/history/page";
import SettingsPage from "./app/settings/page";
import RipSongPage from "./app/rip/[id]/page";
import { HelmetProvider } from "react-helmet-async";

function App() {
  return (
    <HelmetProvider>
      <RootLayout>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/rip/:id" element={<RipSongPage />} />
          </Routes>
        </BrowserRouter>
      </RootLayout>
    </HelmetProvider>
  );
}

export default App;

