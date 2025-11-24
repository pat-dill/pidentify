import { post } from "./request";

export function restartRecorder(): Promise<Response> {
  return post("/api/recorder/restart");
}

