"use client";

import { useSettings } from "@/api/settings/getSettings";
import { Flex, Form, Input } from "antd";

export function AuthSettingsForm() {
  const { data: settings } = useSettings();

  return (
    <>
      <Form.Item
        label="Username"
        name="admin_username"
        rules={[{ required: true, message: "Please enter your username" }]}
      >
        <Input placeholder="Username" />
      </Form.Item>

      <Flex gap={12} justify="space-between">
        <Form.Item
          label="Current Password"
          name="old_password"
          style={{ width: "50%" }}
          hidden={!settings?.has_password}
        >
          <Input.Password
            placeholder="Current Password"
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          label="New Password"
          name="new_password"
          style={{ width: settings?.has_password ? "50%" : "100%" }}
        >
          <Input.Password
            placeholder="New Password"
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Flex>
    </>
  );
}
