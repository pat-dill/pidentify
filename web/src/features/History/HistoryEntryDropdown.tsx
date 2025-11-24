"use client";

import { HistoryEntryT } from "@/schemas";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  DeleteOutlined,
  EditOutlined,
  ScissorOutlined,
} from "@ant-design/icons";
import { useStartHistoryEntryRip } from "@/api/rip/startHistoryEntryRip";
import { useQueryClient } from "@tanstack/react-query";
import { useAnimationFrame } from "@/utils/useAnimationFrame";
import { useClientConfig } from "@/api/getClientConfig";
import { Dropdown, MenuProps, theme, Tooltip } from "antd";
import { Link, useTransitionRouter } from "next-view-transitions";
import { getHistoryQuery } from "@/api/history/getHistory";
import { useDeleteHistoryEntry } from "@/api/history/deleteHistoryEntry";
import { EditEntryModal } from "@/features/History/EditEntryModal";

type HistoryEntryDropdownProps = {
  entry: HistoryEntryT;
  dotSize?: number;
};

export default function HistoryEntryDropdown({
  entry,
  dotSize = 4,
}: HistoryEntryDropdownProps) {
  const { data: clientConfig } = useClientConfig();
  const queryClient = useQueryClient();

  const [canSave, setCanSave] = useState(false);
  useAnimationFrame(() => {
    if (
      clientConfig?.can_save &&
      entry.started_at &&
      !entry.saved_temp_buffer
    ) {
      const now = new Date().valueOf();
      const startedAt = dayjs(entry.started_at).valueOf();
      const timeSinceStart = (now - startedAt) / 1000;

      setCanSave(timeSinceStart < (clientConfig?.buffer_length_seconds || 0));
    }
  });

  const hasUnfinishedRip = clientConfig?.can_save && entry.saved_temp_buffer;

  const startRip = useStartHistoryEntryRip();
  const deleteHistoryEntry = useDeleteHistoryEntry();

  const [showEditModal, setShowEditModal] = useState(false);

  const items: MenuProps["items"] = useMemo(
    () => [
      ...(clientConfig?.can_edit_history
        ? [
            {
              key: "edit",
              icon: <EditOutlined />,
              label: <a onClick={() => setShowEditModal(true)}>Edit</a>,
            },
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: (
                <Tooltip title="Double click to delete">
                  <a
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onDoubleClick={() =>
                      deleteHistoryEntry.mutate(entry.entry_id)
                    }
                  >
                    Delete
                  </a>
                </Tooltip>
              ),
              disabled: deleteHistoryEntry.isPending,
            },
          ]
        : []),
      ...(canSave
        ? [
            {
              key: "save",
              icon: <ScissorOutlined />,
              label: (
                <a
                  onClick={() => startRip.mutate({ entry_id: entry.entry_id })}
                >
                  Trim & Save to Library
                </a>
              ),
              disabled: startRip.isPending,
            },
          ]
        : []),
      ...(hasUnfinishedRip
        ? [
            {
              key: "view-rip",
              icon: <ScissorOutlined />,
              label: (
                <Link href={`/rip/${entry.entry_id}`}>
                  Trim & Save to Library
                </Link>
              ),
            },
          ]
        : []),
    ],
    [canSave, clientConfig, entry],
  );

  const {
    token: { colorText },
  } = theme.useToken();

  return (
    <>
      {items.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: dotSize,
            height: dotSize,
            zIndex: 5,
          }}
        >
          <Dropdown menu={{ items }} destroyOnHidden>
            <div
              style={{
                width: "100%",
                height: "100%",
                margin: -12,
                padding: 12,
              }}
            >
              <div
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  background: colorText,
                  opacity: canSave || hasUnfinishedRip ? 1 : 0.25,
                }}
              />
            </div>
          </Dropdown>
        </div>
      )}

      <EditEntryModal
        entry={entry}
        showing={showEditModal}
        setShowing={setShowEditModal}
      />
    </>
  );
}
