"use client";

import { createPortalContext } from "@/utils/portalContext";
import { ReactNode, useEffect, useState } from "react";
import { useAnimationFrame } from "@/utils/useAnimationFrame";
import dayjs from "dayjs";
import useSafeClientSplit from "@/utils/useSafeClientSplit";
import { Flex, Space, theme } from "antd";

export const toastPortal = createPortalContext();

interface ToastProps {
  endsAt?: Date | dayjs.Dayjs;
  children?: ReactNode;
  opacity?: number;
  barHeight?: number;
}

export function Toast(props: ToastProps) {
  const { endsAt, children, opacity = 0.7, barHeight = 3 } = props;

  const {
    token: { colorText },
  } = theme.useToken();

  const [show, setShow] = useState(true);
  const [startedAt, setStartedAt] = useState<Date>();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (show) setStartedAt(new Date());
  }, [show]);

  useAnimationFrame(() => {
    if (startedAt && endsAt) {
      if (new Date().valueOf() > endsAt.valueOf()) {
        setShow(false);
      } else {
        setShow(true);
        setProgress(
          (new Date().valueOf() - startedAt.valueOf()) /
            (endsAt.valueOf() - startedAt.valueOf()),
        );
      }
    } else {
      setShow(true);
    }
  });

  const isClient = useSafeClientSplit(true, false);

  if (!isClient || !show) return;

  return (
    <toastPortal.Portal>
      <Flex vertical style={{ width: "100%", opacity, position: "relative" }}>
        <Space style={{ padding: "8px 0 10px 0", display: "block" }}>
          {children}
        </Space>

        {endsAt && (
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: "100%",
              height: barHeight,
            }}
          >
            <div
              style={{
                bottom: 0,
                left: 0,
                width: `${progress * 100}%`,
                height: "100%",
                background: colorText,
              }}
            />
          </div>
        )}
      </Flex>
    </toastPortal.Portal>
  );
}
