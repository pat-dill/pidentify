import { ReactNode } from "react";
import { Flex } from "antd";
import { FloatingCurrentTrack } from "@/features/NowPlaying/FloatingCurrentTrack";

export default function Layout({ children }: { children?: ReactNode }) {
  return (
    <>
      <Flex justify="space-around">
        <div
          style={{
            width: "100%",
            maxWidth: 1060,
            padding: "16px 16px",
          }}
        >
          {children}
        </div>
      </Flex>
    </>
  );
}
