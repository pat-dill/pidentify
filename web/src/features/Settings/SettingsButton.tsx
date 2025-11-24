"use client";

import { theme, Typography } from "antd";
import Link from "next/link";
import { SettingOutlined } from "@ant-design/icons";
import { useClientConfig } from "@/api/getClientConfig";

export function SettingsButton() {
  const {
    token: { colorBgBase },
  } = theme.useToken();

  const { data: clientConfig } = useClientConfig();

  if (!clientConfig?.is_admin) {
    return null;
  }

  return (
    <Typography.Text>
      <Link href="/settings" style={{ color: colorBgBase }}>
        <SettingOutlined style={{ fontSize: 16 }} />
      </Link>
    </Typography.Text>
  );
}
