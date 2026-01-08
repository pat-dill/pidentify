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
import {
  updateHistoryEntries,
  UpdateHistoryOpts,
} from "@/api/history/updateHistoryEntries";
import { useEffect, useMemo } from "react";
import { useHistoryAlbums } from "@/api/history/getHistoryAlbums";
import { useHistoryArtists } from "@/api/history/getHistoryArtists";
import { getMixedAttr, isMixedAttr } from "@/utils/getMixedAttr";
import { getTouchedValues } from "@/utils/getTouchedValues";
import { ThemeProvider } from "@/contexts/ThemeContext";

type EditEntryModalProps = {
  entries: HistoryEntryT[];
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
  entries,
  showing,
  setShowing,
}: EditEntryModalProps) {
  const queryClient = useQueryClient();

  const [form] = Form.useForm<FormFields>();
  const initialValues = useMemo(
    () => ({
      track_name: getMixedAttr(entries, (entry) => entry.track.track_name, ""),
      album_name: getMixedAttr(entries, (entry) => entry.track.album_name, ""),
      artist_name: getMixedAttr(
        entries,
        (entry) => entry.track.artist_name,
        "",
      ),
      duration_seconds: getMixedAttr(
        entries,
        (entry) => entry.track.duration_seconds,
        null,
      ),
      track_image: getMixedAttr(
        entries,
        (entry) => entry.track.track_image,
        "",
      ),
      artist_image: getMixedAttr(
        entries,
        (entry) => entry.track.artist_image,
        "",
      ),
    }),
    [entries],
  );

  const mixedAttrs = useMemo(() => {
    return {
      track_name: isMixedAttr(entries, (entry) => entry.track.track_name),
      album_name: isMixedAttr(entries, (entry) => entry.track.album_name),
      artist_name: isMixedAttr(entries, (entry) => entry.track.artist_name),
      track_image: isMixedAttr(entries, (entry) => entry.track.track_image),
      artist_image: isMixedAttr(entries, (entry) => entry.track.artist_image),
    };
  }, [entries]);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue(initialValues);
  }, [showing, initialValues]);

  const artistName = Form.useWatch("artist_name", form);

  const editEntryMut = useMutation({
    mutationFn: async (values: FormFields) => {
      const changedValues = getTouchedValues(
        values,
        form,
        initialValues,
      ) as UpdateHistoryOpts;
      await updateHistoryEntries(
        entries.map((entry) => entry.entry_id),
        changedValues,
      );
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

  const isMultiEdit = entries.length > 1;

  return (
    <ThemeProvider sourceUrl={entries[0]?.track.track_image}>
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
          {entries.length > 1
            ? "Edit Entries"
            : `Edit "${entries[0]?.track.track_name}"`}
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
              rules={[{ required: !mixedAttrs.track_name }]}
              style={{ flexGrow: 1, margin: 0 }}
            >
              <Input
                placeholder={mixedAttrs.track_name ? "Mixed" : "Unknown"}
              />
            </Form.Item>

            <Form.Item
              label="Duration"
              name="duration_seconds"
              style={{ margin: 0 }}
              hidden={isMultiEdit}
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
              rules={[{ required: !mixedAttrs.artist_name }]}
              style={{ width: "50%", margin: 0 }}
            >
              <AutoComplete
                options={artistOptions}
                onSelect={(value) => {
                  const artist = artists?.data.find(
                    (artist) => artist.artist === value,
                  );
                  if (artist) {
                    form.setFieldValue(
                      "artist_image",
                      artist.artist_image_url ?? "",
                    );
                  }
                }}
                placeholder={mixedAttrs.artist_name ? "Mixed" : "Unknown"}
              />
            </Form.Item>

            <Form.Item
              label="Album"
              name="album_name"
              rules={[{ required: !mixedAttrs.album_name }]}
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
                placeholder={mixedAttrs.album_name ? "Mixed" : "Unknown"}
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
    </ThemeProvider>
  );
}
