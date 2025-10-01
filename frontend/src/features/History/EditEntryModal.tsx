import { HistoryEntryT } from "@/schemas";
import { Flex, Form, Input, InputNumber, Modal, Typography } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateHistoryEntries } from "@/api/history/updateHistoryEntries";
import { useEffect } from "react";

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
};

export function EditEntryModal({
  entry,
  showing,
  setShowing,
}: EditEntryModalProps) {
  const queryClient = useQueryClient();

  const [form] = Form.useForm<FormFields>();
  const initialValues = {
    track_name: entry.track_name || "",
    album_name: entry.album_name || "",
    artist_name: entry.artist_name || "",
    duration_seconds: entry.duration_seconds || null,
  };

  const editEntryMut = useMutation({
    mutationFn: async (values: FormFields) => {
      await updateHistoryEntries(entry.entry_id, values);
      queryClient.invalidateQueries({
        queryKey: ["history"],
      });
    },
  });

  useEffect(() => {
    if (showing) form.resetFields();
  }, [entry, showing]);

  return (
    <Modal
      open={showing}
      onCancel={() => setShowing(false)}
      onOk={() => {
        form.submit();
      }}
      okButtonProps={{ variant: "solid", color: "default" }}
    >
      <Typography.Title level={4}>Edit "{entry.track_name}"</Typography.Title>

      <Form
        form={form}
        initialValues={initialValues}
        layout="vertical"
        onFinish={async (values) => {
          await editEntryMut.mutate(values);
          setShowing(false);
        }}
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
            label="Album"
            name="album_name"
            rules={[{ required: true }]}
            style={{ width: "50%", margin: 0 }}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Artist"
            name="artist_name"
            rules={[{ required: true }]}
            style={{ width: "50%", margin: 0 }}
          >
            <Input />
          </Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
}
