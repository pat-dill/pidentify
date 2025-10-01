import dayjs from "dayjs";
import { Typography } from "antd";
import { Toast } from "@/components/Toast";
import { useStatus } from "@/contexts/StatusContext";

export function ScanningToast() {
  const status = useStatus();

  // const barHeight = useSpring(
  //   status?.rms ? status.rms * 75 : 3
  // )

  return (
    status?.scan_ends && (
      <Toast
        endsAt={dayjs(status.scan_ends)}
        // barHeight={barHeight}
      >
        <Typography.Text style={{ fontFamily: "Geist Mono, monospace" }}>
          listening for music...
        </Typography.Text>
      </Toast>
    )
  );
}
