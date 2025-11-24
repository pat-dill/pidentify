import { get } from "@/api/request";
import { z } from "zod";
import {
    type QueryClient,
    useQuery,
    useSuspenseQuery,
} from "@tanstack/react-query";

const sessionTokenSchema = z.object({
    is_admin: z.boolean(),
    created_at: z.string(),
});
export type SessionTokenT = z.infer<typeof sessionTokenSchema>;

const checkAuthResponseSchema = z.object({
    success: z.boolean(),
    status: z.string(),
    message: z.string(),
    data: sessionTokenSchema.nullish(),
});
type CheckAuthResponseT = z.infer<typeof checkAuthResponseSchema>;

async function checkAuth(): Promise<SessionTokenT | null> {
    const res = await get("/api/auth/check-auth");
    const data: CheckAuthResponseT = await res.json();
    const parsed = checkAuthResponseSchema.parse(data);
    return parsed.data ?? null;
}

export function getCheckAuthQuery() {
    return {
        queryKey: ["check-auth"],
        queryFn: () => checkAuth(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    };
}

export function prefetchCheckAuth(queryClient: QueryClient) {
    return queryClient.prefetchQuery(getCheckAuthQuery());
}

type CheckAuthOpts = {
    suspend?: boolean;
};

export function useCheckAuth(opts: CheckAuthOpts = {}) {
    const { suspend = false } = opts;
    const query = getCheckAuthQuery();

    if (suspend) {
        return useSuspenseQuery(query);
    } else {
        return useQuery(query);
    }
}

