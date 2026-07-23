// 결제 완료 페이지 — `/reservations/:reservationId` 라우트
// 결제 직후 진입 + 마이페이지에서 예매 상세로도 진입
// ※ App.tsx 파라미터명은 reservationId (bookingNumber와 동일 값)
//
// 변경 이력:
// - 이슈 #127: qrPayload = JSON.stringify(...) mock 제거.
//   GET /api/v1/ticket/bookings/{bookingId}/qr 실 API(useTicketQr)로 교체.
//   payload는 발급 후 5분만 유효 — 4분마다 자동 재발급 + expiresAt 도달 시 refetch.

import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { CheckCircle, Calendar, Clock, Music, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useBookingDetail } from "@/hooks/queries/useBookingDetail";
import { useTicketQr } from "@/hooks/queries/useTicketQr";
import { useCountdownTo } from "@/hooks/useCountdownTo";
import useSeatStore from "@/stores/reservation/seatStore";
import usePaymentStore from "@/stores/reservation/paymentStore";
import { useTimerStore } from "@/stores/reservation/timerStore";

export default function PaymentCompletePage() {
  // App.tsx: path="/reservations/:reservationId"
  const { reservationId: bookingNumber } = useParams<{
    reservationId: string;
  }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useBookingDetail(bookingNumber);
  const { data: qrData, isLoading: isQrLoading } = useTicketQr(data?.bookingId);
  const remainingMs = useCountdownTo(qrData?.expiresAt);

  const resetSeat = useSeatStore((s) => s.reset);
  const resetPayment = usePaymentStore((s) => s.reset);
  const stopTimer = useTimerStore((s) => s.stopTimer);

  // 진입 시 예매 플로우 상태 클리어
  useEffect(() => {
    stopTimer();
    resetSeat();
    resetPayment();
  }, [stopTimer, resetSeat, resetPayment]);

  if (!bookingNumber) return <Navigate to="/concerts" replace />;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-secondary">
          예매 정보 불러오는 중...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white border border-border rounded-xl p-12 text-center text-error">
          예매 정보를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  const isTicketUsable = !qrData || qrData.ticketStatus === "UNUSED";
  const isExpiringSoon = !!qrData && remainingMs > 0 && remainingMs < 30_000;
  const remainingLabel = `${Math.floor(remainingMs / 60000)}:${String(
    Math.floor((remainingMs % 60000) / 1000),
  ).padStart(2, "0")}`;

  function handleDownload() {
    // TODO: html2canvas로 티켓 영역 캡처 후 다운로드
    alert("티켓 다운로드 기능은 추후 구현 예정입니다.");
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* 성공 헤더 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
          <CheckCircle size={48} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-1">결제 완료!</h1>
        <p className="text-text-secondary">디지털 티켓이 발급되었습니다</p>
      </div>

      {/* 티켓 카드 */}
      <div className="bg-white border-2 border-border rounded-2xl overflow-hidden mb-6">
        {/* 공연 정보 헤더 */}
        <div className="bg-primary/5 p-6 flex items-center gap-4">
          {data.performanceImageMainUrl ? (
            <img
              src={data.performanceImageMainUrl}
              alt={data.performanceTitle}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Music size={28} className="text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">
              {data.performanceTitle}
            </h2>
            <p className="text-sm text-text-secondary mt-0.5 truncate">
              {data.performanceVenue}
            </p>
          </div>
        </div>

        {/* 디테일 박스 4개 */}
        <div className="p-6 grid grid-cols-2 gap-3">
          <InfoBox
            icon={<Calendar size={14} />}
            label="공연일"
            value={data.performanceDate}
          />
          <InfoBox
            icon={<Clock size={14} />}
            label="시간"
            value={data.performanceTime}
          />
          <InfoBox icon={null} label="좌석" value={data.seatNumber} />
          <InfoBox
            icon={null}
            label="예매 번호"
            value={data.bookingNumber}
            mono
          />
        </div>

        {/* 결제 정보 */}
        <div className="px-6 pb-6 pt-2 border-t border-border space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-text-secondary">결제 금액</span>
            <span className="text-xl font-bold text-primary">
              ₩{data.price.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs text-text-secondary">
            <span>결제일</span>
            <span>
              {data.paidAt
                ? new Date(data.paidAt).toLocaleString("ko-KR")
                : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* QR 코드 */}
      <div className="bg-white border-2 border-primary rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-48 h-48 bg-white border-4 border-primary rounded-xl flex items-center justify-center p-3 relative">
            {isQrLoading && !qrData ? (
              <span className="text-xs text-text-secondary">QR 발급 중...</span>
            ) : qrData ? (
              <QRCodeSVG
                value={qrData.payload}
                size={168}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#1F2937"
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
        <p className="text-center text-sm text-text-secondary">
          공연장 입장 시 스캔하세요
        </p>
        {qrData && isTicketUsable && (
          <p
            className={`text-center text-xs mt-2 ${
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
      </div>

      {/* 버튼들 */}
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
          onClick={() => navigate("/")}
          className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:opacity-90"
        >
          새 공연 예매하기
        </button>
        <button
          type="button"
          onClick={() => navigate("/reservations/mypage")}
          className="w-full py-2.5 rounded-lg bg-white border border-border text-text-secondary text-sm hover:bg-gray-50"
        >
          내 예매 보기
        </button>
      </div>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-sm font-bold truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}
