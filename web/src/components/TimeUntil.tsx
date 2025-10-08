"use client";

import { useState } from "react";
import { formatDurationLong } from "@/utils/formatDurationShort";
import { useAnimationFrame } from "@/utils/useAnimationFrame";
import dayjs from "dayjs";

export function TimeUntil({ date }: { date: Date | dayjs.Dayjs }) {
  const [now, setNow] = useState<Date>();

  useAnimationFrame(() => {
    setNow(new Date());
  });

  return now
    ? formatDurationLong(Math.ceil((date.valueOf() - now.valueOf()) / 1000))
    : undefined;
}
