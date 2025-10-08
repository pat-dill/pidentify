function padZero(seconds: number, maxLen: number = 2) {
  return Math.round(seconds).toString().padStart(maxLen, "0");
}

export function formatDurationShort(seconds: number) {
  if (seconds < 60) {
    return `0:${padZero(seconds)}`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}:${padZero(seconds % 60)}`;
  } else {
    return `${Math.floor(seconds / 3600)}:${padZero(Math.floor((seconds % 3600) / 60))}:${padZero(seconds % 60)}`;
  }
}

export function formatDurationLong(seconds: number) {
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
}
