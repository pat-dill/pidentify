import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post } from "../request";

export function signOut() {
    return post("/api/auth/logout")
}

export function useSignOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: signOut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["check-auth"] });
            queryClient.invalidateQueries({ queryKey: ["client-config"] });
        },
    });
}