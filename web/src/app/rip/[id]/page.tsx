import { StatusContextProvider } from "@/contexts/StatusContext";
import { RipSongPage } from "@/features/RipSongTool/RipSongPage";
import { FloatingCurrentTrack } from "@/features/NowPlaying/FloatingCurrentTrack";
import { useParams } from "react-router-dom";

export default function RipSong() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Not Found</div>;
  }

  return (
    <StatusContextProvider suspend={false}>
      <FloatingCurrentTrack>
        <RipSongPage />
      </FloatingCurrentTrack>
    </StatusContextProvider>
  );
}
