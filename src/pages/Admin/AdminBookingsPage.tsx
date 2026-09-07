// 예매 내역 관리 — 이미지 4
import { useState } from "react";
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
import StatCard from "@/components/admin/StatCard";
import AdminBookingTable from "@/components/admin/AdminBookingTable";
import Pagination from "@/components/admin/Pagination";
import {
  useAdminBookings,
  useAdminBookingByNumber,
  useAdminBookingStats,
  useAdminRefundBooking,
} from "@/hooks/admin/useAdmin";
import type { AdminBookingBookerResponse } from "@/api/adminSeatMapper";
import type { BookingStatus } from "@/types/domain/booking";
import {
  formatAdminCount,
  formatAdminDateTime,
  formatAdminText,
  formatAdminWon,
} from "@/utils/admin/formatAdminMetric";

type Tab = BookingStatus | "ALL";

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("ALL");
  const [page, setPage] = useState(0);
  const [refundTarget, setRefundTarget] = useState<string | null>(null);

  const focusBookingNumber = searchParams.get("bookingNumber")?.trim() || null;
  // intent=refund 는 예매 환불 실연동(#174)에서 확인 모달을 열 때 쓴다.
  const { data, isLoading, isError: bookingsError } = useAdminBookings({
    page,
    size: 10,
    status: tab,
  });
  const { data: stats, isError: statsError } = useAdminBookingStats();
  const {
    data: focusBooking,
    isLoading: focusLoading,
    isError: focusError,
  } = useAdminBookingByNumber(focusBookingNumber);
  const refundMutation = useAdminRefundBooking();

  async function handleRefund(bookingNumber: string) {
    setRefundTarget(bookingNumber);
  }

  async function handleConfirmRefund() {
    if (!refundTarget) return;
    try {
      await refundMutation.mutateAsync(refundTarget);
      toast.success("환불 처리가 완료되었습니다.");
      setRefundTarget(null);
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error("환불 처리에 실패했습니다.");
      toast.error(err.message);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-1 rounded">
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

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Ticket size={24} />}
          badge="TOTAL"
          badgeColor="purple"
          value={
            statsError ? formatAdminCount(undefined) : (stats?.totalBookings ?? 0)
          }
          label="전체 예매"
        />
        <StatCard
          icon={<CheckSquare size={24} />}
          badge="COMPLETED"
          badgeColor="green"
          value={
            statsError
              ? formatAdminCount(undefined)
              : (stats?.completedBookings ?? 0)
          }
          label="완료된 예매"
        />
        <StatCard
          icon={<DollarSign size={24} />}
          badge="REVENUE"
          badgeColor="orange"
          value={
            statsError
              ? formatAdminWon(undefined)
              : `₩${(stats?.totalRevenue ?? 0).toLocaleString()}`
          }
          label="총 매출"
        />
        <StatCard
          icon={<UserMinus size={24} />}
          badge="CANCELED"
          badgeColor="red"
          value={
            statsError
              ? formatAdminCount(undefined)
              : (stats?.cancelledBookings ?? 0)
          }
          label="취소된 예매"
        />
      </div>

      {/* 필터 탭 */}
      <div className="bg-admin-card border border-admin-border rounded-xl p-2 flex gap-1 inline-flex">
        {(["ALL", "CONFIRMED", "PENDING", "CANCELED"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setPage(0);
            }}
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

      {focusBookingNumber && (
        <FocusBookingCard
          bookingNumber={focusBookingNumber}
          booking={focusBooking}
          isLoading={focusLoading}
          isError={focusError}
          onRefund={handleRefund}
        />
      )}

      {/* 테이블 */}
      <div className="bg-white border-2 border-[#D0D0D0] rounded-xl p-6">
        <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2">
          ORDERS LIST
        </span>
        <h3 className="text-base font-bold mb-4 text-gray-900">
          {bookingsError
            ? "예매 목록"
            : data
              ? `${data.pagination.totalElements}개의 예매 (${data.items.length}개 중)`
              : "불러오는 중..."}
        </h3>

        {isLoading ? (
          <div className="text-center py-12 text-admin-text-secondary">
            불러오는 중...
          </div>
        ) : bookingsError ? (
          <div className="text-center py-12 text-red-400">
            예매 내역을 불러올 수 없습니다.
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-12 text-admin-text-secondary">
            예매 내역이 없습니다.
          </div>
        ) : (
          <>
            <AdminBookingTable
              data={data.items}
              onRefund={handleRefund}
              focusedBookingNumber={focusBookingNumber}
            />
            <Pagination
              pageIndex={page}
              totalPages={data.pagination.totalPages}
              onChange={setPage}
            />
          </>
        )}
      </div>

      {/* 환불 확인 모달 */}
      {refundTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-card border border-admin-border rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold mb-2">환불 처리하시겠습니까?</h3>
            <p className="text-sm text-admin-text-secondary mb-4">
              예매번호 <span className="font-mono">{refundTarget}</span> 의 결제
              금액이 사용자에게 환불됩니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                disabled={refundMutation.isPending}
                className="py-2 rounded bg-admin-border"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={refundMutation.isPending}
                className="py-2 rounded text-white font-bold"
                style={{ backgroundColor: "#931818" }}
              >
                {refundMutation.isPending ? "처리 중..." : "환불 처리"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  onRefund,
}: {
  bookingNumber: string;
  booking: AdminBookingBookerResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRefund: (bookingNumber: string) => void;
}) {
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
      <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2">
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
                booking.bookingStatus
                  ? (FOCUS_STATUS_LABEL[booking.bookingStatus] ??
                    booking.bookingStatus)
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
            {booking.bookingStatus === "CONFIRMED" && (
              <button
                type="button"
                onClick={() => onRefund(booking.bookingNumber)}
                className="w-full mt-1 py-3 rounded font-bold text-white"
                style={{ backgroundColor: "#931818" }}
              >
                환불 처리
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
      return "대기";
    case "CANCELED":
      return "취소";
    default:
      return t;
  }
}
