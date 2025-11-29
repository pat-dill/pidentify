"use client";

import { usePlugins } from "@/api/settings/getPlugins";
import { Flex, Form, Input, Select } from "antd";

export function AppConnectionsForm() {
  const { data: plugins } = usePlugins();

  return (
    <>
      <Form.Item
        label="last.fm API key"
        name="last_fm_key"
        rules={[{ required: true, message: "Enter your API key for last.fm" }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item label="Music ID plugin" name="music_id_plugin">
        <Select
          options={
            plugins?.map((plugin) => ({ label: plugin, value: plugin })) ?? []
          }
          allowClear
        />
      </Form.Item>
    </>
  );
}
