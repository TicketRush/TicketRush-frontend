import { useQuery } from "@tanstack/react-query";
import { fetchBanners } from "@/api/banners";
import { queryKeys } from "@/constants/queryKeys";
import { transientQueryRetryOptions } from "@/utils/query/retryTransientFailures";

export function useBanners() {
  return useQuery({
    queryKey: queryKeys.banners.list(),
    queryFn: fetchBanners,
    staleTime: 5 * 60 * 1000, // 5분
    // 공연 목록과 동일하게 서버 기동·일시 5xx 동안 로딩 유지
    ...transientQueryRetryOptions,
  });
}
