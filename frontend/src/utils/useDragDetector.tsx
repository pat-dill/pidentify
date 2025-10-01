import { MouseEventHandler, useLayoutEffect, useRef, useState } from "react";

type UseDragDetectorArgs<T> = {
  onMove?: ({ dx, dy, prev }: { dx: number; dy: number; prev: T }) => void;
  onStart?: () => void;
  onEnd?: () => void;
  prev: T;
};

type DragDetectorProps = {
  onMouseDown: MouseEventHandler;
};

export default function useDragDetector<T>({
  onMove,
  onStart,
  onEnd,
  prev,
}: UseDragDetectorArgs<T>): [DragDetectorProps, boolean] {
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const prevBeforeDrag = useRef<T>(prev);

  useLayoutEffect(() => {
    if (dragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const factor = e.ctrlKey || e.metaKey ? 3 : 1;

        onMove?.({
          dx: (e.clientX - startPos.current.x) / factor,
          dy: (e.clientY - startPos.current.y) / factor,
          prev: prevBeforeDrag.current,
        });
      };

      const handleMouseUp = () => {
        setDragging(false);
        onEnd?.();
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging]);

  return [
    {
      onMouseDown: (e) => {
        startPos.current = { x: e.clientX, y: e.clientY };
        prevBeforeDrag.current = prev;
        setDragging(true);
        onStart?.();
      },
    },
    dragging,
  ];
}
