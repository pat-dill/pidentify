import { CSSProperties, useState } from "react";
import { formatDurationShort } from "@/utils/formatDurationShort";
import { useLocalStorage } from "react-use";
import { useAnimationFrame } from "@/utils/useAnimationFrame";
import useSafeClientSplit from "@/utils/useSafeClientSplit";
import { Flex, theme, Typography } from "antd";

export default function TimedProgressBar({
  startsAt,
  durationSeconds,
  style,
}: {
  startsAt: Date;
  durationSeconds: number;
  style?: CSSProperties;
}) {
  const [_showRemaining, setShowRemaining] = useLocalStorage(
    "showRemaining",
    true,
  );

  const showRemaining = useSafeClientSplit(_showRemaining, false);

  const [now, setNow] = useState(new Date());
  useAnimationFrame(() => {
    setNow(new Date());
  });

  const sinceStart = useSafeClientSplit(
    (now.valueOf() - startsAt.valueOf()) / 1_000,
    0,
  );
  const untilEnd = Math.max(0, durationSeconds - sinceStart);

  const {
    token: { colorText },
  } = theme.useToken();

  return (
    <Flex vertical gap={4} style={style}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: 6,
          backgroundColor: `color-mix(in srgb, transparent, ${colorText} 30%)`,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: `${Math.min(1, sinceStart / durationSeconds) * 100}%`,
            backgroundColor: colorText,
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
          }}
        />
      </div>

      <Flex
        justify="space-between"
        align="center"
        style={{
          fontFamily: "Geist Mono, monospace",
          userSelect: "none",
          opacity: 0.8,
          color: colorText,
        }}
      >
        <span>
          {formatDurationShort(
            Math.round(Math.min(sinceStart, durationSeconds)),
          )}
        </span>
        <button onClick={() => setShowRemaining(!showRemaining)}>
          {showRemaining ? (
            <span>-{formatDurationShort(Math.round(untilEnd))}</span>
          ) : (
            <span>{formatDurationShort(Math.round(durationSeconds))}</span>
          )}
        </button>
      </Flex>
    </Flex>
  );
}
