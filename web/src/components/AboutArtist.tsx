import { LastFMArtistT, TrackT } from "@/schemas";
import { Button, Card, Typography } from "antd";
import { useRef } from "react";

export default function AboutArtist({
  artist,
  track,
}: {
  artist: LastFMArtistT;
  track: TrackT;
}) {
  // noinspection TypeScriptValidateTypes
  const content: string = artist.bio?.summary?.split("<a href=")[0] || "";
  const img = track.artist_image;

  const imgRef = useRef<HTMLImageElement>(undefined!);

  return (
    // <ThemeProvider sourceImage={imgRef.current}>
    <Card
      cover={
        img && (
          <img
            src={img}
            alt={artist.name}
            style={{
              objectFit: "cover",
              objectPosition: "50% 27.5%",
              aspectRatio: "2/1",
              width: "100%",
            }}
            ref={imgRef}
          />
        )
      }
    >
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        {artist.name}
      </Typography.Title>

      {content && (
        <Typography.Paragraph
          style={{ marginBottom: 0 }}
          className="line-clamp-6"
        >
          {content}
        </Typography.Paragraph>
      )}

      <a href={`${artist.url}/+wiki`} target="_blank" rel="noopener noreferrer">
        <Button type="link" style={{ padding: 0, margin: 0, fontWeight: 500 }}>
          Read more
        </Button>
      </a>
    </Card>
    // </ThemeProvider>
  );
}
