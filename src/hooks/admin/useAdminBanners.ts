import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateConcertBanner } from "@/api/adminBanners";
import { queryKeys } from "@/constants/queryKeys";
import { adminKeys } from "./useAdmin";

export function useUpdateConcertBanner() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateConcertBanner,
    meta: { skipGlobalErrorToast: true },
    onSettled: () => Promise.all([
      // Also refresh after rejection: another administrator may have filled the slots.
      client.invalidateQueries({ queryKey: queryKeys.banners.list() }),
      client.invalidateQueries({ queryKey: adminKeys.all }),
      client.invalidateQueries({ queryKey: queryKeys.concerts.all }),
    ]),
  });
}
