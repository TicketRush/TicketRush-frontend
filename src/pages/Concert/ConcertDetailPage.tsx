// 공연 상세 페이지 — 7:3 grid 레이아웃 + sticky 사이드바
//
// 변경 이력:
// - 2026-07-15 (이슈 #121):
//   - useSeatCounts 훅으로 잔여 좌석 실 API 조회 (remaining, total)
// - 2026-07-15 (이슈 #122 정리):
//   - useSeatCounts import 경로 정정
// - 2026-08-02 (#134 리뷰):
//   - seat-counts 로딩/실패 시 예매 차단
// - 2026-08-06 (이슈 #177):
//   - ON_SALE일 때만 seat-counts 조회
// - 2026-08-27 (이슈 #98):
//   - 상세 레이아웃 개선
// - 2026-08-31 (이슈 #203):
//   - 상세 게이지 목록 캐시 우선
// - 2026-09-14 (#270):
//   - 공연 상세 우측에 3D 캐릭터 + 말풍선 영역 추가
//   - 개발 환경 mock 캐릭터 사용
//   - 리깅 전 간단한 idle motion 적용
//   - 상세 캐릭터 전체 bounds 기준 자동 중앙 정렬

import {
  useEffect,
  useRef,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import {
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
} from "lucide-react";
import { useConcertDetail } from "@/hooks/queries/useConcertDetail";
import { useConcertListItem } from "@/hooks/queries/useConcertListItem";
import { useSeatCounts } from "@/hooks/queries/useSeats";
import Button from "@/components/common/Button/Button";
import GenreBadge from "@/components/concert/GenreBadge";
import BookingSidebar from "@/components/concert/BookingSidebar";
import CharacterModelViewer from "@/components/admin/character/CharacterModelViewer";
import type { HairStyle } from "@/components/admin/character/characterHair";
import type { EyeStyle } from "@/components/admin/character/characterEye";
import type { OutfitModelId } from "@/components/admin/character/characterOutfit";
import { useConcertStore } from "@/stores/reservation/concertStore";
import {
  canBookConcert,
  shouldFetchSeatCounts,
} from "@/utils/concert/canBookConcert";
import { getDetailGaugeSeats } from "@/utils/concert/getDetailGaugeSeats";

const POSTER_FALLBACK =
  "bg-gradient-to-b from-poster-fallback to-poster-fallback-end";

const MOCK_CHARACTER_CONFIG = {
  skinColor: "#F7C6A8",
  hairColor: "#151515",
  hairStyle: "short" as HairStyle,
  eyeStyle: "squeeze" as EyeStyle,
  outfitModelId: "festival" as OutfitModelId,
  outfitName: "페스티벌",
  outfitColor: "#60A5FA",
  background: "#FFF3D6",
};

const MOCK_CHARACTER_MESSAGE =
  "공연장에서 만나요! 함께 즐겨요 🎵";

function hideBrokenImage(
  event: SyntheticEvent<HTMLImageElement>,
) {
  event.currentTarget.style.display =
    "none";
}

export default function ConcertDetailPage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate =
    useNavigate();

  const setConcert =
    useConcertStore(
      (state) => state.setConcert,
    );

  const concertId =
    id ? Number(id) : undefined;

  const {
    data,
    isLoading,
    isError,
  } = useConcertDetail(concertId);

  const listItem =
    useConcertListItem(concertId);

  const shouldFetchSeats =
    !!data &&
    shouldFetchSeatCounts(
      data.status,
    );

  const {
    data: seatCounts,
    isLoading: seatCountsLoading,
    isError: seatCountsError,
  } = useSeatCounts(
    concertId,
    shouldFetchSeats,
  );

  if (
    !concertId ||
    isNaN(concertId)
  ) {
    return (
      <Navigate
        to="/concerts"
        replace
      />
    );
  }

  const listBackButton = (
    <Button
      variant="outline"
      size="sm"
      className="mb-4"
      icon={
        <ArrowLeft size={14} />
      }
      onClick={() =>
        navigate("/concerts")
      }
    >
      공연 목록으로
    </Button>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        {listBackButton}

        <div className="rounded-xl border-2 border-border bg-white p-12 text-center text-text-secondary">
          공연 정보 불러오는 중...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        {listBackButton}

        <div className="rounded-xl border-2 border-border bg-white p-12 text-center text-error">
          공연 정보를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  const concert = data;

  const seatsReady =
    shouldFetchSeats &&
    !!seatCounts &&
    !seatCountsLoading &&
    !seatCountsError;

  const remaining =
    seatsReady
      ? seatCounts.availableCount
      : null;

  const {
    remaining:
      gaugeRemaining,
    total: gaugeTotal,
  } = getDetailGaugeSeats(
    listItem,
    seatCounts,
    seatsReady,
  );

  const isOnSale =
    canBookConcert({
      status: concert.status,
      seatsReady,
      remaining,
      surface: "detail",
    });

  const venueDisplay =
    concert.venue ||
    concert.address ||
    "";

  const showAddressBox =
    Boolean(
      concert.address &&
        concert.address !==
          venueDisplay,
    );

  const galleryUrls = (
    concert.imageGalleryUrls ??
    []
  ).filter(Boolean);

  const description =
    concert.description?.trim() ??
    "";

  const showMockCharacter =
    import.meta.env.DEV;

  function handleBooking() {
    setConcert({
      id: concert.id,
      title: concert.title,
      price: concert.price,
      showDate:
        concert.showDate,
      showTime:
        concert.showTime,
      venue: venueDisplay,
      performer:
        concert.performer,
      genre: concert.genre,
      imageMainUrl:
        concert.imageMainUrl,
      address:
        concert.address,
      durationMinutes:
        concert.durationMinutes,

      ...(seatsReady
        ? {
            totalSeats:
              seatCounts.totalCount,
            remainingSeats:
              remaining ??
              undefined,
          }
        : {}),

      status: concert.status,
    });

    navigate(
      `/concerts/${concert.id}/seats`,
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {listBackButton}

      <div
        className={`mb-6 aspect-[4/3] overflow-hidden rounded-xl shadow-card ${POSTER_FALLBACK}`}
      >
        {concert.imageMainUrl ? (
          <img
            src={
              concert.imageMainUrl
            }
            alt={`${concert.title} 포스터`}
            className="h-full w-full object-cover"
            onError={
              hideBrokenImage
            }
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[7fr_3fr]">
        <div className="order-1 z-10 rounded-xl border-2 border-border bg-white p-6 shadow-card lg:col-start-1 lg:row-start-1 lg:sticky lg:top-16">
          <h1 className="text-3xl font-bold text-text">
            {concert.title}
          </h1>

          <p className="mt-1 text-text-secondary">
            {concert.performer}
          </p>

          <div className="mt-3">
            <GenreBadge
              genre={
                concert.genre
              }
            />
          </div>
        </div>

        <div className="order-2 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <BookingSidebar
            gaugeRemaining={
              gaugeRemaining
            }
            gaugeTotal={
              gaugeTotal
            }
            remaining={
              remaining
            }
            price={concert.price}
            duration={
              concert.durationMinutes
            }
            isOnSale={
              isOnSale
            }
            status={
              concert.status
            }
            bookingOpenAt={
              concert.bookingOpenAt
            }
            seatsLoading={
              shouldFetchSeats &&
              seatCountsLoading
            }
            seatsError={
              shouldFetchSeats &&
              seatCountsError
            }
            notices={
              concert.notices &&
              concert.notices
                .length > 0
                ? concert.notices
                : DEFAULT_NOTICES
            }
            onBooking={
              handleBooking
            }
          />

          {showMockCharacter && (
            <CharacterPreviewCard
              message={
                MOCK_CHARACTER_MESSAGE
              }
            />
          )}
        </div>

        <div className="order-3 min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoBox
              icon={
                <Calendar
                  size={20}
                  className="text-primary"
                />
              }
              label="공연일"
              value={
                concert.showDate
              }
            />

            <InfoBox
              icon={
                <Clock
                  size={20}
                  className="text-primary"
                />
              }
              label="시간"
              value={`${concert.showTime} (${concert.durationMinutes}분)`}
            />

            <InfoBox
              icon={
                <MapPin
                  size={20}
                  className="text-primary"
                />
              }
              label="장소"
              value={
                venueDisplay
              }
            />

            <InfoBox
              icon={
                <DollarSign
                  size={20}
                  className="text-primary"
                />
              }
              label="가격"
              value={`₩${concert.price.toLocaleString()}`}
            />
          </div>

          {showAddressBox && (
            <div className="flex items-start gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
              <MapPin
                size={16}
                className="mt-0.5 shrink-0 text-primary"
              />

              <div>
                <p className="text-xs text-text-secondary">
                  공연장 주소
                </p>

                <p className="mt-0.5 text-sm font-semibold">
                  {
                    concert.address
                  }
                </p>
              </div>
            </div>
          )}

          {description && (
            <Section title="공연 소개">
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                {
                  concert.description
                }
              </p>
            </Section>
          )}

          {concert.facilities &&
            concert.facilities
              .length > 0 && (
              <Section title="편의시설 및 서비스">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {concert.facilities.map(
                    (
                      facility,
                      index,
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="flex items-center gap-2 rounded-lg border-2 border-border px-3 py-2 text-sm"
                      >
                        <CheckCircle2
                          size={
                            16
                          }
                          className="shrink-0 text-primary"
                        />

                        <span>
                          {
                            facility.label
                          }
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </Section>
            )}

          {galleryUrls.length >
            0 && (
            <Section title="공연장 갤러리">
              <div className="grid grid-cols-3 gap-3">
                {galleryUrls.map(
                  (
                    src,
                    index,
                  ) => (
                    <div
                      key={`${src}-${index}`}
                      className={`aspect-square overflow-hidden rounded-lg ${POSTER_FALLBACK}`}
                    >
                      <img
                        src={
                          src
                        }
                        alt={`${concert.title} 갤러리 ${index + 1}`}
                        className="h-full w-full object-cover"
                        onError={
                          hideBrokenImage
                        }
                      />
                    </div>
                  ),
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_NOTICES = [
  "예매 후 취소/환불은 공연 7일 전까지 가능합니다.",
  "공연 당일 티켓과 신분증을 지참해주세요.",
  "미성년자는 보호자 동반이 필요합니다.",
];

function CharacterPreviewCard({
  message,
}: {
  message: string;
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

        <div className="relative mx-auto max-w-[260px] rounded-2xl border-2 border-primary/20 bg-primary/5 px-4 py-3 text-center">
          <p className="break-words text-sm font-semibold leading-relaxed text-text">
            {message}
          </p>

          <div
            aria-hidden="true"
            className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-primary/20 bg-primary/5"
          />
        </div>
      </div>

      <div
        className="relative mt-1 h-[320px] w-full overflow-hidden"
        style={{
          backgroundColor:
            MOCK_CHARACTER_CONFIG.background,
        }}
      >
        <div
          ref={floatingRef}
          className="absolute inset-0 will-change-transform"
        >
          <CharacterModelViewer
            modelUrl="/models/chibi-base.glb"
            skinColor={
              MOCK_CHARACTER_CONFIG.skinColor
            }
            hairColor={
              MOCK_CHARACTER_CONFIG.hairColor
            }
            outfitColor={
              MOCK_CHARACTER_CONFIG.outfitColor
            }
            outfitName={
              MOCK_CHARACTER_CONFIG.outfitName
            }
            outfitModelId={
              MOCK_CHARACTER_CONFIG.outfitModelId
            }
            hairStyle={
              MOCK_CHARACTER_CONFIG.hairStyle
            }
            eyeStyle={
              MOCK_CHARACTER_CONFIG.eyeStyle
            }

            // 상세 페이지에서만 전체 모델의 실제 bounds를
            // 기준으로 Canvas 정중앙에 배치합니다.
            centered

            // 크기만 설정합니다.
            // x/y 위치를 수동으로 보정하지 않습니다.
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
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-border bg-white p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-text-secondary">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-semibold">
          {value}
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
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-border bg-white p-6 shadow-card">
      <h2 className="mb-3 font-bold">
        {title}
      </h2>

      {children}
    </div>
  );
}