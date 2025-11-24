import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "../request";

export function updateSettings(values: Record<string, any>) {
    return patch(`/api/settings`, values);
}

export function useUpdateSettings({ onSuccess }: { onSuccess?: () => void } = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (values: Record<string, any>) => updateSettings(values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            onSuccess?.();
        },
    });
}

