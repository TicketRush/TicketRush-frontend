// 공연 상세 조회
import { useQuery } from "@tanstack/react-query";
import { fetchConcertDetail } from "@/api/concerts";
import { queryKeys } from "@/constants/queryKeys";

export function useConcertDetail(id: number | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.concerts.detail(id) : ["concert", "invalid"],
    queryFn: () => fetchConcertDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
