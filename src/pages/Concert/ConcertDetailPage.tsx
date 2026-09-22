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
// - 2026-08-27 (이슈 #98):
//   - 포스터와 제목 분리: 포스터는 스크롤, 제목 카드만 sticky (lg:top-16)
//   - 포스터/갤러리 없을 때 samplePoster 대신 poster-fallback 그라데이션
//   - 갤러리 비면 섹션 숨김, venue===address면 주소 박스 숨김
//   - InfoBox 원형 아이콘, 섹션/주소/편의시설 border-2 + shadow-card
//   - 소개 비면 섹션 숨김. 모바일은 제목 다음 예매 박스, 제목 sticky는 lg만
// - 2026-08-31 (이슈 #203):
//   - 상세 게이지는 목록 캐시 우선, 없으면 seat-counts(totalCount - soldCount)
//   - 상세 totalSeats(등록값) 미사용. 예매 CTA는 availableCount (#181)
// - 2026-09-15 (이슈 #297):
//   - InfoBox·출연 등 핵심 메타 미입력 시 「미정」 (섹션형 필드는 기존처럼 숨김)
// - 2026-09-18 (이슈 #322):
//   - 포스터·갤러리는 없거나 깨져도 PosterFrame으로 그라데이션 자리와 안내 유지
//   - 공연 소개는 핵심 섹션이라 비어도 숨기지 않고 빈 상태 문구 표시
//   - 편의시설·갤러리는 부가 정보라 기존 숨김 유지 (하이브리드)
//   - 제목 미입력 시 「미정」
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
  ImageOff,
} from "lucide-react";
import { useConcertDetail } from "@/hooks/queries/useConcertDetail";
import { useConcertListItem } from "@/hooks/queries/useConcertListItem";
import { useSeatCounts } from "@/hooks/queries/useSeats";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";
import Button from "@/components/common/Button/Button";
import ImageViewer from "@/components/common/ImageViewer";
import GenreBadge from "@/components/concert/GenreBadge";
import BookingSidebar from "@/components/concert/BookingSidebar";
import CharacterModelViewer from "@/components/admin/character/CharacterModelViewer";
import ErrorBoundary from "@/components/common/ErrorBoundary/ErrorBoundary";
import type { CharacterDraft } from "@/types/domain/character";
import { restoreCharacterForDisplay } from "@/utils/character/characterConfig";
import { useConcertStore } from "@/stores/reservation/concertStore";
import {
  canBookConcert,
  shouldFetchSeatCounts,
} from "@/utils/concert/canBookConcert";
import { getDetailGaugeSeats } from "@/utils/concert/getDetailGaugeSeats";
import {
  formatShowScheduleLabel,
  trimOrNull,
  UNSET_LABEL,
} from "@/utils/concert/formatOptionalText";

const POSTER_FALLBACK =
  "bg-gradient-to-b from-poster-fallback to-poster-fallback-end";

const EMPTY_POSTER_LABEL = "등록된 포스터가 없습니다";
const EMPTY_DESCRIPTION_LABEL = "등록된 공연 소개가 없습니다.";

export default function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setConcert = useConcertStore((s) => s.setConcert);
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const concertId = id ? Number(id) : undefined;
  const { data, isLoading, isError } = useConcertDetail(concertId);
  const listItem = useConcertListItem(concertId);
  // ON_SALE일 때만 seat-counts 조회 (#177). 그 외 상태는 "-" 표시
  const shouldFetchSeats = !!data && shouldFetchSeatCounts(data.status);
  const {
    data: seatCounts,
    isLoading: seatCountsLoading,
    isError: seatCountsError,
  } = useSeatCounts(concertId, shouldFetchSeats);

  useDocumentTitle(trimOrNull(data?.title) ?? "공연 상세");

  if (!concertId || isNaN(concertId))
    return <Navigate to="/concerts" replace />;

  const listBackButton = (
    <Button
      variant="outline"
      size="sm"
      className="mb-4"
      icon={<ArrowLeft size={14} />}
      onClick={() => navigate("/concerts")}
    >
      공연 목록으로
    </Button>
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        {listBackButton}
        <div className="bg-white border-2 border-border rounded-xl p-12 text-center text-text-secondary">
          공연 정보 불러오는 중...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        {listBackButton}
        <div className="bg-white border-2 border-border rounded-xl p-12 text-center text-error">
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
  const remaining = seatsReady ? seatCounts.availableCount : null;
  const { remaining: gaugeRemaining, total: gaugeTotal } = getDetailGaugeSeats(
    listItem,
    seatCounts,
    seatsReady,
  );

  // 예매 가능: ON_SALE + seat-counts 성공 + availableCount > 0 (#181)
  const isOnSale = canBookConcert({
    status: data.status,
    seatsReady,
    remaining,
    surface: "detail",
  });

  // 빈 문자열 venue는 없는 것과 같다. 실 API는 venue/address가 둘 다 도로명.
  const venueDisplay =
    trimOrNull(data.venue) ?? trimOrNull(data.address);
  const address = trimOrNull(data.address);
  const showAddressBox = Boolean(
    address && address !== venueDisplay,
  );
  const galleryUrls = (data.imageGalleryUrls ?? []).filter((url) => trimOrNull(url));
  const description = trimOrNull(data.description) ?? "";
  const title = trimOrNull(data.title);
  const imageSubject = title ?? "공연";
  const performer = trimOrNull(data.performer);
  const showDate = trimOrNull(data.showDate);
  const scheduleLabel = formatShowScheduleLabel(
    data.showTime,
    data.durationMinutes,
  );

  const characterConfig = restoreCharacterForDisplay(data.characterConfig);
  const characterMessage = typeof data.characterMessage === "string"
    ? data.characterMessage.trim() : "";

  function handleBooking() {
    setConcert({
      id: data!.id,
      title: data!.title,
      price: data!.price,
      showDate: data!.showDate,
      showTime: data!.showTime,
      venue: venueDisplay ?? "",
      // optional 메타데이터 — 결제 페이지에서 활용
      performer: data!.performer,
      genre: data!.genre,
      imageMainUrl: data!.imageMainUrl,
      address: data!.address,
      durationMinutes: data!.durationMinutes,
      ...(seatsReady
        ? {
            totalSeats: seatCounts.totalCount,
            remainingSeats: remaining ?? undefined,
          }
        : {}),
      status: data!.status,
    });
    navigate(`/concerts/${data!.id}/seats`);
  }

  const bookingSidebar = (
    <BookingSidebar
      gaugeRemaining={gaugeRemaining}
      gaugeTotal={gaugeTotal}
      remaining={remaining}
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
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {listBackButton}

      {/* 포스터는 sticky 대상이 아님. 깨진 이미지도 그라데이션 자리를 유지한다. */}
      <PosterFrame
        key={data.imageMainUrl}
        src={data.imageMainUrl}
        alt={`${imageSubject} 포스터`}
        className="mb-6 aspect-[4/3] rounded-xl shadow-card"
        iconSize={40}
        label={EMPTY_POSTER_LABEL}
        onView={(url, alt) => setSelectedImage({ url, alt })}
      />

      {/*
        모바일 순서: 제목 → 예매 박스 → 본문. 제목 sticky는 lg만 (좁은 화면에서 카드가 뷰포트를 먹지 않게).
        데스크톱: 제목+본문 | 사이드바(row-span). 사이드바는 그리드 직접 자식이어야 sticky.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 items-start">
        <div className="order-1 lg:sticky lg:top-16 z-10 bg-white border-2 border-border rounded-xl p-6 shadow-card lg:col-start-1 lg:row-start-1">
          <h1
            className={`text-3xl font-bold ${
              title ? "text-text" : "text-placeholder"
            }`}
          >
            {title ?? UNSET_LABEL}
          </h1>
          <p
            className={`mt-1 ${
              performer ? "text-text-secondary" : "text-placeholder"
            }`}
          >
            {performer ?? UNSET_LABEL}
          </p>
          <div className="mt-3">
            <GenreBadge genre={data.genre} />
          </div>
        </div>

        <div className="order-3 space-y-4 min-w-0 lg:order-none lg:col-start-1 lg:row-start-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBox
              icon={<Calendar size={20} className="text-primary" />}
              label="공연일"
              value={showDate ?? ""}
            />
            <InfoBox
              icon={<Clock size={20} className="text-primary" />}
              label="시간"
              value={scheduleLabel}
            />
            <InfoBox
              icon={<MapPin size={20} className="text-primary" />}
              label="장소"
              value={venueDisplay ?? ""}
            />
            <InfoBox
              icon={<DollarSign size={20} className="text-primary" />}
              label="가격"
              value={`₩${data.price.toLocaleString()}`}
            />
          </div>

          {showAddressBox && address && (
            <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 flex items-start gap-3">
              <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-text-secondary">공연장 주소</p>
                <p className="text-sm font-semibold mt-0.5">{address}</p>
              </div>
            </div>
          )}

          {/* 소개는 핵심 정보라 비어도 섹션을 남긴다. 부가 섹션만 숨김 (#322) */}
          <Section title="공연 소개">
            {description ? (
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {description}
              </p>
            ) : (
              <p className="text-sm text-placeholder">
                {EMPTY_DESCRIPTION_LABEL}
              </p>
            )}
          </Section>

          {data.facilities && data.facilities.length > 0 && (
            <Section title="편의시설 및 서비스">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.facilities.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 border-2 border-border rounded-lg text-sm"
                  >
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {galleryUrls.length > 0 && (
            <Section title="공연장 갤러리">
              <div className="grid grid-cols-3 gap-3">
                {galleryUrls.map((src, i) => (
                  <PosterFrame
                    key={`${src}-${i}`}
                    src={src}
                    alt={`${imageSubject} 갤러리 ${i + 1}`}
                    className="aspect-square rounded-lg"
                    iconSize={24}
                    onView={(url, alt) => setSelectedImage({ url, alt })}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>

        {characterConfig ? (
          <div className="order-2 space-y-4 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-16 [&>div]:lg:static">
            {bookingSidebar}
            <ErrorBoundary key={data.id} fallback={<></>}>
              <CharacterPreviewCard characterConfig={characterConfig} message={characterMessage} />
            </ErrorBoundary>
          </div>
        ) : bookingSidebar}
      </div>
      <ImageViewer open={selectedImage !== null} imageUrl={selectedImage?.url ?? ""}
        alt={selectedImage?.alt ?? ""} onClose={() => setSelectedImage(null)} />
    </div>
  );
}

// 운영 정책 기본 유의사항 (백엔드 응답에 notices 없어 프론트 fallback)
const DEFAULT_NOTICES = [
  "예매 후 취소/환불은 공연 7일 전까지 가능합니다.",
  "공연 당일 티켓과 신분증을 지참해주세요.",
  "미성년자는 보호자 동반이 필요합니다.",
];

/**
 * 포스터·갤러리 공용 프레임.
 * src가 없거나 로드에 실패해도 그라데이션 자리를 유지하고 빈 상태를 드러낸다.
 * 실패 상태는 src 단위라 호출측에서 key={src}로 리셋한다.
 */
function PosterFrame({
  src,
  alt,
  className,
  iconSize,
  label,
  onView,
}: {
  src: string;
  alt: string;
  className: string;
  iconSize: number;
  label?: string;
  onView: (url: string, alt: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(trimOrNull(src)) && !failed;

  return (
    <div className={`overflow-hidden ${POSTER_FALLBACK} ${className}`}>
      {showImage ? (
        <button type="button" aria-label={`${alt} 전체보기`} onClick={() => onView(src, alt)}
          className="block h-full w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
        </button>
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="w-full h-full flex flex-col items-center justify-center gap-2 text-placeholder"
        >
          <ImageOff size={iconSize} aria-hidden />
          {label && <p className="text-sm font-medium">{label}</p>}
        </div>
      )}
    </div>
  );
}

function CharacterPreviewCard({
  message,
  characterConfig,
}: {
  message: string;
  characterConfig: CharacterDraft;
}) {
  const floatingRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element =
      floatingRef.current;

    if (!element) {
      return;
    }

    const prefersReducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

    if (
      prefersReducedMotion
    ) {
      return;
    }

    let animationFrameId = 0;

    const startedAt =
      performance.now();

    const animate = (
      now: number,
    ) => {
      const elapsed =
        now - startedAt;

      const offsetY =
        Math.sin(
          elapsed / 700,
        ) * 4;

      element.style.transform =
        `translateY(${offsetY}px)`;

      animationFrameId =
        window.requestAnimationFrame(
          animate,
        );
    };

    animationFrameId =
      window.requestAnimationFrame(
        animate,
      );

    return () => {
      window.cancelAnimationFrame(
        animationFrameId,
      );

      element.style.transform =
        "";
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-xl border-2 border-border bg-white shadow-card">
      <div className="px-4 pt-5">
        <p className="mb-3 text-xs font-bold tracking-wide text-text-secondary">
          공연 3D 캐릭터
        </p>

        {message && <div className="relative mx-auto max-w-[260px] rounded-2xl border-2 border-primary/20 bg-primary/5 px-4 py-3 text-center">
          <p className="break-words text-sm font-semibold leading-relaxed text-text">
            {message}
          </p>

          <div
            aria-hidden="true"
            className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-primary/20 bg-primary/5"
          />
        </div>}
      </div>

      <div
        className="relative mt-1 h-[320px] w-full overflow-hidden"
        style={{
          backgroundColor:
            characterConfig.background,
        }}
      >
        <div
          ref={floatingRef}
          className="absolute inset-0 will-change-transform"
        >
          <CharacterModelViewer
            {...characterConfig}
            centered
            modelScale={0.9}
          />
        </div>
      </div>

      <div className="border-t-2 border-border px-4 py-3 text-center">
        <p className="text-xs text-text-secondary">
          드래그해서 캐릭터를 회전해보세요.
        </p>
      </div>
    </section>
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
  const display = trimOrNull(value);
  const isUnset = !display;

  return (
    <div className="bg-white border-2 border-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p
          className={`text-sm mt-0.5 truncate ${
            isUnset
              ? "font-medium text-placeholder"
              : "font-semibold text-text"
          }`}
        >
          {display ?? UNSET_LABEL}
        </p>
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
    <div className="bg-white border-2 border-border rounded-xl p-6 shadow-card">
      <h2 className="font-bold mb-3">{title}</h2>
      {children}
    </div>
  );
}
