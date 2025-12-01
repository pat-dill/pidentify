import { HistoryEntryT } from "@/schemas";
import {
  AutoComplete,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Typography,
} from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateHistoryEntries } from "@/api/history/updateHistoryEntries";
import { useEffect, useMemo } from "react";
import { useHistoryAlbums } from "@/api/history/getHistoryAlbums";
import { useHistoryArtists } from "@/api/history/getHistoryArtists";

type EditEntryModalProps = {
  entry: HistoryEntryT;
  showing?: boolean;
  setShowing: (showing: boolean) => void;
};

type FormFields = {
  track_name: string;
  album: string;
  artist: string;
  duration: number;
  track_image: string;
  artist_image: string;
};

export function EditEntryModal({
  entry,
  showing,
  setShowing,
}: EditEntryModalProps) {
  const queryClient = useQueryClient();

  const [form] = Form.useForm<FormFields>();
  const initialValues = {
    track_name: entry.track.track_name || "",
    album_name: entry.track.album_name || "",
    artist_name: entry.track.artist_name || "",
    duration_seconds: entry.track.duration_seconds || null,
    track_image: entry.track.track_image || "",
    artist_image: entry.track.artist_image || "",
  };

  const artistName = Form.useWatch("artist_name", form);

  const editEntryMut = useMutation({
    mutationFn: async (values: FormFields) => {
      await updateHistoryEntries(entry.entry_id, values);
      queryClient.invalidateQueries({
        queryKey: ["history"],
      });
      setShowing(false);
    },
  });

  const { data: albums } = useHistoryAlbums({
    enabled: showing,
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

  const { data: artists } = useHistoryArtists({ enabled: showing });
  const artistOptions = useMemo(() => {
    return artists?.data.map((artist) => ({
      label: artist.artist,
      value: artist.artist,
    }));
  }, [artists]);

  return (
    <Modal
      open={showing}
      onCancel={() => setShowing(false)}
      onOk={() => {
        form.submit();
      }}
      okButtonProps={{ variant: "solid", color: "default" }}
      destroyOnHidden={true}
    >
      <Typography.Title level={4}>
        Edit "{entry.track.track_name}"
      </Typography.Title>

      <Form
        form={form}
        initialValues={initialValues}
        layout="vertical"
        onFinish={editEntryMut.mutate}
      >
        <Flex gap={5} style={{ width: "100%", marginBottom: 10 }}>
          <Form.Item
            label="Track"
            name="track_name"
            rules={[{ required: true }]}
            style={{ flexGrow: 1, margin: 0 }}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Duration"
            name="duration_seconds"
            style={{ margin: 0 }}
          >
            <InputNumber<number>
              min={0}
              formatter={(duration) => {
                return duration
                  ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60)
                    .toString()
                    .padStart(2, "0")}`
                  : "";
              }}
              parser={(val) => {
                if (!val) return null as unknown as number;
                let [mins, secs] = val.split(":");
                secs = secs.replace(/^0/, "").slice(0, 2);
                return parseFloat(mins) * 60 + parseFloat(secs);
              }}
              placeholder="Unknown"
            />
          </Form.Item>
        </Flex>
        <Flex gap={5} style={{ width: "100%", marginBottom: 10 }}>
          <Form.Item
            label="Artist"
            name="artist_name"
            rules={[{ required: true }]}
            style={{ width: "50%", margin: 0 }}
          >
            <AutoComplete options={artistOptions}
              onSelect={(value) => {
                const artist = artists?.data.find(
                  (artist) => artist.artist === value,
                );
                if (artist) {
                  form.setFieldValue("artist_image", artist.artist_image_url ?? "");
                }
              }} />
          </Form.Item>

          <Form.Item
            label="Album"
            name="album_name"
            rules={[{ required: true }]}
            style={{ width: "50%", margin: 0 }}
          >
            <AutoComplete
              options={albumOptions}
              onSelect={(value) => {
                const trackImage = sameArtistAlbums.find(
                  (album) => album.album === value,
                )?.album_image_url;
                if (trackImage) {
                  form.setFieldValue("track_image", trackImage);
                }
              }}
            />
          </Form.Item>
        </Flex>

        <Form.Item label="Track Image" name="track_image" hidden>
          <Input />
        </Form.Item>
        <Form.Item label="Artist Image" name="artist_image" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
