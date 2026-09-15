// AdminSeatDetailPanel — 예매자 이름은 좌석 응답이 아니라 예매 단건 조합값.
import { Clock, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AdminSeatDetail } from "@/types/domain/admin";
import {
  formatAdminDateTime,
  formatAdminText,
} from "@/utils/admin/formatAdminMetric";

const BOOKER_LOAD_FAILED = "불러오지 못했습니다";

function bookerText(detail: AdminSeatDetail): string {
  if (detail.bookerLoadFailed) return BOOKER_LOAD_FAILED;
  return formatAdminText(detail.reservedBy);
}

function bookedAtText(detail: AdminSeatDetail): string {
  if (detail.status !== "HOLD" && detail.bookerLoadFailed) {
    return BOOKER_LOAD_FAILED;
  }
  return formatAdminDateTime(detail.reservedAt);
}

interface AdminSeatDetailPanelProps {
  detail: AdminSeatDetail | undefined;
  isLoading: boolean;
  isError?: boolean;
  isReleasing?: boolean;
  onRelease: (seatId: number, bookingNumber?: string) => void;
  onRefund: (bookingNumber?: string) => void;
  onShowReserver: (bookingNumber?: string) => void;
  onHoldExpired?: () => void;
}

export default function AdminSeatDetailPanel({
  detail,
  isLoading,
  isError = false,
  isReleasing = false,
  onRelease,
  onRefund,
  onShowReserver,
  onHoldExpired,
}: AdminSeatDetailPanelProps) {
  if (isLoading) {
    return (
      <Panel>
        <div className="text-center text-admin-text-secondary py-8">
          불러오는 중...
        </div>
      </Panel>
    );
  }

  if (isError && !detail) {
    return (
      <Panel title="좌석 상세 정보">
        <div className="text-center py-8 text-red-400">
          <AlertCircle size={32} className="mx-auto mb-2" />
          <p className="text-sm">좌석 상세를 불러올 수 없습니다.</p>
        </div>
      </Panel>
    );
  }

  if (!detail) {
    return (
      <Panel title="좌석 상세 정보">
        <div className="text-center py-8 text-admin-text-secondary">
          <AlertCircle size={32} className="mx-auto mb-2" />
          <p className="text-sm">좌석을 선택하여</p>
          <p className="text-sm">상세 정보를 확인하세요</p>
          <p className="text-[10px] mt-2 opacity-70">
            (예약 가능한 좌석은 선택 불가)
          </p>
        </div>
      </Panel>
    );
  }

  // 상태별 분기
  if (detail.status === "HOLD") {
    return (
      <HoldDetail
        key={detail.seatId}
        detail={detail}
        isReleasing={isReleasing}
        onRelease={onRelease}
        onHoldExpired={onHoldExpired}
      />
    );
  }
  if (detail.status === "SOLD") {
    return (
      <SoldDetail
        detail={detail}
        onRefund={onRefund}
        onShowReserver={onShowReserver}
      />
    );
  }
  return (
    <Panel title="좌석 상세 정보">
      <div className="text-center py-8">
        <p className="text-base font-bold mb-1">{detail.seatNumber}</p>
        <p className="text-sm text-admin-seat-available">예약 가능</p>
      </div>
    </Panel>
  );
}

// ── HOLD 좌석 상세 ────────────────────────────────────
function HoldDetail({
  detail,
  isReleasing,
  onRelease,
  onHoldExpired,
}: {
  detail: AdminSeatDetail;
  isReleasing: boolean;
  onRelease: (seatId: number, bookingNumber?: string) => void;
  onHoldExpired?: () => void;
}) {
  const [remaining, setRemaining] = useState(detail.holdRemainingSec ?? 0);
  const notifiedExpire = useRef(false);

  useEffect(() => {
    const next = detail.holdRemainingSec ?? 0;
    setRemaining(next);
  }, [detail.holdRemainingSec, detail.seatId]);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  useEffect(() => {
    if (remaining > 0) {
      notifiedExpire.current = false;
      return;
    }
    if (notifiedExpire.current) return;
    notifiedExpire.current = true;
    onHoldExpired?.();
  }, [remaining, onHoldExpired]);

  const expired = remaining <= 0;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <Panel title="좌석 상세 정보">
      <div className="text-center mb-4">
        <div className="inline-block bg-admin-seat-holding text-gray-800 px-4 py-2 rounded font-bold text-lg mb-2">
          {detail.seatNumber}
        </div>
        <p className="text-xs text-admin-text-secondary">
          {expired ? "선점 만료" : "예약 진행중 (타이머)"}
        </p>
      </div>

      <div
        className={`rounded p-4 text-center mb-4 border ${
          expired
            ? "bg-red-900/30 border-red-700/50"
            : "bg-yellow-900/30 border-yellow-700/50"
        }`}
      >
        <div
          className={`flex items-center justify-center gap-2 text-xs mb-1 ${
            expired ? "text-red-300" : "text-yellow-300"
          }`}
        >
          <Clock size={14} /> {expired ? "타이머 만료" : "타이머 진행중"}
        </div>
        <div
          className={`text-3xl font-bold ${
            expired ? "text-red-300" : "text-yellow-300"
          }`}
        >
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </div>
        <p
          className={`text-[10px] mt-1 ${
            expired ? "text-red-300/80" : "text-yellow-300/70"
          }`}
        >
          {expired
            ? "맵은 잠시 HOLD로 남을 수 있습니다. 새로고침하거나 강제 해제하세요."
            : "남은 시간"}
        </p>
      </div>

      <Field label="예약자" value={bookerText(detail)} />
      <Field label="예약 시간" value={bookedAtText(detail)} />

      <p className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2 mt-4">
        관리자 작업
      </p>
      <button
        type="button"
        onClick={() => onRelease(detail.seatId, detail.bookingNumber)}
        disabled={isReleasing}
        className="w-full py-3 rounded font-bold text-white bg-admin-refund disabled:opacity-50"
      >
        예약 해제
      </button>
    </Panel>
  );
}

// ── SOLD 좌석 상세 ────────────────────────────────────
function SoldDetail({
  detail,
  onRefund,
  onShowReserver,
}: {
  detail: AdminSeatDetail;
  onRefund: (bookingNumber?: string) => void;
  onShowReserver: (bookingNumber?: string) => void;
}) {
  return (
    <Panel title="좌석 상세 정보">
      <div className="text-center mb-4">
        <div className="inline-block bg-admin-seat-sold text-gray-800 px-4 py-2 rounded font-bold text-lg mb-2">
          {detail.seatNumber}
        </div>
        <p className="text-xs text-admin-text-secondary">판매 완료</p>
      </div>

      <Field label="예약자" value={bookerText(detail)} />
      <Field label="예약 시간" value={bookedAtText(detail)} />

      <p className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2 mt-4">
        관리자 작업
      </p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onRefund(detail.bookingNumber)}
          className="w-full py-3 rounded font-bold text-white bg-admin-refund"
        >
          환불 처리
        </button>
        <button
          type="button"
          onClick={() => onShowReserver(detail.bookingNumber)}
          className="w-full py-3 rounded font-bold text-white bg-admin-resend"
        >
          예매자 정보 보기
        </button>
      </div>
    </Panel>
  );
}

// ── 헬퍼 ──────────────────────────────────────────────
function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-4 sticky top-4">
      {title && (
        <p className="text-xs text-admin-text-secondary mb-3">{title}</p>
      )}
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] text-admin-text-secondary mb-1">{label}</p>
      <div className="bg-admin-bg/70 rounded px-3 py-2 text-sm font-semibold">
        {value}
      </div>
    </div>
  );
}
