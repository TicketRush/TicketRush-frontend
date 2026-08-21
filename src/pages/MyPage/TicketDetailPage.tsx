import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Ticket as TicketIcon,
  User as UserIcon,
  Mail,
  Download,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useBookingDetail } from "@/hooks/queries/useBookingDetail";
import { useTicketQr } from "@/hooks/queries/useTicketQr";
import { useCountdownTo } from "@/hooks/useCountdownTo";
import useAuthStore from "@/stores/global/authStore";
import { downloadTicket } from "@/utils/ticket/downloadTicket";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const COLS_CNT = 12;
const LONG_PRESS_MS = 500;
const TOOLTIP_AUTO_HIDE_MS = 3000;

// 팝오버 열린 직후 이 시간 동안은 배경 클릭 무시 (즉시 닫힘 방지)
const POPOVER_CLICK_GUARD_MS = 200;

export default function TicketDetailPage() {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError } = useBookingDetail(bookingNumber);
  const { data: qrData, isLoading: isQrLoading } = useTicketQr(data?.bookingId);
  const remainingMs = useCountdownTo(qrData?.expiresAt);

  // 다운로드 영역 ref
  const ticketRef = useRef<HTMLDivElement>(null);

  // 좌석 맵 팝오버 상태
  const [showSeatMap, setShowSeatMap] = useState(false);

  // long-press 감지용 타이머
  const longPressTimer = useRef<number | null>(null);

  // 진입 시 안내 툴팁 (3초 자동 닫힘)
  const [showTooltip, setShowTooltip] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(
      () => setShowTooltip(false),
      TOOLTIP_AUTO_HIDE_MS,
    );
    return () => window.clearTimeout(t);
  }, []);

  if (!bookingNumber) return <Navigate to="/reservations/mypage" replace />;

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-secondary">
          티켓 정보 불러오는 중...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white border border-border rounded-xl p-12 text-center text-error">
          티켓 정보를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  const isTicketUsable = !qrData || qrData.ticketStatus === "UNUSED";
  const isExpiringSoon = !!qrData && remainingMs > 0 && remainingMs < 30_000;
  const remainingLabel = `${Math.floor(remainingMs / 60000)}:${String(
    Math.floor((remainingMs % 60000) / 1000),
  ).padStart(2, "0")}`;

  // ── 다운로드 (#91) — 공통 유틸 사용 ─────────────────
  function handleDownload() {
    downloadTicket(ticketRef.current, `ticket-${data!.bookingNumber}.png`);
  }

  // ── long-press 핸들러 (#92) ─────────────────────────
  function handlePressStart() {
    setShowTooltip(false); // 인터랙션 시작 시 툴팁 닫기
    longPressTimer.current = window.setTimeout(() => {
      setShowSeatMap(true);
    }, LONG_PRESS_MS);
  }

  function handlePressEnd() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      {/* ─── 다운로드 캡처 영역 시작 ─── */}
      <div ref={ticketRef} className="bg-white">
        {/* 상단: 티켓 확인 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
            <CheckCircle size={36} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-1">티켓 확인</h1>
          <p className="text-sm text-text-secondary">티켓 정보를 확인하세요</p>
        </div>

        {/* 공연 정보 카드 */}
        <div className="bg-white border-2 border-border rounded-2xl overflow-hidden mb-6">
          {/* 포스터 영역 */}
          <div className="bg-primary/5 aspect-[5/2] flex items-center justify-center">
            {data.performanceImageMainUrl ? (
              <img
                src={data.performanceImageMainUrl}
                alt={data.performanceTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center text-primary/50">
                <Calendar size={28} />
                <span className="text-xs mt-1">공연 포스터</span>
              </div>
            )}
          </div>

          <div className="p-5">
            <h2 className="text-lg font-bold mb-4">{data.performanceTitle}</h2>

            {/* 디테일 2x2 — 좌석 칸은 long-press 영역 */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <InfoBox
                icon={<Calendar size={14} />}
                label="날짜"
                value={data.performanceDate}
              />
              <InfoBox
                icon={<Clock size={14} />}
                label="시간"
                value={data.performanceTime}
              />
              <InfoBox
                icon={<MapPin size={14} />}
                label="장소"
                value={data.performanceVenue}
              />
              {/* 좌석 — long-press로 좌석맵 표시 */}
              <div
                className="relative bg-gray-50 rounded-lg p-3 cursor-pointer select-none active:bg-gray-100 transition"
                onPointerDown={handlePressStart}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
                onPointerCancel={handlePressEnd}
              >
                <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                  <TicketIcon size={14} />
                  <span>좌석</span>
                </div>
                <p className="text-sm font-bold truncate">{data.seatNumber}</p>

                {/* 진입 시 안내 툴팁 — 좌석 박스 아래로 배치 (body transform으로 위쪽 좌표 밀림 대응) */}
                {showTooltip && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-primary text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 flex items-center gap-1">
                    <span>좌석을 길게 눌러 위치를 확인하세요</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTooltip(false);
                      }}
                      className="ml-1 hover:opacity-70"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 예매 번호 */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-xs text-text-secondary">예매 번호</p>
                <p className="text-sm font-bold font-mono text-primary">
                  {data.bookingNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* QR 코드 */}
        <div className="bg-white border-2 border-border rounded-2xl p-6 mb-6">
          <p className="text-center text-sm font-semibold mb-4">입장 QR 코드</p>
          <div className="flex items-center justify-center mb-4">
            <div className="w-44 h-44 bg-white border-2 border-primary rounded-xl flex items-center justify-center p-3 relative">
              {isQrLoading && !qrData ? (
                <span className="text-xs text-text-secondary">QR 발급 중...</span>
              ) : qrData ? (
                <QRCodeSVG
                  value={qrData.payload}
                  size={152}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#6C5CE7"
                />
              ) : (
                <span className="text-xs text-error">
                  QR 코드를 불러올 수 없습니다.
                </span>
              )}
              {!isTicketUsable && (
                <div className="absolute inset-0 bg-white/85 rounded-xl flex items-center justify-center">
                  <span className="text-sm font-bold text-text-secondary">
                    {qrData?.ticketStatus === "USED"
                      ? "입장 완료된 티켓"
                      : "취소된 티켓"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-text-secondary mb-3">
            공연장 입장 시 스캔하세요
          </p>
          {qrData && isTicketUsable && (
            <p
              className={`text-center text-xs mb-3 ${
                isExpiringSoon
                  ? "text-red-500 font-semibold"
                  : "text-text-secondary"
              }`}
            >
              {remainingMs > 0
                ? `QR 만료까지 ${remainingLabel}`
                : "QR 코드 갱신 중..."}
            </p>
          )}
          <div className="text-center">
            <p className="text-xs text-text-secondary">예매 번호</p>
            <p className="text-sm font-bold font-mono text-primary">
              {data.bookingNumber}
            </p>
          </div>
        </div>

        {/* 예매자 정보 */}
        <div className="bg-white border border-border rounded-2xl p-5 mb-6 space-y-3">
          <p className="text-sm font-semibold mb-1">예매자 정보</p>
          <PersonRow
            icon={<UserIcon size={14} />}
            label="이름"
            value={user?.name ?? "-"}
          />
          <PersonRow
            icon={<Mail size={14} />}
            label="이메일"
            value={user?.email ?? "-"}
          />
          <PersonRow
            icon={<Calendar size={14} />}
            label="예매 일시"
            value={new Date(data.createdAt).toLocaleString("ko-KR")}
          />
          {/* 결제 금액 강조 */}
          <div className="bg-primary/5 rounded-lg px-3 py-2.5">
            <p className="text-xs text-text-secondary mb-0.5">총 결제 금액</p>
            <p className="text-lg font-bold text-primary">
              ₩{data.price.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      {/* ─── 다운로드 캡처 영역 끝 ─── */}

      {/* 버튼 (다운로드 영역 밖) */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleDownload}
          className="w-full py-3 rounded-lg bg-gray-100 text-text font-semibold hover:bg-gray-200 inline-flex items-center justify-center gap-2"
        >
          <Download size={16} />
          다운로드
        </button>
        <button
          type="button"
          onClick={() => navigate("/reservations/mypage")}
          className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:opacity-90"
        >
          내 예매로
        </button>
      </div>

      {/* ─── 좌석 맵 팝오버 (#92) ─── */}
      {showSeatMap && (
        <SeatMapPopover
          seatLabel={data.seatNumber}
          onClose={() => setShowSeatMap(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// 좌석 맵 팝오버 — 10행 × 12열 격자에서 본인 좌석 강조
//
// #92 fix: long-press 후 마우스 up 시 배경 클릭으로 팝오버가 즉시 닫히던 문제 수정.
//   → 팝오버 마운트 후 POPOVER_CLICK_GUARD_MS(200ms) 동안은 배경 클릭 무시
// ─────────────────────────────────────────────────────
function SeatMapPopover({
  seatLabel,
  onClose,
}: {
  seatLabel: string;
  onClose: () => void;
}) {
  // seatLabel 예: "A-5" → row="A", col=5
  const [rowChar, colStr] = seatLabel.split("-");
  const targetCol = Number(colStr);

  // 마운트 직후 잠깐 배경 클릭 무시 → 팝오버 열자마자 pointerup으로 닫히는 문제 방지
  const [canClose, setCanClose] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(
      () => setCanClose(true),
      POPOVER_CLICK_GUARD_MS,
    );
    return () => window.clearTimeout(t);
  }, []);

  function handleBackgroundClick() {
    if (canClose) onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
      onClick={handleBackgroundClick}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">좌석 위치</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* STAGE */}
        <div className="flex justify-center mb-3">
          <div className="px-6 py-1 rounded border-2 border-primary text-primary font-semibold text-xs">
            🎤 STAGE
          </div>
        </div>

        {/* 좌석 격자 */}
        <div className="space-y-1 mb-4">
          {ROWS.map((row) => (
            <div key={row} className="flex items-center gap-0.5">
              <div className="w-4 text-[10px] font-bold text-text-secondary text-center">
                {row}
              </div>
              {Array.from({ length: COLS_CNT }).map((_, idx) => {
                const col = idx + 1;
                const isTarget = row === rowChar && col === targetCol;
                return (
                  <div
                    key={col}
                    className={`w-4 h-4 rounded ${
                      isTarget
                        ? "bg-primary ring-2 ring-primary/40 ring-offset-1"
                        : "bg-gray-200"
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* 본인 좌석 라벨 */}
        <div className="bg-primary/5 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-text-secondary">내 좌석</p>
          <p className="text-base font-bold text-primary">{seatLabel}</p>
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-bold truncate">{value}</p>
    </div>
  );
}

function PersonRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="text-text-secondary">{icon}</div>
      <span className="text-xs text-text-secondary w-16 shrink-0">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}
