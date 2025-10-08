import { useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { LyricsT } from "@/schemas";
import { useAnimationFrame } from "@/utils/useAnimationFrame";
import { useSpring } from "@/utils/useSpring";
import dayjs from "dayjs";
import { Card, Flex, Typography } from "antd";

interface LyricsProps {
  startedAt: dayjs.Dayjs;
  lyrics: LyricsT;
  duration?: number;
}

export function LyricsMini({ startedAt, lyrics }: LyricsProps) {
  const [hover, setHover] = useState(false);
  const [syncOffset, setSyncOffset] = useState(0);
  const getOffset = () => new Date().valueOf() - startedAt.valueOf();
  const [offsetMs, setOffsetMs] = useState(getOffset());
  useAnimationFrame(() => {
    setOffsetMs(getOffset() + syncOffset * 1000);
  });

  const lyricHeights = useRef<Record<string, number>>({});
  useLayoutEffect(() => {
    lyricHeights.current = {};
  }, [lyrics]);

  const lyricsRef = useRef<HTMLDivElement>(undefined!);
  const cardRef = useRef<HTMLDivElement>(undefined!);

  const _offsetPx = useMemo(() => {
    if (lyrics.synced) {
      let px = 0;
      for (let i = 0; i < lyrics.lines.length; i++) {
        if (lyrics.lines[i].startTimeMs <= offsetMs) {
          px += lyricHeights.current[i] || 0;
        } else {
          px -= 25;
          break;
        }
      }

      const card = cardRef.current;
      if (card) {
        px -= (card?.offsetHeight || 0) / 2;
        px = Math.max(
          0,
          Math.min(
            px,
            lyricsRef.current?.offsetHeight - (card?.offsetHeight || 0),
          ),
        );
      }

      return px;
    } else if (!!lyricsRef.current) {
      return 0;
    }
  }, [offsetMs, lyrics]);

  const [speed, setSpeed] = useState(8);
  const offsetPx = useSpring(_offsetPx || 0, 1, speed);
  useLayoutEffect(() => {
    setSpeed(1e100);
    setTimeout(() => {
      setSpeed(8);
    }, 10);
    setSyncOffset(0);
  }, [lyrics]);

  return (
    <Card
      style={{
        position: "relative",
        aspectRatio: "4/3",
        overflowY: lyrics.synced ? "hidden" : "scroll",
      }}
      styles={{
        body: {
          padding: 0,
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      ref={cardRef}
    >
      <Flex
        vertical
        style={{
          transform: `translateY(${-offsetPx}px)`,
          padding: "8px 16px",
        }}
        ref={lyricsRef}
      >
        {lyrics.lines.map((line, idx) => (
          <div
            ref={(el) => {
              lyricHeights.current[idx] = el?.offsetHeight || 0;
            }}
            style={{
              userSelect: "none",
              opacity: line.startTimeMs > offsetMs ? 0.5 : 1,
              padding: "2.5px 0",
            }}
            key={idx}
          >
            <Typography.Text style={{
              fontSize: 20,
              fontWeight: 600,
            }}>
              {line.words}
            </Typography.Text>
          </div>
        ))}
      </Flex>

      {hover && lyrics.synced && (
        <div className="absolute bottom-0 translate-y-1/2 left-0 w-full z-[100]">
          <input
            type="range"
            className="w-full"
            step={0.01}
            min={-3}
            max={3}
            value={syncOffset}
            onChange={(e) => {
              setSyncOffset(parseFloat(e.target.value));
            }}
          />
        </div>
      )}
    </Card>
  );
}
