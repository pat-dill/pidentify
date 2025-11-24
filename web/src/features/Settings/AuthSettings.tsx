"use client";

import { Flex, Form, Input, InputNumber, Select } from "antd";

import { useMemo } from "react";

export function AuthSettingsForm() {

  return (
    <>
      <Form.Item label="Username" name="admin_username" rules={[{ required: true, message: "Please enter your username" }]}>
        <Input
          placeholder="Username"
        />
      </Form.Item>

      <Flex gap={12} justify="space-between">
        <Form.Item label="Current Password" name="old_password" style={{ width: "50%" }}>
          <Input.Password
            placeholder="Current Password"
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item label="New Password" name="new_password" style={{ width: "50%" }}>
          <Input.Password
            placeholder="New Password"
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Flex>
    </>
  );
}
