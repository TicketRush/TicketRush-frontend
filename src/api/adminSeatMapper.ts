import type { AdminSeatDetail } from "@/types/domain/admin";
import type { BookingStatus } from "@/types/domain/booking";
import type {
  SeatMapData,
  SeatStatus,
  SeatWithStatus,
} from "@/types/domain/seat";
import { formatAdminBooker } from "@/utils/admin/formatAdminMetric";
import {
  mapSeatMapItem,
  seatsHaveAllCoordinates,
  toLayoutSize,
  type BackendSeatLayoutSize,
  type BackendSeatMapItem,
} from "./seatMapMapper";

/** GET /api/v1/seat/admin/{id}/monitoring — axios-case-converter 이후 */
export interface SeatAdminMonitoringResponse {
  summary?: {
    totalCount: number;
    availableCount: number;
    soldCount: number;
    holdCount: number;
  };
  /** #279 추가. 구버전·미생성(NON_NULL)은 키 생략. 공개 API와 달리 null JSON 없음 */
  layout?: BackendSeatLayoutSize | null;
  seats?: SeatAdminMapItemResponse[];
}

export interface SeatAdminMapItemResponse {
  seatId: number;
  seatLayoutId: number;
  seatNumber: string;
  seatStatus: SeatStatus;
  /** HOLD가 아니면 NON_NULL로 생략 */
  holdExpiredAt?: string;
  /** #279 — 구 응답에는 없을 수 있음 */
  seatRow?: number | null;
  seatCol?: number | null;
}

/** GET /api/v1/seat/admin/{id}/{seatId} — axios-case-converter 이후 */
export interface SeatAdminSeatDetailResponse {
  seatId: number;
  seatNumber: string;
  seatStatus: SeatStatus;
  /** NON_NULL — 예매 번호 없는 HOLD는 생략 */
  bookingNumber?: string;
  holdStartedAt?: string;
  holdExpiredAt?: string;
  remainingSeconds?: number;
}

/**
 * GET /api/v1/booking/admin/bookings/{bookingNumber}
 * 보강 필드(이름·이메일·공연·좌석)는 장애 시 키 생략.
 */
export interface AdminBookingBookerResponse {
  bookingNumber: string;
  bookerName?: string | null;
  bookerEmail?: string | null;
  bookedAt?: string;
  bookingStatus?: BookingStatus;
  performanceTitle?: string | null;
  performanceDate?: string | null;
  seatNumber?: string | null;
  seatCount?: number;
  paymentAmount?: number | null;
}

/**
 * 관리자 monitoring → SeatMapData (#279).
 * - 신 BE: 미생성 시 layout 키 생략(전역 NON_NULL) + seats=[] → layoutReady=false
 * - 공개 API와 달리 @JsonInclude(ALWAYS)가 없어 layout: null JSON은 오지 않음
 * - layout 키 생략(구버전) + seats 있음 → seats만으로 렌더
 * - 좌표 일부 누락 → seatNumber 파싱 폴백
 */
export function mapAdminMonitoring(
  data: SeatAdminMonitoringResponse | null | undefined,
): SeatMapData {
  if (data == null) {
    return { layout: null, layoutReady: true, seats: [] };
  }

  const rawSeats = data.seats ?? [];

  // layout 없음(undefined/null) + 좌석 없음 = 배치 미생성 (BE SeatAdminMonitoringResponse)
  if (data.layout == null && rawSeats.length === 0) {
    return { layout: null, layoutReady: false, seats: [] };
  }

  const useCoordinates = seatsHaveAllCoordinates(rawSeats);

  return {
    layout: toLayoutSize(data.layout),
    layoutReady: true,
    seats: rawSeats.map((item) => mapAdminSeatMapItem(item, useCoordinates)),
  };
}

/** @deprecated 좌석 배열만 필요할 때 — mapAdminMonitoring 사용 권장 */
export function mapAdminMonitoringSeats(
  data: SeatAdminMonitoringResponse | null | undefined,
): SeatWithStatus[] {
  return mapAdminMonitoring(data).seats;
}

export function mapAdminSeatMapItem(
  item: SeatAdminMapItemResponse,
  useCoordinates?: boolean,
): SeatWithStatus {
  const useCoords =
    useCoordinates ?? seatsHaveAllCoordinates([item]);
  return mapSeatMapItem(item as BackendSeatMapItem, useCoords);
}

export function mapAdminSeatDetail(
  data: SeatAdminSeatDetailResponse,
): AdminSeatDetail {
  const bookingNumber = data.bookingNumber?.trim();
  const isHold = data.seatStatus === "HOLD";

  return {
    seatId: data.seatId,
    seatNumber: data.seatNumber,
    status: data.seatStatus,
    bookingNumber: bookingNumber || undefined,
    reservedAt: isHold ? data.holdStartedAt : undefined,
    holdRemainingSec: isHold ? (data.remainingSeconds ?? 0) : undefined,
  };
}

export function mergeAdminSeatDetailWithBooker(
  seat: AdminSeatDetail,
  booker: AdminBookingBookerResponse | null | undefined,
): AdminSeatDetail {
  if (booker == null) return seat;

  return {
    ...seat,
    bookerLoadFailed: false,
    reservedBy: formatAdminBooker(booker.bookerName, booker.bookerEmail),
    reservedAt: seat.reservedAt ?? booker.bookedAt,
  };
}

export function markAdminSeatBookerLoadFailed(
  seat: AdminSeatDetail,
): AdminSeatDetail {
  return { ...seat, bookerLoadFailed: true };
}
