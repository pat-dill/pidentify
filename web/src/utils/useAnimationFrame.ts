import { useLayoutEffect, useRef } from "react";

type AnimationCb = ({ time, delta }: { time: number; delta: number }) => any;

export function useAnimationFrame(cb: AnimationCb) {
  if (typeof performance === "undefined" || typeof window === "undefined") {
    return;
  }

  const cbRef = useRef<AnimationCb>(undefined!);
  const frame = useRef<number>(undefined!);
  const init = useRef<number>(performance.now());
  const last = useRef<number>(performance.now());

  cbRef.current = cb;

  const animate = (now: number) => {
    if (cbRef.current)
      cbRef.current({
        time: (now - init.current) / 1000,
        delta: (now - last.current) / 1000,
      });
    last.current = now;
    frame.current = requestAnimationFrame(animate);
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    frame.current = requestAnimationFrame(animate);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current as number);
    };
  }, []);
}
