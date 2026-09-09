// 예매 내역 관리 — 이미지 4
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Ticket,
  CheckSquare,
  DollarSign,
  UserMinus,
  ArrowLeft,
  Mail,
  User,
} from "lucide-react";
import { toast } from "react-toastify";
import { ApiError, mapErrorToMessage } from "@/api/errors/errorMapper";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import type { AdminBookingBookerResponse } from "@/api/adminSeatMapper";
import StatCard from "@/components/admin/StatCard";
import AdminBookingTable from "@/components/admin/AdminBookingTable";
import Pagination from "@/components/admin/Pagination";
import {
  useAdminBookings,
  useAdminBookingByNumber,
  useAdminBookingStats,
  useAdminRefundBooking,
} from "@/hooks/admin/useAdmin";
import type { BookingStatus } from "@/types/domain/booking";
import type { AdminBookingItem } from "@/types/domain/admin";
import {
  formatAdminCount,
  formatAdminDateTime,
  formatAdminText,
  formatAdminWon,
} from "@/utils/admin/formatAdminMetric";
import {
  parseAdminBookingHandoff,
  resolveAdminBookingHandoff,
} from "@/utils/admin/resolveAdminBookingHandoff";

type Tab = "ALL" | "CONFIRMED" | "PENDING" | "CANCELED";

const PAGE_SIZE = 10;

function matchesTab(status: BookingStatus, tab: Tab): boolean {
  if (tab === "ALL") return true;
  if (tab === "CANCELED") return status === "CANCELED" || status === "REFUNDED";
  if (tab === "PENDING") return status === "PENDING" || status === "REFUNDING";
  return status === tab;
}

function overlayRequestedRefundStatus(
  status: BookingStatus | undefined,
  bookingNumber: string,
  requested: ReadonlySet<string>,
): BookingStatus | undefined {
  if (status === "CONFIRMED" && requested.has(bookingNumber)) return "REFUNDING";
  return status;
}

function withRequestedRefunds(
  items: AdminBookingItem[],
  requested: ReadonlySet<string>,
): AdminBookingItem[] {
  if (requested.size === 0) return items;
  return items.map((item) => {
    const status = overlayRequestedRefundStatus(
      item.status,
      item.bookingNumber,
      requested,
    );
    return status === item.status ? item : { ...item, status: status! };
  });
}

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("ALL");
  const [page, setPage] = useState(0);
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appliedHandoffKey, setAppliedHandoffKey] = useState<string | null>(
    null,
  );
  const [requestedRefunds, setRequestedRefunds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const focusBookingNumber = searchParams.get("bookingNumber")?.trim() || null;
  const { data, isLoading, isError, isPlaceholderData } = useAdminBookings({
    page,
    size: PAGE_SIZE,
  });
  const lastTotalPages = useRef<number | null>(null);
  if (data?.pagination) {
    lastTotalPages.current = data.pagination.totalPages;
  }
  const totalPages = data?.pagination.totalPages ?? lastTotalPages.current ?? 1;
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useAdminBookingStats();
  const {
    data: focusBooking,
    isLoading: focusLoading,
    isError: focusError,
  } = useAdminBookingByNumber(focusBookingNumber);
  const refundMutation = useAdminRefundBooking();

  const visibleItems = useMemo(() => {
    if (!data) return [];
    const items = withRequestedRefunds(data.items, requestedRefunds);
    if (tab === "ALL") return items;
    return items.filter((item) => matchesTab(item.status, tab));
  }, [data, tab, requestedRefunds]);

  const pageHasRows = (data?.items.length ?? 0) > 0;
  const filterEmpty = pageHasRows && visibleItems.length === 0;

  useEffect(() => {
    const handoff = parseAdminBookingHandoff(searchParams);
    if (!handoff) return;
    const key = `${handoff.bookingNumber}:${handoff.intentRefund}`;
    if (appliedHandoffKey === key) return;
    if (isLoading && !data) return;
    const onCurrentPage = data?.items.some(
      (item) => item.bookingNumber === handoff.bookingNumber,
    );
    if (handoff.intentRefund && !onCurrentPage && focusLoading) return;

    const result = resolveAdminBookingHandoff(
      handoff,
      data?.items,
      focusBooking?.bookingStatus,
    );
    if (result.expandBookingNumber) {
      setTab("ALL");
      setExpandedId(result.expandBookingNumber);
    }
    setAppliedHandoffKey(key);
    if (result.refundBlocked) {
      toast.error(
        mapErrorToMessage(ERROR_CODES.BOOKING_CANCEL_NOT_ALLOWED, ""),
      );
      stripHandoffIntent();
      return;
    }
    if (result.refundTarget) {
      setRefundTarget(result.refundTarget);
    }
    stripHandoffIntent();
  }, [
    appliedHandoffKey,
    data,
    focusBooking?.bookingStatus,
    focusLoading,
    isLoading,
    searchParams,
    setSearchParams,
  ]);

  function stripHandoffIntent() {
    if (searchParams.get("intent") == null) return;
    const next = new URLSearchParams(searchParams);
    next.delete("intent");
    setSearchParams(next, { replace: true });
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    setExpandedId(null);
  }

  function handlePageChange(next: number) {
    setPage(next);
    setExpandedId(null);
  }

  function handleRefund(bookingNumber: string) {
    setRefundTarget(bookingNumber);
  }

  function handleCloseRefundModal() {
    setRefundTarget(null);
    stripHandoffIntent();
  }

  async function handleConfirmRefund() {
    if (!refundTarget) return;
    const target = refundTarget;
    setRequestedRefunds((prev) => new Set(prev).add(target));
    try {
      await refundMutation.mutateAsync(target);
      toast.success(
        "환불을 요청했습니다. 목록이 환불 중으로 바뀌면 처리가 시작된 것입니다.",
      );
      setRefundTarget(null);
      stripHandoffIntent();
    } catch (error: unknown) {
      setRequestedRefunds((prev) => {
        const next = new Set(prev);
        next.delete(target);
        return next;
      });
      toast.error(ApiError.fromUnknown(error).message);
    }
  }

  const statsPending = isStatsLoading && !stats;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider bg-admin-dark-bg text-admin-text px-2 py-1 rounded">
            ORDER MANAGEMENT
          </span>
          <h1 className="text-3xl font-bold mt-2">예매 내역 관리</h1>
          <p className="text-sm text-admin-text-secondary mt-1">
            전체 티켓 예매 내역을 조회하고 관리합니다
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="px-4 py-2 rounded-lg bg-admin-dark-bg border-2 border-admin-dark-border flex items-center gap-2"
        >
          <ArrowLeft size={16} /> 대시보드
        </button>
      </div>

      {isStatsError && !stats ? (
        <p className="text-sm text-red-400">예매 통계를 불러올 수 없습니다.</p>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Ticket size={24} />}
          badge="TOTAL"
          badgeColor="purple"
          iconClassName="text-admin-kpi-events"
          value={
            statsPending ? "..." : formatAdminCount(stats?.totalBookings)
          }
          label="전체 예매"
          hint="모든 상태"
        />
        <StatCard
          icon={<CheckSquare size={24} />}
          badge="COMPLETED"
          badgeColor="green"
          iconClassName="text-admin-kpi-tickets"
          value={
            statsPending ? "..." : formatAdminCount(stats?.completedBookings)
          }
          label="완료된 예매"
          hint="결제 완료만"
        />
        <StatCard
          icon={<DollarSign size={24} />}
          badge="REVENUE"
          badgeColor="orange"
          iconClassName="text-admin-kpi-revenue"
          value={statsPending ? "..." : formatAdminWon(stats?.totalRevenue)}
          label="총 매출"
          hint="결제 완료 금액 합"
        />
        <StatCard
          icon={<UserMinus size={24} />}
          badge="CANCELED"
          badgeColor="red"
          iconClassName="text-admin-status-cancelled"
          value={
            statsPending ? "..." : formatAdminCount(stats?.canceledBookings)
          }
          label="취소된 예매"
          hint="취소·환불 완료 (만료 제외)"
        />
      </div>

      {stats?.revenueComplete === false ? (
        <p className="text-xs text-amber-600">
          결제 금액이 없는 확정 예매
          {stats.missingAmountBookings > 0
            ? ` ${stats.missingAmountBookings.toLocaleString()}건`
            : ""}
          이 있어 표시된 총 매출이 실제보다 작을 수 있습니다.
        </p>
      ) : null}

      <div>
        <div className="bg-admin-card border border-admin-border rounded-xl p-2 flex gap-1 inline-flex">
          {(["ALL", "CONFIRMED", "PENDING", "CANCELED"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                tab === t
                  ? "bg-primary text-white font-semibold"
                  : "text-admin-text-secondary hover:bg-admin-border/50"
              }`}
            >
              {labelFor(t)}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-admin-text-secondary mt-2">
          이 탭은 지금 보고 있는 페이지의 예매만 걸러 보여 줍니다.
        </p>
      </div>

      {focusBookingNumber ? (
        <FocusBookingCard
          bookingNumber={focusBookingNumber}
          booking={focusBooking}
          isLoading={focusLoading}
          isError={focusError}
          requestedRefunds={requestedRefunds}
          onRefund={handleRefund}
        />
      ) : null}

      <div className="bg-admin-card border-2 border-admin-dark-border rounded-xl p-6">
        <span className="text-[10px] font-bold tracking-wider bg-admin-dark-bg text-admin-text px-2 py-0.5 rounded inline-block mb-2">
          ORDERS LIST
        </span>
        <h3 className="text-base font-bold mb-4 text-admin-text">
          {isPlaceholderData
            ? `${data?.pagination.totalElements ?? 0}개의 예매`
            : listHeading(
                data?.pagination.totalElements,
                visibleItems.length,
                tab,
              )}
        </h3>

        {isLoading && !data ? (
          <div className="text-center py-12 text-admin-text-secondary">
            불러오는 중...
          </div>
        ) : isError && !data ? (
          lastTotalPages.current != null ? (
            <>
              <div className="text-center py-12 text-red-400">
                이 페이지를 불러올 수 없습니다. 다른 페이지를 확인해 주세요.
              </div>
              <Pagination
                pageIndex={page}
                totalPages={lastTotalPages.current}
                onChange={handlePageChange}
              />
            </>
          ) : (
            <div className="text-center py-12 text-red-400">
              예매 내역을 불러올 수 없습니다.
            </div>
          )
        ) : isPlaceholderData ? (
          <>
            <div className="text-center py-12 text-admin-text-secondary">
              불러오는 중...
            </div>
            <Pagination
              pageIndex={page}
              totalPages={totalPages}
              onChange={handlePageChange}
            />
          </>
        ) : !pageHasRows ? (
          <div className="text-center py-12 text-admin-text-secondary">
            예매 내역이 없습니다.
          </div>
        ) : (
          <>
            {filterEmpty ? (
              <div className="text-center py-12 text-admin-text-secondary">
                이 페이지에는 해당 상태의 예매가 없습니다. 다른 페이지를 확인해
                주세요.
              </div>
            ) : (
              <AdminBookingTable
                data={visibleItems}
                onRefund={handleRefund}
                expandedId={expandedId}
                onExpandedIdChange={setExpandedId}
                focusedBookingNumber={focusBookingNumber}
              />
            )}
            <Pagination
              pageIndex={page}
              totalPages={totalPages}
              onChange={handlePageChange}
            />
          </>
        )}
      </div>

      {refundTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-card border border-admin-border rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold mb-2">환불을 요청하시겠습니까?</h3>
            <p className="text-sm text-admin-text-secondary mb-4">
              예매번호 <span className="font-mono">{refundTarget}</span>의 환불을
              요청합니다. 요청 직후 상태는 환불 중이며, 입금 완료는 PG 처리 뒤에
              환불 완료로 바뀝니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCloseRefundModal}
                disabled={refundMutation.isPending}
                className="py-2 rounded bg-admin-border"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={refundMutation.isPending}
                className="py-2 rounded text-white font-bold bg-admin-refund"
              >
                {refundMutation.isPending ? "처리 중..." : "환불 요청"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function listHeading(
  totalElements: number | undefined,
  visibleCount: number,
  tab: Tab,
): string {
  if (totalElements == null) return "불러오는 중...";
  if (tab === "ALL") {
    return `${totalElements}개의 예매 (${visibleCount}개 중)`;
  }
  return `${totalElements}개의 예매 · 이 페이지 ${visibleCount}건`;
}

const FOCUS_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "완료",
  CANCELED: "취소",
  PENDING: "대기",
  EXPIRED: "만료",
  REFUNDING: "환불 중",
  REFUNDED: "환불 완료",
};

function FocusBookingCard({
  bookingNumber,
  booking,
  isLoading,
  isError,
  requestedRefunds,
  onRefund,
}: {
  bookingNumber: string;
  booking: AdminBookingBookerResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  requestedRefunds: ReadonlySet<string>;
  onRefund: (bookingNumber: string) => void;
}) {
  const status = overlayRequestedRefundStatus(
    booking?.bookingStatus,
    booking?.bookingNumber ?? bookingNumber,
    requestedRefunds,
  );
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
      <span className="text-[10px] font-bold tracking-wider bg-admin-dark-bg text-admin-text px-2 py-0.5 rounded inline-block mb-2">
        FOCUSED BOOKING
      </span>
      <h3 className="text-base font-bold mb-4">선택한 예매</h3>
      {isLoading ? (
        <p className="text-sm text-admin-text-secondary">불러오는 중...</p>
      ) : isError || !booking ? (
        <p className="text-sm text-red-400">
          예매번호 {bookingNumber} 를 찾을 수 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 text-sm">
            <FocusField label="예매번호" value={booking.bookingNumber} mono />
            <FocusField
              icon={<User size={14} />}
              label="이름"
              value={formatAdminText(booking.bookerName)}
            />
            <FocusField
              icon={<Mail size={14} />}
              label="이메일"
              value={formatAdminText(booking.bookerEmail)}
            />
            <FocusField
              label="상태"
              value={
                status
                  ? (FOCUS_STATUS_LABEL[status] ?? status)
                  : formatAdminText(undefined)
              }
            />
          </div>
          <div className="space-y-3 text-sm">
            <FocusField
              label="공연"
              value={formatAdminText(booking.performanceTitle)}
            />
            <FocusField
              label="좌석"
              value={formatAdminText(booking.seatNumber)}
            />
            <FocusField
              label="예매일시"
              value={formatAdminDateTime(booking.bookedAt)}
            />
            <FocusField
              label="결제 금액"
              value={formatAdminWon(booking.paymentAmount)}
            />
            {status === "CONFIRMED" && (
              <button
                type="button"
                onClick={() => onRefund(booking.bookingNumber)}
                className="w-full mt-1 py-3 rounded font-bold text-white bg-admin-refund"
              >
                환불 요청
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FocusField({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon && <div className="text-admin-text-secondary">{icon}</div>}
      <div>
        <p className="text-[10px] text-admin-text-secondary">{label}</p>
        <p className={`font-semibold ${mono ? "font-mono text-blue-400" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function labelFor(t: Tab) {
  switch (t) {
    case "ALL":
      return "전체";
    case "CONFIRMED":
      return "완료";
    case "PENDING":
      return "대기·환불 중";
    case "CANCELED":
      return "취소";
    default:
      return t;
  }
}
