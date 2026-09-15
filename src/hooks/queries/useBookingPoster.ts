// 예매 화면 포스터 — 단건 예매 응답에는 이미지 URL이 없다 (#560).
// mock만 performanceImageMainUrl을 채운다. 실 API는 공연 목록 캐시 또는
// GET /api/v1/performance/{id}의 imageMainUrl을 쓴다.
import { useConcertDetail } from "@/hooks/queries/useConcertDetail";
import { useConcertListItem } from "@/hooks/queries/useConcertListItem";

function trimmedUrl(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function useBookingPoster(
  performanceId: number | undefined,
  bookingImageUrl?: string,
): string | undefined {
  const fromBooking = trimmedUrl(bookingImageUrl);
  const listItem = useConcertListItem(fromBooking ? undefined : performanceId);
  const fromList = trimmedUrl(listItem?.imageMainUrl);
  const { data } = useConcertDetail(
    fromBooking || fromList ? undefined : performanceId,
  );

  return fromBooking || fromList || trimmedUrl(data?.imageMainUrl);
}
