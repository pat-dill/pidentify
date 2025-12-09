"use client";

import { HistoryEntryT } from "@/schemas";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Card, Flex, Typography } from "antd";
import { Link } from "next-view-transitions";
import HistoryEntryDropdown from "@/features/History/HistoryEntryDropdown";

export default function HistoryEntry({
  entry,
  isPendingSelect,
  isSelected,
  ...rest
}: {
  entry: HistoryEntryT;
  isPendingSelect?: boolean;
  isSelected?: boolean;
  [key: string]: any;
}) {
  const imgRef = useRef<HTMLImageElement>(undefined!);
  const [imgSrc, setImgSrc] = useState("");

  useEffect(() => {
    setImgSrc(imgRef?.current?.src || "");

    // just in case the transition gets missed? idk why this happens
    setTimeout(() => {
      setImgSrc(imgRef?.current?.src || "");
    }, 500);
  });

  return (
    <ThemeProvider sourceUrl={imgSrc}>
      <Card
        styles={{ body: { padding: 0 } }}
        style={{
          viewTransitionName: `history-entry-${entry.entry_id}`,
          position: "relative",
          outline: isPendingSelect || isSelected ? "2px solid #1677ff" : "none",
        }}
        {...rest}
      >
        <Flex align="center" gap={8} style={{ paddingRight: 16 }}>
          <Image
            className="aspect-square flex-none"
            width={48}
            height={48}
            src={entry.track.track_image || ""}
            ref={imgRef}
            alt={entry.track.track_name || ""}
            crossOrigin="anonymous"
          />

          <Flex vertical>
            <Typography
              style={{
                fontSize: 12,
                opacity: 0.75,
                fontWeight: 500,
                marginBottom: 5,
                lineHeight: 1,
              }}
              className="line-clamp-1"
            >
              {entry.track.artist_name || "Unknown artist"}
            </Typography>

            <Link href={entry.track.last_fm?.url || "#"}>
              <Typography
                style={{
                  fontSize: 16,
                  opacity: 0.9,
                  fontWeight: 500,
                  lineHeight: 1,
                }}
                className="line-clamp-1"
              >
                {entry.track.track_name}
              </Typography>
            </Link>
          </Flex>
        </Flex>

        <HistoryEntryDropdown entry={entry} />
      </Card>
    </ThemeProvider>
  );
}
