import { AlbumT } from "@/schemas";
import Image from "next/image";
import { Button, Card, Flex, List, theme, Typography } from "antd";
import { Link } from "next-view-transitions";
import { useMemo, useRef, useState } from "react";
import { CarryOutFilled } from "@ant-design/icons";
import { useStatus } from "@/contexts/StatusContext";
import { formatDurationShort } from "@/utils/formatDurationShort";
import {
  ManualEntryFormFields,
  ManualEntryModal,
} from "@/features/History/ManualEntry/ManualEntryModal";
import { AutoThemeProvider } from "@/contexts/ThemeContext";

export default function AlbumOverview({ album }: { album?: AlbumT }) {
  const {
    token: { colorBorderSecondary },
  } = theme.useToken();

  const status = useStatus();
  const isCurrentAlbum = !!album && status?.last_fm_album?.name === album.name;

  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntryInitialValues, setManualEntryInitialValues] = useState<
    Partial<ManualEntryFormFields>
  >({});

  const tracks = !!album?.tracks?.track
    ? Array.isArray(album?.tracks?.track)
      ? album?.tracks.track
      : [album?.tracks.track]
    : [];

  return (
    <>
      {album && (
        <AutoThemeProvider>
          <Card
            title={
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {album.name}
              </Typography.Title>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Flex vertical style={{ maxHeight: 200, overflowY: "auto" }}>
              {tracks?.map((track, idx, tracks) => {
                const trackNo = track["@attr"]?.rank ?? idx + 1;

                let isCurrentTrack = false;
                let startOffset: number | null = null;
                if (isCurrentAlbum && status?.track?.track_no) {
                  if (status.track.track_no === trackNo) {
                    isCurrentTrack = true;
                  } else if (status.track.track_no > trackNo) {
                    startOffset = 0;
                    let j = trackNo;
                    while (j < status.track.track_no) {
                      if (tracks[j - 1]?.duration) {
                        startOffset -= tracks[j - 1]?.duration ?? 0;
                      }
                      j++;
                    }
                  }
                }

                return (
                  <Flex key={track.name}>
                    <div
                      style={{
                        padding: "8px 10px",
                        borderTop:
                          idx > 0 ? `1px solid ${colorBorderSecondary}` : "",
                        width: "100%",
                      }}
                    >
                      <Flex
                        align="center"
                        style={{
                          fontWeight: isCurrentTrack ? 700 : 400,
                        }}
                      >
                        <Typography.Text
                          style={{
                            minWidth: 16,
                            marginRight: 4,
                            textAlign: "right",
                          }}
                        >
                          {trackNo}.
                        </Typography.Text>
                        <Typography.Text style={{ lineClamp: 1 }}>
                          {track.name}
                        </Typography.Text>

                        <div style={{ flex: 1 }} />

                        {track.duration && (
                          <Typography.Text
                            type="secondary"
                            style={{ lineClamp: 1 }}
                          >
                            {formatDurationShort(track.duration)}
                          </Typography.Text>
                        )}
                      </Flex>
                    </div>
                  </Flex>
                );
              })}
            </Flex>
          </Card>
        </AutoThemeProvider>
      )}

      <ManualEntryModal
        open={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        initialValues={manualEntryInitialValues}
      />
    </>
  );
}
