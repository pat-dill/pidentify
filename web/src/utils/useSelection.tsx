import { MouseEvent, useEffect, useRef, useState } from "react";

type SelectItemProps = {
  onClick: (e: MouseEvent<HTMLElement>) => void;
  onMouseEnter: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave: (e: MouseEvent<HTMLElement>) => void;
};

type UseSelectionResult<T> = [
  Set<T>,
  (newSelection: Set<T>) => void,
  Set<T>,
  (item: T) => SelectItemProps,
];

export default function useSelection<T>(items: T[]): UseSelectionResult<T> {
  const [selected, setSelected] = useState<Set<T>>(new Set());
  const [pendingSelection, setPendingSelection] = useState<Set<T>>(new Set());

  const isCmdHeld = useRef(false);
  const isShiftHeld = useRef(false);
  const previousSelected = useRef<T | null>(null);
  const hovering = useRef<T | null>(null);

  const getPendingSelection = () => {
    if (hovering.current && isCmdHeld.current) {
      return new Set([hovering.current]);
    } else if (hovering.current && isShiftHeld.current) {
      if (previousSelected.current) {
        const hoveringIdx = items.indexOf(hovering.current);
        const previousSelectedIdx = items.indexOf(previousSelected.current);

        if (hoveringIdx < previousSelectedIdx) {
          return new Set(items.slice(hoveringIdx, previousSelectedIdx));
        } else {
          return new Set(items.slice(previousSelectedIdx + 1, hoveringIdx + 1));
        }
      } else {
        return new Set([hovering.current]);
      }
    } else {
      return new Set<T>();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      isCmdHeld.current = e.metaKey || e.ctrlKey;
      isShiftHeld.current = e.shiftKey;

      if (e.key === "Escape") {
        setSelected(new Set());
        previousSelected.current = null;
        hovering.current = null;
      } else {
        setPendingSelection(getPendingSelection());
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      isCmdHeld.current = e.metaKey || e.ctrlKey;
      isShiftHeld.current = e.shiftKey;
      setPendingSelection(getPendingSelection());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const getItemProps = (item: T) => {
    return {
      onClick: () => {
        hovering.current = item;
        const pending = getPendingSelection();
        if (pending.size > 0) {
          const newSelected = new Set(selected);
          for (const item of pending) {
            if (newSelected.has(item)) {
              newSelected.delete(item);
            } else {
              newSelected.add(item);
            }
          }
          setSelected(newSelected);
          previousSelected.current = item;
        }
      },
      onMouseEnter: () => {
        hovering.current = item;
        setPendingSelection(getPendingSelection());
      },
      onMouseLeave: () => {
        hovering.current = null;
        setPendingSelection(getPendingSelection());
      },
    };
  };

  return [
    selected,
    (newSelection) => setSelected(newSelection),
    pendingSelection,
    getItemProps,
  ];
}
