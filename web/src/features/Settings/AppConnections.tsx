"use client";

import { Flex, Form, Input } from "antd";

export function AppConnectionsForm() {
  return (
    <>
      <Form.Item
        label="last.fm API key"
        name="last_fm_key"
        rules={[{ required: true, message: "Enter your API key for last.fm" }]}
      >
        <Input.Password />
      </Form.Item>
    </>
  );
}
