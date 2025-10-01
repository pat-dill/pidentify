import { useEffect, useState } from "react";
import { useAnimationFrame } from "@/utils/useAnimationFrame";

export function useAudioController(audio?: HTMLAudioElement | null) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (audio) {
      setTime(audio.currentTime);
      setPlaying(!audio.paused);

      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);

      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      return () => {
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
      };
    }
  }, [audio]);

  useAnimationFrame(() => {
    if (audio) {
      setTime(audio?.currentTime || 0);
    }
  });

  return {
    playing,
    time,
    play: () => {
      audio?.play();
      setPlaying(true);
    },
    pause: () => {
      audio?.pause();
      setPlaying(false);
    },
    setTime: (time: number) => {
      if (audio) {
        audio.currentTime = time;
        setTime(time);
      }
    },
  };
}
