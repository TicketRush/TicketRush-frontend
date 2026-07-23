// 티켓 확인 페이지 — `/reservations/mypage/:bookingNumber`
// 마이페이지에서 "티켓 보기" 클릭 시 진입.
//
// 운영 정책:
//   - 예약 번호 기준 티켓 정보 조회 (useBookingDetail)
//   - 입장용 QR 코드 제공 (티켓마다 고유)
//   - 예매자 정보 표시 (이름/이메일 = authStore, 예매일시/결제금액 = BookingDetail)
//
// ※ 좌석 long-press 맵 / 이미지 다운로드는 범위가 커서 후속 작업 (TODO).
//
// 변경 이력:
// - 이슈 #127: qrPayload = JSON.stringify(...) mock 제거.
//   GET /api/v1/ticket/bookings/{bookingId}/qr 실 API(useTicketQr)로 교체.
//   payload는 발급 후 5분만 유효 — 4분마다 자동 재발급.

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
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useBookingDetail } from "@/hooks/queries/useBookingDetail";
import { useTicketQr } from "@/hooks/queries/useTicketQr";
import { useCountdownTo } from "@/hooks/useCountdownTo";
import useAuthStore from "@/stores/global/authStore";

export default function TicketDetailPage() {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError } = useBookingDetail(bookingNumber);
  const { data: qrData, isLoading: isQrLoading } = useTicketQr(data?.bookingId);
  const remainingMs = useCountdownTo(qrData?.expiresAt);

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

  function handleDownload() {
    // TODO: html2canvas로 티켓 영역 캡처 후 이미지 다운로드
    alert("티켓 다운로드 기능은 추후 구현 예정입니다.");
  }

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      {/* ─── 상단: 티켓 확인 헤더 ─── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
          <CheckCircle size={36} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-1">티켓 확인</h1>
        <p className="text-sm text-text-secondary">티켓 정보를 확인하세요</p>
      </div>

      {/* ─── 공연 정보 카드 ─── */}
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

          {/* 디테일 2x2 */}
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
            <InfoBox
              icon={<TicketIcon size={14} />}
              label="좌석"
              value={data.seatNumber}
            />
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

      {/* ─── QR 코드 ─── */}
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

      {/* ─── 예매자 정보 ─── */}
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

      {/* ─── 버튼 ─── */}
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
