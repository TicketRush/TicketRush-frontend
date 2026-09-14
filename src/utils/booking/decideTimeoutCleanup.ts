import { isIgnorablePendingCancelError } from "@/api/errors/errorMapper";

/**
 * 타이머 만료 후 PENDING DELETE 결과에 따른 클라 store 정리 여부 (#260).
 * - 성공·이미 만료/없음 → store 비움
 * - 네트워크·5xx → bookingNumber 유지 (expired·좌석 재진입에서 재취소)
 */
export function shouldResetStoresAfterTimeoutRelease(
  releaseError: unknown | null | undefined,
): boolean {
  if (releaseError == null) return true;
  return isIgnorablePendingCancelError(releaseError);
}
