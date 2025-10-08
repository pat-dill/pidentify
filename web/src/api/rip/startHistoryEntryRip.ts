import { post } from "../request";
import { z } from "zod";
import { useTransitionRouter } from "next-view-transitions";
import { useMutation } from "@tanstack/react-query";

const responseSchema = z.object({
  success: z.boolean(),
  status: z.string(),
  message: z.string(),
});
export type SaveHistoryResponseT = z.infer<typeof responseSchema>;

async function startHistoryEntryRip(
  entry_id: string,
): Promise<SaveHistoryResponseT> {
  const res = await post(`/api/rip/${entry_id}/start`);
  return responseSchema.parse(await res.json());
}

type StartHistoryEntryRipOpts = {
  entry_id: string;
  redirect?: boolean;
};

export function useStartHistoryEntryRip() {
  const router = useTransitionRouter();

  return useMutation({
    mutationFn: async (opts: StartHistoryEntryRipOpts) => {
      const { entry_id, redirect = true } = opts;

      await startHistoryEntryRip(entry_id);
      if (redirect) {
        router.push(`/rip/${entry_id}`);
      }
    },
  });
}
