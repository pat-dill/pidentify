import TimedProgressBar from "@/components/TimedProgressBar";
import dayjs from "dayjs";
import { Flex, Space, Tag, theme, Typography } from "antd";
import { Toast } from "@/components/Toast";
import { TimeUntil } from "@/components/TimeUntil";
import { useClientConfig } from "@/api/getClientConfig";
import { scanNow } from "@/api/scanNow";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "next-view-transitions";
import useSafeClientSplit from "@/utils/useSafeClientSplit";
import clsx from "clsx";
import { ScanningToast } from "@/features/NowPlaying/ScanningToast";
import { useStatus } from "@/contexts/StatusContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function CurrentTrack({
  compact = false,
}: {
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: clientConfig } = useClientConfig();
  const status = useStatus();

  const tags = [];
  if (status?.track?.released) {
    tags.push(status?.track.released);
  }

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const ImageContainer = useSafeClientSplit(() => {
    return window.location.pathname === "/" ? "div" : Link;
  }, Link);

  if (!status) return;

  return (
    <>
      <Flex
        style={{
          viewTransitionName: "now-playing",
        }}
        vertical
      >
        <Space
          style={{
            display: "block",
            width: "100%",
            marginBottom: compact ? 8 : 16,
          }}
        >
          <ImageContainer
            href="/"
            style={{
              pointerEvents: compact ? "none" : "auto",
            }}
          >
            {status.track?.track_image ? (
              <img
                src={status.track.track_image}
                alt={(status.track.album_name || "Album") + " Cover"}
                className="w-full aspect-square object-cover"
                crossOrigin={"anonymous"}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1/1",
                  backgroundColor: colorBgContainer,
                }}
              />
            )}
          </ImageContainer>
        </Space>

        <Typography.Title
          level={compact ? 4 : 2}
          style={{ margin: 0, opacity: 0.9, lineHeight: 1 }}
          className={clsx({
            "line-clamp-1": compact,
          })}
        >
          {status?.last_fm_track?.name ??
            status.track?.track_name ??
            "No Track Found"}
        </Typography.Title>

        <Typography.Title
          level={compact ? 5 : 4}
          style={{
            marginTop: 0,
            marginBottom: 10,
            opacity: 0.7,
          }}
          className={clsx({
            "line-clamp-1": compact,
          })}
        >
          {status?.track?.artist_name ?? ""}
        </Typography.Title>

        {status?.duration_seconds ? (
          <TimedProgressBar
            startsAt={dayjs(status.started_at).toDate()}
            durationSeconds={status.duration_seconds}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <ThemeProvider sourceUrl={status.track?.track_image}>
          <Flex wrap>
            {tags.map((tag) => (
              <Tag key={tag}>
                <span style={{ opacity: 0.8 }}>{tag}</span>
              </Tag>
            ))}
          </Flex>
        </ThemeProvider>
      </Flex>
      {status.next_scan && (
        <Toast endsAt={dayjs(status.next_scan)}>
          <Flex
            align="center"
            justify="space-between"
            style={{ width: "100%" }}
          >
            <Typography.Text
              style={{ fontFamily: "Geist Mono, monospace", margin: 0 }}
            >
              {"next scan in "}
              <TimeUntil date={dayjs(status.next_scan)} />
              {"..."}
            </Typography.Text>

            {clientConfig?.can_skip && (
              <a
                onClick={async () => {
                  await scanNow();
                  await queryClient.invalidateQueries({ queryKey: ["status"] });
                }}
                style={{
                  fontFamily: "Geist Mono, monospace",
                  textDecoration: "underline",
                  textDecorationThickness: 2,
                  textUnderlineOffset: 2,
                }}
              >
                scan now
              </a>
            )}
          </Flex>
        </Toast>
      )}
      <ScanningToast />
    </>
  );
}
