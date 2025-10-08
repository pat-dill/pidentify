"use client";

import { useStatus } from "@/contexts/StatusContext";
import { theme, Typography } from "antd";

export default function Debug() {
  const status = useStatus();

  const {
    token: { colorBgBase },
  } = theme.useToken();

  return (
    <Typography.Text
      style={{
        position: "fixed",
        top: 10,
        left: 10,
        fontFamily: "Geist Mono",
        color: colorBgBase,
        fontSize: 12,
      }}
    >
      {status?.rms != null && <p>RMS: {status?.rms?.toFixed(6)}</p>}
    </Typography.Text>
  );
}
