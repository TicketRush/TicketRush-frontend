import { useQuery } from "@tanstack/react-query";
import { fetchBanners } from "@/api/banners";
import { queryKeys } from "@/constants/queryKeys";

export function useBanners() {
  return useQuery({
    queryKey: queryKeys.banners.list(),
    queryFn: fetchBanners,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
