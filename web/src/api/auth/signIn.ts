import { post } from "@/api/request";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const loginRequestSchema = z.object({
    username: z.string(),
    password: z.string(),
});
export type LoginRequestT = z.infer<typeof loginRequestSchema>;

const loginResponseSchema = z.object({
    success: z.boolean(),
    status: z.string(),
    message: z.string(),
});
type LoginResponseT = z.infer<typeof loginResponseSchema>;

async function signIn(data: LoginRequestT): Promise<LoginResponseT> {
    const res = await post("/api/auth/login", data, undefined, {
        withCredentials: true,
    });
    const response: LoginResponseT = await res.json();
    return loginResponseSchema.parse(response);
}

export function useSignIn({ onSuccess }: { onSuccess?: () => void } = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: LoginRequestT) => signIn(data),
        onSuccess: () => {
            // Invalidate the check-auth query so the auth state updates
            queryClient.invalidateQueries({ queryKey: ["check-auth"] });
            queryClient.invalidateQueries({ queryKey: ["client-config"] });
            onSuccess?.();
        },
    });
}

