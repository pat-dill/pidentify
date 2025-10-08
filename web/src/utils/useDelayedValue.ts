import { useLayoutEffect, useState } from "react";
import { useAnimationFrame } from "./useAnimationFrame";

export function useDelayedValue<T>(value: T, delayMs: number) {
  const [lastChange, setLastChange] = useState(0);
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useLayoutEffect(() => {
    setLastChange(performance.now());
  }, [value]);

  useAnimationFrame(() => {
    const now = performance.now();
    if (now - lastChange >= delayMs) {
      setDebouncedValue(value);
    }
  });

  return debouncedValue;
}
