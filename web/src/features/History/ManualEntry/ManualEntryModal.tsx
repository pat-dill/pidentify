import { useHistoryAlbums } from "@/api/history/getHistoryAlbums";
import { useHistoryArtists } from "@/api/history/getHistoryArtists";
import { AutoThemeProvider, ThemeProvider } from "@/contexts/ThemeContext";
import { useAnimationFrame } from "@/utils/useAnimationFrame";
import { AutoComplete, Flex, Form, Input, InputNumber, Modal } from "antd";
import { useEffect, useMemo, useState } from "react";
import { TrackBoundsInput, TrackBoundsValue } from "./TrackBoundsInput";
import dayjs from "dayjs";
import { useStatus } from "@/contexts/StatusContext";
import {
  addHistoryEntry,
  useAddHistoryEntry,
} from "@/api/history/addHistoryEntry";

export type ManualEntryFormFields = {
  trackBounds: TrackBoundsValue;
  trackNo: number;
  trackName: string;
  albumName: string;
  artistName: string;
  trackImage: string;
  artistImage: string;
};

type ManualEntryModalProps = {
  open: boolean;
  onClose: () => void;
  initialValues?: Partial<ManualEntryFormFields>;
};

export function ManualEntryModal({
  initialValues: initialValuesProp,
  open,
  onClose,
}: ManualEntryModalProps) {
  const [form] = Form.useForm<ManualEntryFormFields>();

  const initialValues = useMemo(
    () => ({
      trackBounds: {
        startedAt: dayjs().subtract(1, "minute").toDate(),
        duration: 60,
      },
      ...initialValuesProp,
    }),
    [open, initialValuesProp],
  );

  const [formOpenedAt] = useState<Date>(new Date());

  useEffect(() => {
    form.resetFields();
  }, [open]);

  const artistName = Form.useWatch("artistName", form);

  const { data: albums } = useHistoryAlbums({
    enabled: open,
  });

  const sameArtistAlbums = useMemo(() => {
    return albums?.data.filter((album) => album.artist === artistName) ?? [];
  }, [albums, artistName]);

  const albumOptions = useMemo(() => {
    return sameArtistAlbums.map((album) => ({
      label: album.album,
      value: album.album,
    }));
  }, [sameArtistAlbums]);

  const { data: artists } = useHistoryArtists({ enabled: open });
  const artistOptions = useMemo(() => {
    return artists?.data.map((artist) => ({
      label: artist.artist,
      value: artist.artist,
    }));
  }, [artists]);

  const status = useStatus();
  const trackImage = Form.useWatch("trackImage", form);

  const addHistoryEntryMut = useAddHistoryEntry({
    onSuccess: () => {
      onClose();
    },
  });

  const submitForm = (values: ManualEntryFormFields) => {
    const {
      trackBounds,
      trackNo,
      trackName,
      albumName,
      artistName,
      trackImage,
      artistImage,
    } = values;
    const { startedAt, duration } = trackBounds;

    addHistoryEntryMut.mutate({
      started_at: startedAt,
      duration_seconds: duration,
      track_name: trackName,
      track_no: trackNo,
      album_name: albumName,
      artist_name: artistName,
      track_image: trackImage,
      artist_image: artistImage,
    });
  };

  return (
    <ThemeProvider sourceUrl={trackImage || status?.track?.track_image}>
      <Modal
        open={open}
        onCancel={onClose}
        destroyOnHidden={true}
        onOk={() => form.submit()}
        title="Add Undetected Track"
      >
        <Form
          form={form}
          initialValues={initialValues}
          onFinish={submitForm}
          layout="vertical"
        >
          <Form.Item
            name="trackBounds"
            style={{ width: "100%", marginBottom: 0 }}
          >
            <TrackBoundsInput anchorTime={formOpenedAt} />
          </Form.Item>

          <Flex gap={5} style={{ width: "100%" }}>
            <Form.Item
              label="Artist"
              name="artistName"
              rules={[{ required: true }]}
              style={{ width: "50%" }}
            >
              <AutoComplete
                options={artistOptions}
                onSelect={(value) => {
                  const artist = artists?.data.find(
                    (artist) => artist.artist === value,
                  );
                  if (artist) {
                    form.setFieldValue(
                      "artistImage",
                      artist.artist_image_url ?? "",
                    );
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              label="Album"
              name="albumName"
              rules={[{ required: true }]}
              style={{ width: "50%" }}
            >
              <AutoComplete
                options={albumOptions}
                onSelect={(value) => {
                  const trackImage = sameArtistAlbums.find(
                    (album) => album.album === value,
                  )?.album_image_url;
                  if (trackImage) {
                    form.setFieldValue("trackImage", trackImage);
                  }
                }}
              />
            </Form.Item>
          </Flex>

          <Flex gap={5} style={{ width: "100%" }}>
            <Form.Item
              name="trackNo"
              label="Track No."
              rules={[{ required: true }]}
              style={{ width: 100 }}
            >
              <InputNumber<number> style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label="Name"
              name="trackName"
              rules={[{ required: true }]}
              style={{ flexGrow: 1 }}
            >
              <Input style={{ width: "100%" }} />
            </Form.Item>
          </Flex>

          <Form.Item label="Track Image" name="trackImage" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="Artist Image" name="artistImage" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </ThemeProvider>
  );
}
