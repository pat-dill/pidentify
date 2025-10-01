"use client";

import { useEffect, useState } from "react";

export default function useSafeClientSplit<T>(
  clientValue: T | (() => T),
  serverValue: T,
): T;
export default function useSafeClientSplit<T>(
  clientValue: T | (() => T),
  serverValue?: T,
): T | undefined;
export default function useSafeClientSplit<T>(
  clientValue: T | (() => T),
  serverValue?: T,
) {
  const [initialRender, setInitialRender] = useState(true);

  useEffect(() => {
    setInitialRender(false);
  }, []);

  return initialRender
    ? serverValue
    : typeof clientValue === "function"
      ? // @ts-ignore
        clientValue()
      : clientValue;
}
