import { useQuery } from "@tanstack/react-query";
import { fetchBanners } from "@/api/banners";

const bannerKeys = {
  all: ["banners"] as const,
  list: () => ["banners", "list"] as const,
};

export function useBanners() {
  return useQuery({
    queryKey: bannerKeys.list(),
    queryFn: fetchBanners,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
