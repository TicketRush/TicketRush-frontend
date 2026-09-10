// 결제 완료 페이지 — `/reservations/:reservationId` 라우트
// 결제 직후 진입 + 마이페이지에서 예매 상세로도 진입
// ※ App.tsx 파라미터명은 reservationId (bookingNumber와 동일 값)
//
// 변경 이력:
// - 이슈 #127: qrPayload = JSON.stringify(...) mock 제거.
//   GET /api/v1/ticket/bookings/{bookingId}/qr 실 API(useTicketQr)로 교체.
// - 이슈 #168: 예매 상세는 GET /api/v1/booking/{bookingNumber} 단건 조회.
//   응답 bookingId로 QR을 조회한다 (딥링크/새로고침에서도 /booking/me 스캔 불필요).
// - 이슈 #105: Figma 결제 완료 레이아웃(포스터·정보 그리드·QR 카드·CTA) 반영.
//   PENDING·취소 헤더는 #168 분기를 유지한다.

import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { CheckCircle, Calendar, Clock, MapPin, AlertCircle } from "lucide-react";
import { useBookingDetail } from "@/hooks/queries/useBookingDetail";
import { useBookingPoster } from "@/hooks/queries/useBookingPoster";
import { useTicketQr } from "@/hooks/queries/useTicketQr";
import { useCountdownTo } from "@/hooks/useCountdownTo";
import useSeatStore from "@/stores/reservation/seatStore";
import usePaymentStore from "@/stores/reservation/paymentStore";
import { useTimerStore } from "@/stores/reservation/timerStore";
import { downloadTicket } from "@/utils/ticket/downloadTicket";
import {
  displayBookingText,
  canFetchTicketQr,
  bookingQrPlaceholder,
  paymentCompleteHeading,
} from "@/utils/booking";
import {
  TicketDownloadActions,
  TicketInfoBox,
  TicketPoster,
  TicketQrCard,
} from "@/components/ticket/TicketUi";

export default function PaymentCompletePage() {
  // App.tsx: path="/reservations/:reservationId"
  const { reservationId: bookingNumber } = useParams<{
    reservationId: string;
  }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useBookingDetail(bookingNumber);
  const posterUrl = useBookingPoster(
    data?.performanceId,
    data?.performanceImageMainUrl,
  );
  const { data: qrData, isLoading: isQrLoading } = useTicketQr(
    data && canFetchTicketQr(data.status) ? data.bookingId : undefined,
  );
  const remainingMs = useCountdownTo(qrData?.expiresAt);

  const resetSeat = useSeatStore((s) => s.reset);
  const resetPayment = usePaymentStore((s) => s.reset);
  const stopTimer = useTimerStore((s) => s.stopTimer);

  // 다운로드 캡처 영역 — Figma 정책상 입장 QR은 포함하지 않는다
  const ticketRef = useRef<HTMLDivElement>(null);

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

  const isConfirmed = canFetchTicketQr(data.status);
  const heading = paymentCompleteHeading(data.status);

  function handleDownload() {
    downloadTicket(ticketRef.current, `ticket-${data!.bookingNumber}.png`);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div ref={ticketRef} className="bg-white">
        <div className="text-center mb-8">
          {isConfirmed ? (
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-green-100 mb-4">
              <CheckCircle size={64} className="text-green-600" />
            </div>
          ) : data.status === "PENDING" ? (
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-amber-100 mb-4">
              <Clock size={64} className="text-amber-700" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center size-24 rounded-full bg-gray-100 mb-4">
              <AlertCircle size={64} className="text-text-secondary" />
            </div>
          )}
          <h1 className="text-3xl font-bold mb-1">{heading.title}</h1>
          <p className="text-text-secondary text-lg">{heading.subtitle}</p>
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
              className="col-span-2"
              icon={<MapPin size={16} className="text-primary" />}
              label="장소"
              value={displayBookingText(data.performanceVenue)}
            />
            <TicketInfoBox
              icon={<MapPin size={16} className="text-primary" />}
              label="좌석"
              value={displayBookingText(data.seatNumber)}
            />
            <TicketInfoBox
              label="예매 번호"
              value={data.bookingNumber}
              mono
            />
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
        onDownload={handleDownload}
        primaryLabel="새 공연 예매하기"
        onPrimary={() => navigate("/")}
      />
    </div>
  );
}
