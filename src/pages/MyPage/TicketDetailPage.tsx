import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  Mail,
  X,
} from "lucide-react";
import { useBookingDetail } from "@/hooks/queries/useBookingDetail";
import { useBookingPoster } from "@/hooks/queries/useBookingPoster";
import { useTicketQr } from "@/hooks/queries/useTicketQr";
import { useCountdownTo } from "@/hooks/useCountdownTo";
import useAuthStore from "@/stores/global/authStore";
import { downloadTicket } from "@/utils/ticket/downloadTicket";
import {
  displayBookingText,
  formatPaymentAmount,
  canFetchTicketQr,
  bookingQrPlaceholder,
  ticketDetailHeading,
} from "@/utils/booking";
import { formatBackendDateTimeLabel } from "@/utils/booking/parseBackendDateTime";
import {
  TicketDownloadActions,
  TicketInfoBox,
  TicketPoster,
  TicketQrCard,
} from "@/components/ticket/TicketUi";
import { copyBookingNumber } from "@/utils/ticket/copyBookingNumber";

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
  const posterUrl = useBookingPoster(
    data?.performanceId,
    data?.performanceImageMainUrl,
  );
  const { data: qrData, isLoading: isQrLoading } = useTicketQr(
    data && canFetchTicketQr(data.status) ? data.bookingId : undefined,
  );
  const remainingMs = useCountdownTo(qrData?.expiresAt);

  const ticketRef = useRef<HTMLDivElement>(null);
  const [showSeatMap, setShowSeatMap] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  const [showTooltip, setShowTooltip] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(
      () => setShowTooltip(false),
      TOOLTIP_AUTO_HIDE_MS,
    );
    return () => {
      window.clearTimeout(t);
      if (longPressTimer.current !== null) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
  }, []);

  if (!bookingNumber) return <Navigate to="/reservations/mypage" replace />;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-secondary">
          티켓 정보 불러오는 중...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white border border-border rounded-xl p-12 text-center text-error">
          티켓 정보를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  const isConfirmed = canFetchTicketQr(data.status);
  const heading = ticketDetailHeading(data.status);

  function handleDownload() {
    if (!isConfirmed) return;
    downloadTicket(ticketRef.current, `ticket-${data!.bookingNumber}.png`);
  }

  function handlePressStart() {
    setShowTooltip(false);
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
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div ref={ticketRef} className="bg-white">
        <div className="text-center mb-8">
          {isConfirmed ? (
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-green-100 mb-3">
              <CheckCircle size={64} className="text-green-600" />
            </div>
          ) : data.status === "PENDING" ? (
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-amber-100 mb-3">
              <Clock size={64} className="text-amber-700" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-gray-100 mb-3">
              <AlertCircle size={64} className="text-text-secondary" />
            </div>
          )}
          <h1 className="text-3xl font-bold mb-1">{heading.title}</h1>
          <p className="text-lg text-text-secondary">{heading.subtitle}</p>
        </div>

        <div className="bg-white rounded-xl shadow-card overflow-hidden mb-6 p-8 space-y-6">
          <TicketPoster
            src={posterUrl}
            alt={displayBookingText(data.performanceTitle)}
          />
          <h2 className="text-3xl font-bold truncate">
            {displayBookingText(data.performanceTitle)}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <TicketInfoBox
              icon={<Calendar size={16} className="text-primary" />}
              label="날짜"
              value={displayBookingText(data.performanceDate)}
            />
            <TicketInfoBox
              icon={<Clock size={16} className="text-primary" />}
              label="시간"
              value={displayBookingText(data.performanceTime)}
            />
            <TicketInfoBox
              icon={<MapPin size={16} className="text-primary" />}
              label="장소"
              value={displayBookingText(data.performanceVenue)}
            />
            <TicketInfoBox
              icon={<MapPin size={16} className="text-primary" />}
              label="좌석"
              value={displayBookingText(data.seatNumber)}
              className="cursor-pointer select-none active:bg-secondary"
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={handlePressEnd}
              onPointerCancel={handlePressEnd}
            >
              {showTooltip && (
                <div
                  data-html2canvas-ignore="true"
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-primary text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 flex items-center gap-1"
                >
                  <span>좌석을 길게 눌러 위치를 확인하세요</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTooltip(false);
                    }}
                    className="ml-1 hover:opacity-70"
                    aria-label="툴팁 닫기"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </TicketInfoBox>
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-border pt-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-secondary">예매 번호</p>
              <p className="text-xl font-bold font-mono text-primary truncate">
                {data.bookingNumber}
              </p>
            </div>
            <button
              type="button"
              data-html2canvas-ignore="true"
              onClick={() => copyBookingNumber(data.bookingNumber)}
              className="shrink-0 rounded-button bg-primary px-3 py-1 text-xs font-semibold text-white shadow-button hover:opacity-90"
            >
              복사하기
            </button>
          </div>
        </div>

        {/* 다운로드본에 예매자·금액은 포함하고, 입장 QR만 뺀다 (Figma 정책) */}
        <div className="bg-white rounded-xl shadow-card p-8 mb-6 space-y-6">
          <h3 className="text-lg font-bold">예매자 정보</h3>
          <div className="space-y-3">
            <PersonRow
              icon={<UserIcon size={20} />}
              label="이름"
              value={user?.name ?? "-"}
            />
            <PersonRow
              icon={<Mail size={20} />}
              label="이메일"
              value={user?.email ?? "-"}
            />
            <PersonRow
              icon={<Calendar size={20} />}
              label="예매일"
              value={formatBackendDateTimeLabel(data.paidAt)}
            />
            <div className="rounded-input border-2 border-primary bg-primary/10 px-4 py-4">
              <p className="text-xs text-primary mb-1">총 결제 금액</p>
              <p className="text-2xl font-bold text-primary">
                {formatPaymentAmount(data.price)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <TicketQrCard
        isConfirmed={isConfirmed}
        isQrLoading={isQrLoading}
        qrData={qrData}
        placeholder={bookingQrPlaceholder(data.status)}
        remainingMs={remainingMs}
      />

      <TicketDownloadActions
        showDownload={isConfirmed}
        onDownload={handleDownload}
        primaryLabel="내 예매로"
        onPrimary={() => navigate("/reservations/mypage")}
      />

      {showSeatMap && (
        <SeatMapPopover
          seatLabel={data.seatNumber}
          onClose={() => setShowSeatMap(false)}
        />
      )}
    </div>
  );
}

function SeatMapPopover({
  seatLabel,
  onClose,
}: {
  seatLabel: string;
  onClose: () => void;
}) {
  const [rowChar, colStr] = seatLabel.split("-");
  const targetCol = Number(colStr);

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

        <div className="flex justify-center mb-3">
          <div className="px-6 py-1 rounded border-2 border-primary text-primary font-semibold text-xs">
            🎤 STAGE
          </div>
        </div>

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

        <div className="bg-primary/5 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-text-secondary">내 좌석</p>
          <p className="text-base font-bold text-primary">{seatLabel}</p>
        </div>
      </div>
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
    <div className="flex items-center gap-3 bg-secondary border-2 border-border rounded-input px-4 py-4">
      <div className="text-text-secondary shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-base font-bold truncate">{value}</p>
      </div>
    </div>
  );
}
