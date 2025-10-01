"use client";

import {
  UseInfiniteQueryResult,
  UseSuspenseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useRef } from "react";
import { useAnimationFrame } from "@/utils/useAnimationFrame";

export default function useAutoLoadMore(
  query: UseInfiniteQueryResult | UseSuspenseInfiniteQueryResult,
  container?: HTMLElement,
) {
  const { fetchNextPage, hasNextPage } = query;

  const prevLoadTime = useRef(500);
  const prevScroll = useRef<number | undefined>(undefined);
  const fetchDebounce = useRef(false);

  const loadMore = async () => {
    if (fetchDebounce.current) return;

    fetchDebounce.current = true;
    try {
      const startTs = performance.now();
      await fetchNextPage();
      prevLoadTime.current = performance.now() - startTs + 500;
    } catch {}

    fetchDebounce.current = false;
  };

  useAnimationFrame(({ delta }) => {
    if (!container) {
      prevScroll.current = undefined;
      return;
    }

    const curScroll =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (prevScroll.current != undefined) {
      const scrollSpeed = (curScroll - prevScroll.current) / (delta * 1000);
      const msUntilBottom = curScroll / -scrollSpeed;

      if (
        hasNextPage &&
        ((msUntilBottom >= 0 && msUntilBottom <= prevLoadTime.current) ||
          container.scrollHeight <= container.clientHeight)
      ) {
        loadMore().then();
      }
    }

    prevScroll.current = curScroll;
  });
}
