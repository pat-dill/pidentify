"use client";

// import Settings from "@/features/Settings/Settings";
import { FloatingCurrentTrack } from "@/features/NowPlaying/FloatingCurrentTrack";
import { Flex, Typography } from "antd";
import { SoundSettingsForm } from "./SoundSettings";
import { AudioOutlined } from "@ant-design/icons";
import { Section } from "./Section";

export function SettingsPage() {
  return (
    <>
      <Flex justify="space-around">
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            padding: "24px 16px",
          }}
        >
          <Typography.Title
            level={4}
            style={{ opacity: 0.9, marginBottom: 16 }}
          >
            Settings
          </Typography.Title>

          <Flex vertical gap={8}>
            <Section
              title="Sound"
              description="Configure the input sound device"
              icon={<AudioOutlined />}
            >
              <SoundSettingsForm />
            </Section>
          </Flex>
        </div>
      </Flex>

      {/* <FloatingCurrentTrack /> */}
    </>
  );
}
