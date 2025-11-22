"use client";

import { Button, Card, Flex, Form, Input, InputNumber, message, Typography } from "antd";
import { useRipEntry } from "@/api/rip/getRip";
import { useParams } from "next/navigation";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AudioClipInput } from "@/features/RipSongTool/AudioClipInput";
import { useAudioData } from "@/api/rip/getAudioFrames";
import { useEffect, useRef, useState } from "react";
import { useClientConfig } from "@/api/getClientConfig";
import { useFloatingStatus } from "@/features/NowPlaying/FloatingCurrentTrack";
import { useSaveRipToLibrary } from "@/api/rip/saveRipToLibrary";
import { useTransitionRouter } from "next-view-transitions";

type FormFields = {
  trackName: string;
  album: string;
  artist: string;
  trackNumber: number | null;
};

export function RipSongPage() {
  const { id: entryId }: { id: string } = useParams();
  const { data: ripMeta } = useRipEntry({ entryId, suspend: true });
  const { data: config } = useClientConfig({ suspend: true });

  const router = useTransitionRouter();

  const [form] = Form.useForm<FormFields>();

  const entry = ripMeta?.history_entry;

  const initialFormValues = {
    trackName: entry?.track.track_name || "",
    album: entry?.track.album_name || "",
    artist: entry?.track.artist_name || "",
    trackNumber: entry?.track.track_no || null,
  };

  const trackTitle = Form.useWatch("track_name", form);

  const [chartParts, setChartParts] = useState(0);
  const { data: frames } = useAudioData({
    entryId,
    chartParts,
  });

  const [offsetStart, setOffsetStart] = useState(config?.temp_save_offset || 0);
  const [offsetEnd, setOffsetEnd] = useState(config?.temp_save_offset || 0);

  const floatingStatus = useFloatingStatus();
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (cardRef.current) {
      const availWidth =
        (window.innerWidth - cardRef.current.offsetWidth) / 2 - 32;
      if (floatingStatus.size.width > availWidth) {
        floatingStatus.setSize({ width: availWidth });
      }
    }
  }, [!!cardRef.current]);

  const saveRipToLibraryMut = useSaveRipToLibrary({
    onSuccess: () => {
      router.push(`/`);
    },
  });

  const submitForm = async (values: FormFields) => {
    const { trackName, album, artist, trackNumber } = values;
    const trackNo = trackNumber ? parseInt(trackNumber) : 1;
    saveRipToLibraryMut.mutate({
      buffer_id: entryId,
      data: {
        track_name: trackName,
        album_name: album,
        artist_name: artist,
        track_no: trackNo,
        start_offset: offsetStart,
        end_offset: offsetEnd,
      },
    });
  };

  if (!ripMeta) return;
  return (
    <ThemeProvider sourceUrl={entry?.track.track_image}>
      <Card
        style={{
          width: "100%",
        }}
        ref={cardRef}
        cover={
          entry ? (
            <img
              src={entry?.track.artist_image || ""}
              alt="Track background"
              style={{
                width: "100%",
                aspectRatio: 5,
                objectFit: "cover",
                objectPosition: "50% 40%",
              }}
            />
          ) : null
        }
        actions={[
          <Button key="save" onClick={() => form.submit()}>
            Save to Library
          </Button>,
        ]}
      >
        <Typography.Title level={4} style={{ opacity: 0.9 }}>
          Rip Track
        </Typography.Title>

        <Form
          form={form}
          layout="vertical"
          initialValues={initialFormValues}
          size="small"
          onFinish={submitForm}
        >
          <Flex gap={5} style={{ width: "100%", marginBottom: 10 }}>
            <Form.Item
              label="Track Title"
              name="trackName"
              style={{ marginBottom: 0, flexGrow: 1 }}
              rules={[{ required: true, message: "Track title is required" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="No."
              name="trackNumber"
              style={{ marginBottom: 0, width: 60 }}
            >
              <InputNumber min={1} placeholder="1" style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label="Album"
              name="album"
              style={{ marginBottom: 0, flexGrow: 1 }}
              rules={[{ required: true, message: "Album is required" }]}
            >
              <Input placeholder={trackTitle} />
            </Form.Item>

            <Form.Item
              label="Artist"
              name="artist"
              style={{ marginBottom: 0, flexGrow: 1 }}
              rules={[{ required: true, message: "Artist is required" }]}
            >
              <Input />
            </Form.Item>
          </Flex>

          <AudioClipInput
            offsetStart={offsetStart}
            offsetEnd={offsetEnd}
            onChange={({ offsetStart, offsetEnd }) => {
              setOffsetStart(offsetStart);
              setOffsetEnd(offsetEnd);
            }}
            chart={frames?.chart ?? []}
            duration={frames?.duration ?? 0}
            src={`/api/rip/${entryId}/audio.flac`}
            onSetChartParts={setChartParts}
          />
        </Form>
      </Card>
    </ThemeProvider>
  );
}
