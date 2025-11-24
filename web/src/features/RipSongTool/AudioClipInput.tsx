import { Button, Flex, theme } from "antd";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getPercentile } from "@/utils/getPercentile";
import { useAnimationFrame } from "@/utils/useAnimationFrame";
import { useDelayedValue } from "@/utils/useDelayedValue";
import useDragDetector from "@/utils/useDragDetector";
import clamp from "@/utils/clamp";
import { useAudioController } from "@/utils/useAudioController";
import {
  CaretRightFilled,
  PauseOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
} from "@ant-design/icons";

type AudioClipInputProps = {
  chartHeight?: number;
  scrubHeight?: number;
  offsetStart: number;
  offsetEnd: number;
  onChange: ({
    offsetStart,
    offsetEnd,
  }: {
    offsetStart: number;
    offsetEnd: number;
  }) => void;
  chart: number[];
  duration: number;
  src: string;
  onSetChartParts?: (width: number) => void;
};

const BAR_WIDTH = 2;
const BAR_GAP = 1;

function BarChart({
  chart,
  chartHeight,
  colorText,
}: {
  chart: number[];
  chartHeight: number;
  colorText: string;
}) {
  return (
    <>
      {" "}
      {chart.map((v, i) => (
        <div
          key={i}
          style={{
            width: BAR_WIDTH / window.devicePixelRatio,
            height: Math.max(v * chartHeight, 1 / window.devicePixelRatio),
            backgroundColor: colorText,
          }}
        />
      ))}
    </>
  );
}

export function AudioClipInput(props: AudioClipInputProps) {
  const {
    chartHeight = 200,
    scrubHeight = 25,
    offsetStart,
    offsetEnd,
    onChange,
    chart,
    duration,
    src,
    onSetChartParts,
  } = props;

  const processedChart = useMemo(() => {
    const highVol = getPercentile(chart, 1);
    return chart.map((vol) => Math.min(1, vol / highVol));
  }, [chart]);

  const {
    token: { colorText, colorBorder },
  } = theme.useToken();

  const audioRef = useRef<HTMLAudioElement>(null);
  const audio = useAudioController(audioRef.current);
  useEffect(() => {
    audio.setTime(offsetStart);
  }, [audioRef.current]);

  const chartRef = useRef<HTMLDivElement>(null);
  const [pxWidth, setPxWidth] = useState(0);
  useAnimationFrame(() => {
    if (chartRef.current) {
      const pixelWidth = chartRef.current.clientWidth * window.devicePixelRatio;
      const barCount = Math.floor(pixelWidth / (BAR_WIDTH + BAR_GAP));
      setPxWidth(barCount);
    }
  });

  const debouncedPxWidth = useDelayedValue(pxWidth, 500);
  useLayoutEffect(() => {
    onSetChartParts?.(debouncedPxWidth);
  }, [debouncedPxWidth]);

  const [startDragProps, movingStart] = useDragDetector({
    onMove: ({ dx, prev }) => {
      if (!chartRef.current) return;

      const newOffsetStart = clamp(
        prev + (dx / chartRef.current.clientWidth) * duration,
        0,
        duration - offsetEnd,
      );

      onChange({
        offsetStart: newOffsetStart,
        offsetEnd,
      });

      audio.pause();
      audio.setTime(newOffsetStart);
    },
    onEnd: () => audio.play(),
    prev: offsetStart,
  });

  const [endDragProps, movingEnd] = useDragDetector({
    onMove: ({ dx, prev }) => {
      if (!chartRef.current) return;

      const newOffsetEnd = clamp(
        prev - (dx / chartRef.current.clientWidth) * duration,
        0,
        duration - offsetStart,
      );

      onChange({
        offsetStart,
        offsetEnd: newOffsetEnd,
      });

      audio.pause();
      audio.setTime(duration - newOffsetEnd - 10);
    },
    onEnd: () => audio.play(),
    prev: offsetEnd,
  });

  const [windowDragProps, movingWindow] = useDragDetector({
    onMove: ({ dx, prev }) => {
      if (!chartRef.current) return;

      const newVals = {
        offsetStart: clamp(
          prev.offsetStart + (dx / chartRef.current.clientWidth) * duration,
          0,
          duration,
        ),
        offsetEnd: clamp(
          prev.offsetEnd - (dx / chartRef.current.clientWidth) * duration,
          0,
          duration,
        ),
      };
      onChange(newVals);
      audio.pause();
      audio.setTime(newVals.offsetStart);
    },
    onEnd: () => audio.play(),
    prev: { offsetStart, offsetEnd },
  });

  return (
    <div
      style={{
        padding: "5px 0",
        borderRadius: 4,
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: chartHeight,
        }}
        ref={chartRef}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${(offsetStart / duration) * 100}%`,
            width: `${((duration - offsetEnd - offsetStart) / duration) * 100}%`,
            height: "100%",
            backgroundColor: colorText,
            opacity: 0.25,
            cursor: movingWindow ? "grabbing" : "grab",
            userSelect: "none",
            zIndex: 5,
          }}
          {...windowDragProps}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${(offsetStart / duration) * 100}%`,
            width: 5,
            height: "100%",
            transform: "translateX(-100%)",
            cursor: movingStart ? "grabbing" : "ew-resize",
            userSelect: "none",
            zIndex: 5,
          }}
          {...startDragProps}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            right: `${(offsetEnd / duration) * 100}%`,
            width: 5,
            height: "100%",
            transform: "translateX(100%)",
            cursor: movingEnd ? "grabbing" : "ew-resize",
            userSelect: "none",
            zIndex: 5,
          }}
          {...endDragProps}
        />

        <Flex
          justify="space-between"
          align="center"
          style={{
            position: "relative",
            width: "100%",
            height: chartHeight,
          }}
        >
          <BarChart
            chart={processedChart}
            chartHeight={chartHeight}
            colorText={colorText}
          />
        </Flex>

        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${(audio.time / duration) * 100}%`,
            width: 1,
            height: "100%",
            transform: "translateX(-50%)",
            backgroundColor: colorText,
            opacity: 0.5,
          }}
        />
      </div>

      <Flex
        style={{
          position: "relative",
          width: `calc(${((duration - offsetStart - offsetEnd) / duration) * 100}%)`,
          left: `calc(${(offsetStart / duration) * 100}%)`,
          marginTop: 5,
        }}
        vertical
        gap={5}
      >
        <div style={{ position: "relative", height: scrubHeight }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: "translateX(-100%)",
              width: 2,
              height: "100%",
              backgroundColor: colorText,
              opacity: 0.5,
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              width: "100%",
              height: 2,
              transform: "translateY(-50%)",
              backgroundColor: colorText,
              opacity: 0.5,
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              transform: "translateX(100%)",
              width: 2,
              height: "100%",
              backgroundColor: colorText,
              opacity: 0.5,
            }}
          />

          <div
            style={{
              position: "absolute",
              left: `${((audio.time - offsetStart) / (duration - offsetStart - offsetEnd)) * 100}%`,
              width: 1,
              height: "100%",
              transform: "translateX(-50%)",
              backgroundColor: colorText,
            }}
          />
        </div>

        <Flex justify="center" align="center" gap={5}>
          <Button
            icon={<StepBackwardOutlined />}
            onClick={() => {
              audio.setTime(offsetStart);
              audio.play();
            }}
          />

          <Button
            icon={audio.playing ? <PauseOutlined /> : <CaretRightFilled />}
            onClick={() => {
              if (audio.playing) {
                audio.pause();
              } else {
                audio.play();
              }
            }}
          />

          <Button
            icon={<StepForwardOutlined />}
            onClick={() => {
              audio.setTime(duration - offsetEnd - 10);
              audio.play();
            }}
          />
        </Flex>
      </Flex>

      <audio ref={audioRef}>
        <source src={src} type="audio/flac" />
      </audio>
    </div>
  );
}
