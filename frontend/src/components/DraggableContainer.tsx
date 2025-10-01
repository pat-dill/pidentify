"use client";

import {
  MouseEventHandler,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSpring } from "@/utils/useSpring";
import { useAnimationFrame } from "@/utils/useAnimationFrame";

function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max);
}

export type Size = { width: number; height: number };

type DraggableContainerProps = {
  aspectRatio?: number;
  snapOffset?: number;
  snapThreshold?: number;
  maxWidth?: number;
  maxHeight?: number;
  dragSpeed?: number;
  children?: ReactNode;
  size?: Size;
  setSize?: (size: Size) => void;
};

export default function DraggableContainer(props: DraggableContainerProps) {
  const {
    aspectRatio,
    snapOffset = 16,
    snapThreshold = Infinity,
    maxWidth,
    maxHeight,
    dragSpeed = 60,
    children,
  } = props;
  let { size, setSize } = props;

  if (size == null || setSize == null) {
    [size, setSize] = useState({ width: 250, height: 250 });
  }

  const boxRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: snapOffset, y: snapOffset });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  useAnimationFrame(() => {
    if (boxRef.current && !aspectRatio) {
      if (boxRef.current.clientHeight !== size.height) {
        setSize({
          ...size,
          height: boxRef.current.clientHeight,
        });
      }
    }
  });

  const renderPosition = {
    x: useSpring(position.x, 1, dragSpeed),
    y: useSpring(position.y, 1, dragSpeed),
  };

  // Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        setPosition({
          x: e.clientX - offsetRef.current.x,
          y: e.clientY - offsetRef.current.y,
        });
      }
      if (resizing) {
        const dx = e.clientX - position.x;
        const dy = e.clientY - position.y;

        const newWidth = maxWidth ? Math.max(maxWidth, dx) : dx;
        const newHeight = maxHeight ? Math.max(maxHeight, dy) : dy;

        if (!aspectRatio) {
          setSize({ width: newWidth, height: newHeight });
        } else if (aspectRatio >= 1) {
          setSize({
            width: newWidth,
            height: newWidth / aspectRatio,
          });
        } else if (aspectRatio < 1) {
          setSize({
            width: newHeight / aspectRatio,
            height: newHeight,
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (dragging) {
        snapToEdge();
        setDragging(false);
      }
      if (resizing) {
        setResizing(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, resizing, position]);

  const startDrag: MouseEventHandler = (e) => {
    const rect = boxRef.current?.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0),
    };
    setDragging(true);
  };

  const startResize: MouseEventHandler = (e) => {
    e.stopPropagation();
    setResizing(true);
  };

  const snapToEdge = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const distances = {
      left: position.x,
      right: vw - (position.x + size.width),
      top: position.y,
      bottom: vh - (position.y + size.height),
    };

    let minKey = "left";
    let minVal = distances.left;
    for (const [key, value] of Object.entries(distances)) {
      if (value < minVal) {
        minVal = value;
        minKey = key;
      }
    }

    if (minVal < snapThreshold) {
      switch (minKey) {
        case "left":
          setPosition((prev) => ({ ...prev, x: snapOffset }));
          break;
        case "right":
          setPosition((prev) => ({ ...prev, x: vw - size.width - snapOffset }));
          break;
        case "top":
          setPosition((prev) => ({ ...prev, y: snapOffset }));
          break;
        case "bottom":
          setPosition((prev) => ({
            ...prev,
            y: vh - size.height - snapOffset,
          }));
          break;
      }
    }
  };

  return (
    <div
      ref={boxRef}
      onMouseDown={startDrag}
      style={{
        position: "fixed",
        left: renderPosition.x,
        top: renderPosition.y,
        width: size.width,
        height: aspectRatio ? size.height : "auto",
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        zIndex: 100,
      }}
    >
      {children}

      <div
        onMouseDown={startResize}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 20,
          height: 20,
          cursor: "nwse-resize",
          borderTopLeftRadius: "4px",
        }}
      />
    </div>
  );
}
