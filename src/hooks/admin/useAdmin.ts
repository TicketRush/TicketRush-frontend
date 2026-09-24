// 관리자 hooks — 도메인별로 작아서 한 파일로 통합
import type { CreateConcertInput } from "@/api/adminConcertCreate";
import type { UpdateConcertInput } from "@/api/adminConcertEdit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/admin";
import { fetchAdminBookingByNumber } from "@/api/bookings";
import {
  markAdminSeatBookerLoadFailed,
  mergeAdminSeatDetailWithBooker,
} from "@/api/adminSeatMapper";
import { ApiError } from "@/api/errors/errorMapper";
import { queryKeys } from "@/constants/queryKeys";
import type {
  AdminBookingListParams,
  AdminConcertListParams,
  AdminDashboardParams,
} from "@/types/domain/admin";
import type { AdminBookingListTab } from "@/utils/admin/adminBookingTabs";
import {
  isDashboardPeriodWithinLimit,
  parseLocalDateKey,
} from "@/utils/admin/dashboardPeriod";
import {
  applySeatCountDelta,
  findSeatStatus,
  patchSeatMapStatus,
} from "@/utils/seat/applySeatStatusUpdate";
import {
  fetchAndMergeSeatMap,
  recordSeatLivePatch,
} from "@/utils/seat/seatLivePatchTracker";
import type { SeatCounts, SeatMapData } from "@/types/domain/seat";

export const adminKeys = {
  all: ["admin"] as const,
  dashboard: (params?: AdminDashboardParams) =>
    ["admin", "dashboard", params] as const,
  concerts: (params?: AdminConcertListParams) =>
    ["admin", "concerts", params] as const,
  bookings: (
    params?: AdminBookingListParams & { tab?: AdminBookingListTab },
  ) => ["admin", "bookings", params] as const,
  bookingByNumber: (bookingNumber: string) =>
    ["admin", "booking", bookingNumber] as const,
  bookingStats: () => ["admin", "bookings", "stats"] as const,
  seatMonitoring: (performanceId: number) =>
    ["admin", "seat-monitoring", performanceId] as const,
  seatDetail: (performanceId: number, seatId: number | null) =>
    ["admin", "seat-detail", performanceId, seatId] as const,
  concertEdit: (id: number) => ["admin", "concert-edit", id] as const,
};

function retryUnlessClientError(failureCount: number, error: Error) {
  if (
    error instanceof ApiError &&
    error.httpStatus != null &&
    error.httpStatus >= 400 &&
    error.httpStatus < 500
  ) {
    return false;
  }
  return failureCount < 2;
}

// ── 대시보드 ──────────────────────────────────────────
export function useAdminDashboard(params: AdminDashboardParams) {
  const enabled = isDashboardPeriodWithinLimit(
    parseLocalDateKey(params.from),
    parseLocalDateKey(params.to),
  );

  return useQuery({
    queryKey: adminKeys.dashboard(params),
    queryFn: () => api.fetchAdminDashboard(params),
    staleTime: 30_000,
    enabled,
    placeholderData: (prev) => prev,
    retry: retryUnlessClientError,
  });
}

export function useAdminConcerts(
  params: AdminConcertListParams = {},
  options?: { refetchOnMount?: boolean | "always" },
) {
  return useQuery({
    queryKey: adminKeys.concerts(params),
    queryFn: () => api.fetchAdminConcerts(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: retryUnlessClientError,
    refetchOnMount: options?.refetchOnMount,
  });
}

// ── 예매 내역 ─────────────────────────────────────────
export function useAdminBookings(params: {
  tab: AdminBookingListTab;
  page?: number;
  size?: number;
}) {
  const listParams = { page: params.page, size: params.size };
  return useQuery({
    queryKey: adminKeys.bookings({ ...listParams, tab: params.tab }),
    queryFn: () => api.fetchAdminBookingsForTab(params.tab, listParams),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: retryUnlessClientError,
  });
}

export function useAdminBookingStats() {
  return useQuery({
    queryKey: adminKeys.bookingStats(),
    queryFn: api.fetchAdminBookingStats,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

export function useAdminBookingByNumber(bookingNumber: string | null) {
  return useQuery({
    queryKey: adminKeys.bookingByNumber(bookingNumber ?? ""),
    queryFn: () => fetchAdminBookingByNumber(bookingNumber!),
    enabled: !!bookingNumber,
    staleTime: 0,
    retry: retryUnlessClientError,
  });
}

export function useAdminRefundBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.adminRefundBookingApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      qc.invalidateQueries({ queryKey: ["admin", "booking"] });
    },
  });
}

// ── 좌석 모니터링 ─────────────────────────────────────
// #362: 재조회 HTTP는 SSE 패치와 좌석 단위로 합친다.
export function useAdminSeatMonitoring(performanceId: number | undefined) {
  return useQuery({
    queryKey: performanceId
      ? adminKeys.seatMonitoring(performanceId)
      : ["admin", "seat-monitoring", "invalid"],
    queryFn: ({ client }) =>
      fetchAndMergeSeatMap(
        client,
        adminKeys.seatMonitoring(performanceId!),
        performanceId!,
        () => api.fetchAdminSeatMonitoring(performanceId!),
      ),
    enabled: !!performanceId,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: retryUnlessClientError,
  });
}

export function useAdminSeatDetail(
  performanceId: number | undefined,
  seatId: number | null,
) {
  return useQuery({
    queryKey: adminKeys.seatDetail(performanceId ?? 0, seatId),
    queryFn: async () => {
      const seat = await api.fetchAdminSeatDetail(performanceId!, seatId!);
      const bookingNumber = seat.bookingNumber?.trim();
      if (!bookingNumber) return seat;

      try {
        const booker = await fetchAdminBookingByNumber(bookingNumber);
        return mergeAdminSeatDetailWithBooker(seat, booker);
      } catch {
        return markAdminSeatBookerLoadFailed(seat);
      }
    },
    enabled: !!performanceId && !!seatId,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: retryUnlessClientError,
  });
}

export function useAdminReleaseSeat(performanceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      seatId,
      bookingNumber,
    }: {
      seatId: number;
      bookingNumber: string;
    }) => api.adminReleaseSeatApi(performanceId, seatId, bookingNumber),
    onSuccess: (_data, { seatId }) => {
      const mapKey = adminKeys.seatMonitoring(performanceId);
      const countsKey = queryKeys.seats.counts(performanceId);
      const previousStatus = findSeatStatus(
        qc.getQueryData<SeatMapData>(mapKey),
        seatId,
      );

      recordSeatLivePatch(performanceId, seatId);
      qc.setQueryData<SeatMapData>(mapKey, (old) =>
        patchSeatMapStatus(old, seatId, "AVAILABLE"),
      );
      if (previousStatus && previousStatus !== "AVAILABLE") {
        qc.setQueryData<SeatCounts>(countsKey, (old) =>
          old ? applySeatCountDelta(old, previousStatus, "AVAILABLE") : old,
        );
      }

      qc.invalidateQueries({ queryKey: mapKey });
      qc.invalidateQueries({
        queryKey: ["admin", "seat-detail", performanceId],
      });
      qc.invalidateQueries({ queryKey: countsKey });
    },
  });
}

// ── 공연 CRUD ─────────────────────────────────────────
export function useConcertForEdit(id: number | undefined) {
  return useQuery({
    queryKey: id
      ? adminKeys.concertEdit(id)
      : ["admin", "concert-edit", "invalid"],
    queryFn: () => api.fetchConcertForEdit(id!),
    enabled: !!id && Number.isSafeInteger(id) && id > 0,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useCreateConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConcertInput) => api.createConcertApi(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.banners.list() });
      qc.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUpdateConcert(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateConcertInput) => api.updateConcertApi(id, data),
    onSettled: () => {
      // A file failure can follow a successful JSON PATCH.
      // Refresh banners without delaying the save result on this optional GET.
      void qc.invalidateQueries({ queryKey: queryKeys.banners.list() });
      return Promise.all([
        qc.invalidateQueries({ queryKey: adminKeys.all }),
        qc.invalidateQueries({ queryKey: queryKeys.concerts.all }),
      ]);
    },
  });
}

export function useDeleteConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteConcertApi(id),
    onSuccess: (_data, id) => {
      // 재조회 실패가 이미 끝난 삭제를 실패로 바꾸지 않도록 기다리지 않는다.
      void qc.invalidateQueries({ queryKey: adminKeys.all });
      void qc.invalidateQueries({ queryKey: queryKeys.concerts.all });
      void qc.invalidateQueries({
        queryKey: queryKeys.seats.byPerformance(id),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.seats.counts(id) });
    },
  });
}
