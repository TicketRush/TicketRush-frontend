// React Query 캐시 키 중앙 관리
// 규칙: ["도메인", "구분", ...파라미터]
//
// 사용 예:
//   queryClient.invalidateQueries({ queryKey: queryKeys.concerts.all })
//   queryClient.invalidateQueries({ queryKey: queryKeys.concerts.detail(1) })

import type { ConcertListParams } from "@/types/domain/concert";
import type { MyBookingsParams } from "@/types/domain/booking";

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => ["auth", "me"] as const,
    oauthUrl: (provider: string) => ["auth", "oauth-url", provider] as const,
  },
  concerts: {
    all: ["concerts"] as const,
    list: (params?: ConcertListParams) => ["concerts", "list", params] as const,
    detail: (id: number) => ["concerts", "detail", id] as const,
  },
  banners: {
    all: ["banners"] as const,
    list: () => ["banners", "list"] as const,
  },
  seats: {
    all: ["seats"] as const,
    /** 좌석 배치 + 상태 통합 조회 */
    byPerformance: (performanceId: number) =>
      ["seats", "byPerformance", performanceId] as const,
    /** 좌석 잔여 수 */
    counts: (performanceId: number) =>
      ["seats", "counts", performanceId] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    mine: (params?: MyBookingsParams) => ["bookings", "mine", params] as const,
    detail: (bookingNumber: string) =>
      ["bookings", "detail", bookingNumber] as const,
  },
  payments: {
    all: ["payments"] as const,
    status: (paymentKey: string) => ["payments", "status", paymentKey] as const,
  },
  tickets: {
    all: ["tickets"] as const,
    // 입장권 QR payload — bookingId 기준
    qr: (bookingId: number) => ["tickets", "qr", bookingId] as const,
  },
} as const;

// 호환성용 - 기존 imports
export type { ConcertListParams, MyBookingsParams };
export default queryKeys;
