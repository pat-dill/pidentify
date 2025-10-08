"use client";

import History from "@/features/History/History";
import { FloatingCurrentTrack } from "@/features/NowPlaying/FloatingCurrentTrack";
import { Flex } from "antd";

export function HistoryPage() {
  return (
    <>
      <Flex justify="space-around">
        <div
          style={{
            width: "100%",
            maxWidth: 720,
          }}
        >
          <History style={{ padding: "24px 16px" }} />
        </div>
      </Flex>

      <FloatingCurrentTrack />
    </>
  );
}
