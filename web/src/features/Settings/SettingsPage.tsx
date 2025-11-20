"use client";

import { FloatingCurrentTrack } from "@/features/NowPlaying/FloatingCurrentTrack";
import { Flex, Typography } from "antd";
import { SoundSettingsForm } from "./SoundSettings";
import { AudioOutlined } from "@ant-design/icons";
import { FormSection } from "./FormSection";

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
            <FormSection
              title="Audio"
              description="Configure the input audio device"
              icon={<AudioOutlined />}
            >
              <SoundSettingsForm />
            </FormSection>
          </Flex>
        </div>
      </Flex>

      {/* <FloatingCurrentTrack /> */}
    </>
  );
}
