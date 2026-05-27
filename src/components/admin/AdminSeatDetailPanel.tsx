import { Clock, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminSeatDetail } from "@/types/domain/admin";

interface AdminSeatDetailPanelProps {
  detail: AdminSeatDetail | undefined;
  isLoading: boolean;
  onRelease: (seatId: number) => void;
  onRefund: (seatId: number) => void;
  onShowReserver: (seatId: number) => void;
}

export default function AdminSeatDetailPanel({
  detail,
  isLoading,
  onRelease,
  onRefund,
  onShowReserver,
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

  if (!detail) {
    return (
      <Panel title="좌석 상세 정보">
        <div className="text-center py-8 text-admin-text-secondary">
          <AlertCircle size={32} className="mx-auto mb-2" />
          <p className="text-sm">좌석을 선택하여</p>
          <p className="text-sm">상세 정보를 확인하세요</p>
          <p className="text-[10px] mt-2 opacity-70">(예약 가능한 좌석은 선택 불가)</p>
        </div>
      </Panel>
    );
  }

  // 상태별 분기
  if (detail.status === "HOLD") {
    return <HoldDetail detail={detail} onRelease={onRelease} />;
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
        <p className="text-base font-bold mb-1">{detail.seatLabel}</p>
        <p className="text-sm text-seat-available">예약 가능</p>
      </div>
    </Panel>
  );
}

// ── HOLD 좌석 상세 ────────────────────────────────────
function HoldDetail({
  detail,
  onRelease,
}: {
  detail: AdminSeatDetail;
  onRelease: (seatId: number) => void;
}) {
  // 카운트다운 (mock의 holdRemainingSec를 실시간으로 줄임)
  const [remaining, setRemaining] = useState(detail.holdRemainingSec ?? 0);
  useEffect(() => {
    setRemaining(detail.holdRemainingSec ?? 0);
  }, [detail.holdRemainingSec, detail.seatId]);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <Panel title="좌석 상세 정보">
      <div className="text-center mb-4">
        <div className="inline-block bg-seat-holding text-gray-800 px-4 py-2 rounded font-bold text-lg mb-2">
          {detail.seatLabel}
        </div>
        <p className="text-xs text-admin-text-secondary">예약 진행중 (타이머)</p>
      </div>

      {/* 타이머 박스 */}
      <div className="bg-yellow-900/30 border border-yellow-700/50 rounded p-4 text-center mb-4">
        <div className="flex items-center justify-center gap-2 text-yellow-300 text-xs mb-1">
          <Clock size={14} /> 타이머 진행중
        </div>
        <div className="text-3xl font-bold text-yellow-300">
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </div>
        <p className="text-[10px] text-yellow-300/70 mt-1">남은 시간</p>
      </div>

      <Field label="예약자" value={detail.reservedBy ?? "-"} />
      <Field
        label="예약 시간"
        value={detail.reservedAt ?? "-"}
      />

      <p className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2 mt-4">
        관리자 작업
      </p>
      <button
        type="button"
        onClick={() => onRelease(detail.seatId)}
        className="w-full py-3 rounded font-bold text-white"
        style={{ backgroundColor: "#942D12" }}
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
  onRefund: (seatId: number) => void;
  onShowReserver: (seatId: number) => void;
}) {
  return (
    <Panel title="좌석 상세 정보">
      <div className="text-center mb-4">
        <div className="inline-block bg-seat-sold text-gray-800 px-4 py-2 rounded font-bold text-lg mb-2">
          {detail.seatLabel}
        </div>
        <p className="text-xs text-admin-text-secondary">판매 완료</p>
      </div>

      <Field label="예약자" value={detail.reservedBy ?? "-"} />
      <Field
        label="예약 시간"
        value={
          detail.reservedAt
            ? new Date(detail.reservedAt).toLocaleString("ko-KR")
            : "-"
        }
      />

      <p className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2 mt-4">
        관리자 작업
      </p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onRefund(detail.seatId)}
          className="w-full py-3 rounded font-bold text-white"
          style={{ backgroundColor: "#942D12" }}
        >
          환불 처리
        </button>
        <button
          type="button"
          onClick={() => onShowReserver(detail.seatId)}
          className="w-full py-3 rounded font-bold text-white"
          style={{ backgroundColor: "#414B59" }}
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
