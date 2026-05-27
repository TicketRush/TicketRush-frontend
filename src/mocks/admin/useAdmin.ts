// 관리자 hooks — 도메인별로 분리되어 있지만 작아서 한 파일로 통합
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "@/api/admin";
import type {
  AdminBookingListParams,
  ConcertFormData,
} from "@/types/domain/admin";

// queryKeys.ts에 admin 키를 직접 추가하거나 (권장),
// 임시로 여기서 인라인 정의. 머지 시 queryKeys.ts에 통합 권장.
const adminKeys = {
  all: ["admin"] as const,
  dashboard: () => ["admin", "dashboard"] as const,
  bookings: (params?: AdminBookingListParams) =>
    ["admin", "bookings", params] as const,
  bookingStats: () => ["admin", "bookings", "stats"] as const,
  seatMonitoring: (performanceId: number) =>
    ["admin", "seat-monitoring", performanceId] as const,
  seatDetail: (performanceId: number, seatId: number | null) =>
    ["admin", "seat-detail", performanceId, seatId] as const,
  concertEdit: (id: number) => ["admin", "concert-edit", id] as const,
};

// ── 대시보드 ───────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: api.fetchAdminDashboard,
    staleTime: 30_000,
  });
}

// ── 예매 내역 ──────────────────────────────────────────
export function useAdminBookings(params: AdminBookingListParams) {
  return useQuery({
    queryKey: adminKeys.bookings(params),
    queryFn: () => api.fetchAdminBookings(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev, // 페이지 이동 시 깜빡임 방지
  });
}

export function useAdminBookingStats() {
  return useQuery({
    queryKey: adminKeys.bookingStats(),
    queryFn: api.fetchAdminBookingStats,
    staleTime: 30_000,
  });
}

export function useAdminRefundBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.adminRefundBookingApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

// ── 좌석 모니터링 ──────────────────────────────────────
export function useAdminSeatMonitoring(performanceId: number | undefined) {
  return useQuery({
    queryKey: performanceId
      ? adminKeys.seatMonitoring(performanceId)
      : ["admin", "seat-monitoring", "invalid"],
    queryFn: () => api.fetchAdminSeatMonitoring(performanceId!),
    enabled: !!performanceId,
    staleTime: 0, // 실시간
    refetchInterval: 10_000, // 10초마다 자동 갱신
  });
}

export function useAdminSeatDetail(
  performanceId: number | undefined,
  seatId: number | null,
) {
  return useQuery({
    queryKey: adminKeys.seatDetail(performanceId ?? 0, seatId),
    queryFn: () => api.fetchAdminSeatDetail(performanceId!, seatId!),
    enabled: !!performanceId && !!seatId,
    staleTime: 5_000,
  });
}

export function useAdminReleaseSeat(performanceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seatId: number) =>
      api.adminReleaseSeatApi(performanceId, seatId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: adminKeys.seatMonitoring(performanceId),
      });
    },
  });
}

// ── 공연 CRUD ──────────────────────────────────────────
export function useConcertForEdit(id: number | undefined) {
  return useQuery({
    queryKey: id ? adminKeys.concertEdit(id) : ["admin", "concert-edit", "invalid"],
    queryFn: () => api.fetchConcertForEdit(id!),
    enabled: !!id,
  });
}

export function useCreateConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConcertFormData) => api.createConcertApi(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

export function useUpdateConcert(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConcertFormData) => api.updateConcertApi(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useDeleteConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteConcertApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
