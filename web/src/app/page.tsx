import { NowPlayingPage } from "@/features/NowPlaying/NowPlayingPage";
import { StatusContextProvider } from "@/contexts/StatusContext";
import Debug from "@/components/Debug";
import { NavBar } from "@/layouts/NavBar";

export default function Home() {
  return (
    <StatusContextProvider>
      <NowPlayingPage />
      <Debug />
      <NavBar />
    </StatusContextProvider>
  );
}
