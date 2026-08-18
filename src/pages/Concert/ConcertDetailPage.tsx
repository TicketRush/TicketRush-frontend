// 공연 상세 페이지 — 7:3 grid 레이아웃 + sticky 사이드바
//
// 변경 이력:
// - 2026-07-15 (이슈 #121):
//   - useSeatCounts 훅으로 잔여 좌석 실 API 조회 (remaining, total)
//   - status enum 정정: isOnSale = status === "ON_SALE"
//     (매진 판단은 seatCounts.availableCount === 0)
//   - venue fallback: venue > address (백엔드 venueName 필드 대기)
//   - concertStore.setConcert에 seatCounts 값 전달
// - 2026-07-15 (이슈 #122 정리):
//   - useSeatCounts import 경로 정정: @/hooks/queries/useSeats
// - 2026-08-02 (#134 리뷰):
//   - seat-counts 로딩/실패 시 totalSeats fallback으로 예매 열지 않음
// - 2026-08-06 (이슈 #177):
//   - ON_SALE일 때만 seat-counts 조회
//   - 잔여 미확정 시 "-" (Sidebar), 예매는 기존처럼 차단
import { useNavigate, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { useConcertDetail } from "@/hooks/queries/useConcertDetail";
import { useSeatCounts } from "@/hooks/queries/useSeats";
import Button from "@/components/common/Button/Button";
import GenreBadge from "@/components/concert/GenreBadge";
import BookingSidebar from "@/components/concert/BookingSidebar";
import { useConcertStore } from "@/stores/reservation/concertStore";
import {
  canBookConcert,
  shouldFetchSeatCounts,
} from "@/utils/concert/canBookConcert";
import samplePoster from "@/assets/images/sample-poster.svg";

export default function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setConcert = useConcertStore((s) => s.setConcert);

  const concertId = id ? Number(id) : undefined;
  const { data, isLoading, isError } = useConcertDetail(concertId);
  // ON_SALE일 때만 seat-counts 조회 (#177). 그 외 상태는 "-" 표시
  const shouldFetchSeats = !!data && shouldFetchSeatCounts(data.status);
  const {
    data: seatCounts,
    isLoading: seatCountsLoading,
    isError: seatCountsError,
  } = useSeatCounts(concertId, shouldFetchSeats);

  if (!concertId || isNaN(concertId))
    return <Navigate to="/concerts" replace />;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-secondary">
          공연 정보 불러오는 중...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white border border-border rounded-xl p-12 text-center text-error">
          공연 정보를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  const seatsReady =
    shouldFetchSeats &&
    !!seatCounts &&
    !seatCountsLoading &&
    !seatCountsError;
  // 표시/예매 판단은 seat-counts 확정 후에만 사용 (미확인 시 null → "-")
  const total = seatsReady
    ? seatCounts.totalCount
    : (data.totalSeats ?? 0);
  const remaining = seatsReady ? seatCounts.availableCount : null;

  // 예매 가능: ON_SALE + seat-counts 성공 + availableCount > 0 (#181 공통)
  const isOnSale = canBookConcert({
    status: data.status,
    seatsReady,
    remaining,
  });

  // venue fallback
  const venueDisplay = data.venue ?? data.address ?? "";

  function handleBooking() {
    setConcert({
      id: data!.id,
      title: data!.title,
      price: data!.price,
      showDate: data!.showDate,
      showTime: data!.showTime,
      venue: venueDisplay,
      // optional 메타데이터 — 결제 페이지에서 활용
      performer: data!.performer,
      genre: data!.genre,
      imageMainUrl: data!.imageMainUrl,
      address: data!.address,
      durationMinutes: data!.durationMinutes,
      totalSeats: total,
      remainingSeats: remaining ?? 0,
      status: data!.status,
    });
    navigate(`/concerts/${data!.id}/seats`);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 상단 — 뒤로가기 */}
      <Button
        variant="outline"
        size="sm"
        className="mb-4"
        icon={<ArrowLeft size={14} />}
        onClick={() => navigate(-1)}
      >
        공연 목록으로
      </Button>

      {/* 7:3 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
        {/* ── 좌측: 콘텐츠 ──────────────────── */}
        <div className="space-y-4">
          {/* 포스터 (4:3) */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <img
              src={data.imageMainUrl || samplePoster}
              alt={`${data.title} 포스터`}
              className="w-full aspect-[4/3] object-cover bg-gray-100"
              onError={(e) => {
                (e.target as HTMLImageElement).src = samplePoster;
              }}
            />
            <div className="p-6">
              <h1 className="text-3xl font-bold text-text">{data.title}</h1>
              <p className="text-text-secondary mt-1">{data.performer}</p>
              <div className="mt-3">
                <GenreBadge genre={data.genre} />
              </div>
            </div>
          </div>

          {/* 공연 정보 — 2x2 박스 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBox
              icon={<Calendar size={16} className="text-primary" />}
              label="공연일"
              value={data.showDate}
            />
            <InfoBox
              icon={<Clock size={16} className="text-primary" />}
              label="시간"
              value={`${data.showTime} (${data.durationMinutes}분)`}
            />
            <InfoBox
              icon={<MapPin size={16} className="text-primary" />}
              label="장소"
              value={venueDisplay}
            />
            <InfoBox
              icon={<DollarSign size={16} className="text-primary" />}
              label="가격"
              value={`₩${data.price.toLocaleString()}`}
            />
          </div>

          {/* 공연장 주소 — 별도 박스 */}
          {data.address && (
            <div className="bg-white border border-border rounded-xl p-4 flex items-start gap-3">
              <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-text-secondary">공연장 주소</p>
                <p className="text-sm font-semibold mt-0.5">{data.address}</p>
              </div>
            </div>
          )}

          {/* 공연 소개 */}
          <Section title="공연 소개">
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {data.description}
            </p>
          </Section>

          {/* 편의시설 및 서비스 */}
          {data.facilities && data.facilities.length > 0 && (
            <Section title="편의시설 및 서비스">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.facilities.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 공연장 갤러리 */}
          <Section title="공연장 갤러리">
            <div className="grid grid-cols-3 gap-3">
              {(data.imageGalleryUrls && data.imageGalleryUrls.length > 0
                ? data.imageGalleryUrls
                : [samplePoster, samplePoster, samplePoster]
              ).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${data.title} 갤러리 ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg bg-gray-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = samplePoster;
                  }}
                />
              ))}
            </div>
          </Section>
        </div>

        {/* ── 우측: sticky 예매 사이드바 ──────────────────── */}
        <div>
          <BookingSidebar
            remaining={remaining}
            total={total}
            price={data.price}
            duration={data.durationMinutes}
            isOnSale={isOnSale}
            status={data.status}
            bookingOpenAt={data.bookingOpenAt}
            seatsLoading={shouldFetchSeats && seatCountsLoading}
            seatsError={shouldFetchSeats && seatCountsError}
            notices={
              data.notices && data.notices.length > 0
                ? data.notices
                : DEFAULT_NOTICES
            }
            onBooking={handleBooking}
          />
        </div>
      </div>
    </div>
  );
}

// 운영 정책 기본 유의사항 (백엔드 응답에 notices 없어 프론트 fallback)
const DEFAULT_NOTICES = [
  "예매 후 취소/환불은 공연 7일 전까지 가능합니다.",
  "공연 당일 티켓과 신분증을 지참해주세요.",
  "미성년자는 보호자 동반이 필요합니다.",
];

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
    <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-6">
      <h2 className="font-bold mb-3">{title}</h2>
      {children}
    </div>
  );
}
