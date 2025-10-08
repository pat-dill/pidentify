import { LastFMTrackT } from "../schemas";
import { Button, Card, Typography } from "antd";
import { Link } from "next-view-transitions";

export default function AboutTrack({ track }: { track: LastFMTrackT }) {
  // noinspection TypeScriptValidateTypes
  const content: string = track.wiki?.summary?.split("<a href=")[0] || "";

  return (
    <Card>
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        About Track
      </Typography.Title>

      {content && (
        <Typography.Paragraph
          style={{ marginBottom: 0 }}
          className="line-clamp-6"
        >
          {content}
        </Typography.Paragraph>
      )}

      <Link href={`${track.url}/+wiki`} target="_blank">
        <Button type="link" style={{ padding: 0, margin: 0, fontWeight: 500 }}>
          Read more
        </Button>
      </Link>
    </Card>
  );
}
