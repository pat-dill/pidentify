import { post } from "./request";

export async function scanNow(): Promise<boolean> {
  await post("/api/scan-now");
  return true;
}
