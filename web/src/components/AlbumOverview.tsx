import { AlbumT } from "@/schemas";
import Image from "next/image";
import { Button, Card, Flex, List, theme, Typography } from "antd";
import { Link } from "next-view-transitions";
import { useRef } from "react";
import { CarryOutFilled } from "@ant-design/icons";
import { useStatus } from "@/contexts/StatusContext";
import { formatDurationShort } from "@/utils/formatDurationShort";

export default function AlbumOverview({
  album
}: {
  album: AlbumT;
}) {
  const { token: { colorBorderSecondary } } = theme.useToken();
  const status = useStatus();

  const isCurrentAlbum = status?.last_fm_album?.name === album.name;

  return (
    <Card
      title={<Typography.Title level={4} style={{ marginBottom: 0 }}>
        {album.name}
      </Typography.Title>}
      styles={{ body: { padding: 0 } }}
    >
      <Flex vertical style={{ maxHeight: 200, overflowY: "auto" }}>
        {album.tracks?.track?.map((track, idx) => {
          const isCurrentTrack = status?.track?.track_no === track["@attr"]?.rank;

          return <Flex key={track.name}>
            <div style={{
              padding: "8px 10px",
              borderTop: idx > 0 ? `1px solid ${colorBorderSecondary}` : "",
              width: "100%",
            }}>
              <Flex align="center" style={{
                fontWeight: isCurrentTrack ? 600 : 400,
              }}>
                <Typography.Text style={{
                  minWidth: 16,
                  marginRight: 4,
                  textAlign: "right",
                }}>
                  {track["@attr"]?.rank}.
                </Typography.Text>
                <Typography.Text>
                  {track.name}
                </Typography.Text>

                <div style={{ flex: 1 }} />

                {track.duration && (
                  <Typography.Text type="secondary">
                    {formatDurationShort(track.duration)}
                  </Typography.Text>
                )}
              </Flex>

            </div>
          </Flex>
        })}
      </Flex>
    </Card>
  );
}
