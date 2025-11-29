"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CSSProperties, Fragment, useEffect, useState } from "react";
import HistoryEntry from "@/features/History/HistoryEntry";
import { HistoryEntryT } from "@/schemas";
import { formatDurationLong } from "@/utils/formatDurationShort";
import dayjs from "dayjs";
import { useHistory } from "@/api/history/getHistory";
import { useStatus } from "@/contexts/StatusContext";
import { Link } from "next-view-transitions";
import { Flex, Typography } from "antd";
import useAutoLoadMore from "@/utils/useAutoLoadMore";
import useSafeClientSplit from "@/utils/useSafeClientSplit";
import { PlusOutlined } from "@ant-design/icons";
import { ManualEntryModal } from "./ManualEntryModal";

export default function History({ style }: { style?: CSSProperties }) {
  const queryClient = useQueryClient();

  const status = useStatus();
  const history = useHistory();

  useAutoLoadMore(
    history,
    useSafeClientSplit(() => document.documentElement, undefined),
  );

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["history"],
    });
  }, [status?.track?.track_id]);

  const entries = history.data?.pages?.map((page) => page.data).flat() || [];

  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  return (
    <>
      <Flex
        vertical
        style={{
          ...style,
        }}
      >
        <Typography.Title
          level={4}
          style={{ opacity: 0.9, viewTransitionName: "history-title" }}
        >
          <Flex align="center" justify="space-between">
            <span>History</span>

            <button
              onClick={() => setManualEntryOpen(true)}
              style={{ fontSize: 16, marginRight: 3 }}
            >
              <PlusOutlined />
            </button>
          </Flex>
        </Typography.Title>

        <Flex vertical gap={6}>
          {entries.map((entry: HistoryEntryT, idx, entries) => {
            const prevEntry = entries[idx - 1];
            if (entry.entry_id === prevEntry?.entry_id) return;

            let timeMarker: string | null = null;
            if (idx > 0) {
              const secondsSinceDetected =
                (new Date().valueOf() - dayjs(entry.detected_at).valueOf()) /
                1000;
              const prevSecondsSinceDetected =
                (new Date().valueOf() -
                  dayjs(prevEntry.detected_at).valueOf()) /
                1000;

              const roundTo = 3600;
              const sinceDetected = formatDurationLong(
                Math.floor(secondsSinceDetected / roundTo) * roundTo,
              );
              const prevSinceDetected = formatDurationLong(
                Math.floor(prevSecondsSinceDetected / roundTo) * roundTo,
              );

              if (sinceDetected !== prevSinceDetected) {
                timeMarker = sinceDetected;
              }
            }

            return (
              <Fragment key={entry.entry_id}>
                {timeMarker && (
                  <div className="flex items-center justify-center gap-2 select-none">
                    <div className="flex-grow h-[1px] bg-current opacity-40" />
                    <Typography.Text style={{ opacity: 0.75 }}>
                      {timeMarker} ago
                    </Typography.Text>
                    <div className="flex-grow h-[1px] bg-current opacity-40" />
                  </div>
                )}
                <HistoryEntry entry={entry} />
              </Fragment>
            );
          })}
        </Flex>
      </Flex>

      <ManualEntryModal
        open={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
      />
    </>
  );
}
