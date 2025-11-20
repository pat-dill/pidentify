import { post } from "./request";

export async function restartRecorder(): Promise<boolean> {
  await post("/api/recorder/restart");
  return true;
}

