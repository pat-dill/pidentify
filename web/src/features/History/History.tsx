"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import {
  ManualEntryFormFields,
  ManualEntryModal,
} from "./ManualEntry/ManualEntryModal";
import { useSessionStorage } from "react-use";
import useSelection from "@/utils/useSelection";
import {
  useDeleteHistoryEntries,
  useDeleteHistoryEntry,
} from "@/api/history/deleteHistoryEntry";
import { EditEntryModal } from "./EditEntryModal";

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

  const entries = useMemo(
    () => history.data?.pages?.map((page) => page.data).flat() || [],
    [history.data?.pages],
  );

  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntryInitialValues, setManualEntryInitialValues] = useState<
    Partial<ManualEntryFormFields>
  >({});
  const [timeMarker, setTimeMarker] = useSessionStorage<number>("timeMarker");

  const startManualEntry = useCallback(() => {
    const initialValues: Partial<ManualEntryFormFields> = {};

    let lastTrackEnded: number | null = null;

    if (
      entries.length > 0 &&
      entries[0].started_at &&
      entries[0].track?.duration_seconds
    ) {
      lastTrackEnded = dayjs(entries[0].started_at)
        .add(entries[0].track.duration_seconds, "seconds")
        .valueOf();
    }

    if (timeMarker && (!lastTrackEnded || lastTrackEnded < timeMarker)) {
      initialValues.trackBounds = {
        startedAt: new Date(timeMarker),
        duration: (new Date().valueOf() - timeMarker) / 1000,
      };
    } else if (lastTrackEnded) {
      initialValues.trackBounds = {
        startedAt: new Date(lastTrackEnded),
        duration: (new Date().valueOf() - lastTrackEnded) / 1000,
      };
    }

    setManualEntryInitialValues(initialValues);
    setManualEntryOpen(true);
  }, [entries, timeMarker]);

  const entryIds = useMemo(
    () => entries.map((entry) => entry.entry_id),
    [entries],
  );
  const [selected, setSelected, pendingSelection, getSelectProps] =
    useSelection(entryIds);

  const [showEditModal, setShowEditModal] = useState(false);
  const deleteHistoryEntriesMut = useDeleteHistoryEntries();

  const editingEntries = useMemo(
    () => entries.filter((entry) => selected.has(entry.entry_id)),
    [entries, selected],
  );

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
              onClick={startManualEntry}
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

            const isPendingSelect = pendingSelection.has(entry.entry_id);
            const isSelected = selected.has(entry.entry_id);

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
                <HistoryEntry
                  entry={entry}
                  isPendingSelect={isPendingSelect}
                  isSelected={isSelected}
                  onEdit={() => {
                    if (!selected.has(entry.entry_id)) {
                      if (selected.size <= 1) {
                        setSelected(new Set([entry.entry_id]));
                      } else {
                        setSelected(new Set([...selected, entry.entry_id]));
                      }
                    }
                    setShowEditModal(true);
                  }}
                  onDelete={() => {
                    if (selected.has(entry.entry_id)) {
                      deleteHistoryEntriesMut.mutate(Array.from(selected));
                    } else {
                      deleteHistoryEntriesMut.mutate([entry.entry_id]);
                    }
                  }}
                  {...getSelectProps(entry.entry_id)}
                />
              </Fragment>
            );
          })}
        </Flex>
      </Flex>

      <ManualEntryModal
        open={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        initialValues={manualEntryInitialValues}
      />

      <EditEntryModal
        entries={editingEntries}
        showing={showEditModal}
        setShowing={setShowEditModal}
      />
    </>
  );
}
