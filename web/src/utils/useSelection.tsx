import { MouseEvent, useEffect, useRef, useState } from "react";

type SelectItemProps = {
    onClick: (e: MouseEvent<HTMLElement>) => void;
    onMouseEnter: (e: MouseEvent<HTMLElement>) => void;
    onMouseLeave: (e: MouseEvent<HTMLElement>) => void;
}

type UseSelectionResult<T> = {
    selected: Set<T>;
    setSelected: (newSelection: Set<T>) => void;
    pendingSelection: Set<T>;
    addSelected: (item: T) => void;
    removeSelected: (item: T) => void;
    getItemProps: (idx: number) => SelectItemProps;
};

export default function useSelection<T>(items: T[]): UseSelectionResult<T> {
    const [selected, setSelected] = useState<Set<T>>(new Set());
    const [pendingSelection, setPendingSelection] = useState<Set<T>>(new Set());

    const isCmdHeld = useRef(false);
    const isShiftHeld = useRef(false);
    const previousSelectedIdx = useRef<number | null>(null);
    const hoveringIdx = useRef<number | null>(null);

    const getPendingSelection = () => {
        if (hoveringIdx.current && isCmdHeld.current) {
            return new Set([items[hoveringIdx.current]]);
        } else if (hoveringIdx.current && isShiftHeld.current) {
            if (previousSelectedIdx.current) {
                if (hoveringIdx.current < previousSelectedIdx.current) {
                    return new Set(items.slice(hoveringIdx.current, previousSelectedIdx.current));
                } else {
                    return new Set(items.slice(previousSelectedIdx.current + 1, hoveringIdx.current + 1));
                }
            } else {
                return new Set([items[hoveringIdx.current]]);
            }
        } else {
            return new Set<T>();
        }
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            isCmdHeld.current = e.metaKey || e.ctrlKey;
            isShiftHeld.current = e.shiftKey;

            if (e.key === "Escape") {
                setSelected(new Set());
                previousSelectedIdx.current = null;
                hoveringIdx.current = null;
            } else {
                setPendingSelection(getPendingSelection());
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            isCmdHeld.current = e.metaKey || e.ctrlKey;
            isShiftHeld.current = e.shiftKey;
            setPendingSelection(getPendingSelection());
        }

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        }
    }, []);


    const getItemProps = (idx: number) => {
        return {
            onClick: () => {
                hoveringIdx.current = idx;
                const pending = getPendingSelection();
                const newSelected = new Set(selected);
                for (const item of pending) {
                    if (newSelected.has(item)) {
                        newSelected.delete(item);
                    } else {
                        newSelected.add(item);
                    }
                }
                setSelected(newSelected);
                previousSelectedIdx.current = idx;
            },
            onMouseEnter: () => {
                hoveringIdx.current = idx;
                setPendingSelection(getPendingSelection());
            },
            onMouseLeave: () => {
                hoveringIdx.current = null;
                setPendingSelection(getPendingSelection());
            },
        }
    }


    return {
        selected,
        setSelected,
        pendingSelection,
        addSelected: (item: T) => setSelected(prev => new Set(prev).add(item)),
        removeSelected: (item: T) => {
            setSelected(prev => {
                const newSet = new Set(prev);
                newSet.delete(item);
                return newSet;
            });
        },
        getItemProps,
    }
}