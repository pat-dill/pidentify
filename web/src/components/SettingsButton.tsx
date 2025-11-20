"use client";

import { theme, Typography } from "antd";
import Link from "next/link";
import { SettingOutlined } from "@ant-design/icons";
import { useClientConfig } from "@/api/getClientConfig";

export default function SettingsButton() {
  const {
    token: { colorBgBase },
  } = theme.useToken();

  const { data: clientConfig } = useClientConfig();

  if (!clientConfig?.is_admin) {
    return null;
  }

  return (
    <Typography.Text
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        fontFamily: "Geist Mono",
        color: colorBgBase,
        fontSize: 16,
      }}
    >
      <Link href="/settings" style={{ color: colorBgBase }}>
        <SettingOutlined />
      </Link>
    </Typography.Text>
  );
}
