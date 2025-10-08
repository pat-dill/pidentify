"use client";

import { useStatus } from "@/contexts/StatusContext";
import CurrentTrack from "@/features/NowPlaying/CurrentTrack";
import DraggableContainer, { Size } from "@/components/DraggableContainer";
import { Card, theme } from "antd";
import useSafeClientSplit from "@/utils/useSafeClientSplit";
import { createContext, ReactNode, useContext, useState } from "react";

type FloatingCurrentTrackContextT = {
  size: Size;
  setSize: (size: Partial<Size>) => void;
};

export const floatingCurrentTrackContext =
  createContext<FloatingCurrentTrackContextT>(undefined!);

export function FloatingCurrentTrack({ children }: { children?: ReactNode }) {
  const status = useStatus();

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const isClient = useSafeClientSplit(true, false);

  const [size, setSize] = useState<Size>({ width: 250, height: 250 });

  const ctxVal = {
    size,
    setSize: (newSize: Partial<Size>) => {
      setSize({ ...size, ...newSize });
    },
  };

  return (
    <floatingCurrentTrackContext.Provider value={ctxVal}>
      {isClient && status && (
        <DraggableContainer size={size} setSize={setSize}>
          <Card
            style={{
              backdropFilter: "blur(4px)",
              backgroundColor: `color-mix(in srgb, ${colorBgContainer}, transparent 40%)`,
            }}
            variant="borderless"
          >
            <CurrentTrack compact />
          </Card>
        </DraggableContainer>
      )}
      {children}
    </floatingCurrentTrackContext.Provider>
  );
}

export const useFloatingStatus = () => useContext(floatingCurrentTrackContext);
