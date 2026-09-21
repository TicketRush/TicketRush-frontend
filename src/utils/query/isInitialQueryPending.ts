/**
 * 마운트 직후 첫 조회가 끝나기 전인지.
 * 캐시가 있어도 fresh refetch 중이면 true, 이후 백그라운드 refetch는 false.
 */
export function isInitialQueryPending(
  isLoading: boolean,
  isFetching: boolean,
  isFetchedAfterMount: boolean,
): boolean {
  return isLoading || (isFetching && !isFetchedAfterMount);
}
