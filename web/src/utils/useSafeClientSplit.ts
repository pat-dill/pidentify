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
  // this is no longer necessary since vite migration
  // TODO: remove all uses of this function

  return typeof clientValue === "function"
    ? // @ts-ignore
      clientValue()
    : clientValue;
}
