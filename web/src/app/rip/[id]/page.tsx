import { StatusContextProvider } from "@/contexts/StatusContext";
import { RipSongPage } from "@/features/RipSongTool/RipSongPage";
import { FloatingCurrentTrack } from "@/features/NowPlaying/FloatingCurrentTrack";
import { useParams } from "react-router-dom";
import Layout from "./layout";

export default function RipSong() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Not Found</div>;
  }

  return (
    <StatusContextProvider suspend={false}>
      <Layout>
        <FloatingCurrentTrack>
          <RipSongPage />
        </FloatingCurrentTrack>
      </Layout>
    </StatusContextProvider>
  );
}
