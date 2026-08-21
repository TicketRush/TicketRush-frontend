// 공연 상세 조회
import { useQuery } from "@tanstack/react-query";
import { fetchConcertDetail } from "@/api/concerts";
import { queryKeys } from "@/constants/queryKeys";

interface UseConcertDetailOptions {
  /**
   * true면 캐시를 믿지 않고 마운트 시 항상 재조회.
   * seats 진입 가드(#181)처럼 최신 status가 필요할 때 사용.
   */
  fresh?: boolean;
}

export function useConcertDetail(
  id: number | undefined,
  options?: UseConcertDetailOptions,
) {
  const fresh = options?.fresh === true;

  return useQuery({
    queryKey: id ? queryKeys.concerts.detail(id) : ["concert", "invalid"],
    queryFn: () => fetchConcertDetail(id!),
    enabled: !!id,
    staleTime: fresh ? 0 : 60_000,
    refetchOnMount: fresh ? "always" : true,
  });
}
