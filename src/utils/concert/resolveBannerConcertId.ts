import type { BannerItem } from "@/types/domain/banner";
import type { ConcertSummary, Genre } from "@/types/domain/concert";

type BannerConcertHint = {
  keywords: string[];
  genres: Genre[];
};

/**
 * 서버 `linkConcertId`가 없을 때 쓰는 시드 배너 힌트.
 *
 * 백엔드 latest develop (`BannerDataInitRunner`, `Banner` prod INSERT 런북)은
 * `link_performance_id`를 넣지 않는다. Jackson NON_NULL이라 `link_concert_id`
 * 키 자체가 빠지고, 프론트는 클릭을 끈다. 배너 제목과 공연 제목도 다르다
 * (Summer Jazz Night ≠ 재즈 페스타 서울 2025 / Jazz Night Live).
 * 알려진 시드 3건만 키워드·장르로 목록에서 고른다.
 */
const SEED_BANNER_HINTS: Record<string, BannerConcertHint> = {
  "Summer Jazz Night": {
    keywords: ["jazz", "재즈"],
    genres: ["JAZZ"],
  },
  "K-Pop Mega Concert": {
    keywords: ["bts", "k-pop", "kpop"],
    genres: ["CONCERT"],
  },
  "Classical Gala": {
    keywords: ["classical", "클래식", "시향", "교향", "beethoven"],
    genres: ["CLASSIC"],
  },
};

export type BannerConcertRef = Pick<BannerItem, "title" | "linkConcertId">;
export type ConcertLinkCandidate = Pick<
  ConcertSummary,
  "id" | "title" | "performer" | "genre"
>;

function includesNormalized(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function matchesKeyword(
  concert: ConcertLinkCandidate,
  keywords: string[],
): boolean {
  return keywords.some(
    (keyword) =>
      includesNormalized(concert.title, keyword) ||
      includesNormalized(concert.performer, keyword),
  );
}

/**
 * 배너 클릭 대상 공연 ID.
 * 서버가 준 `linkConcertId`를 우선하고, 없으면 시드 힌트로 목록에서 고른다.
 * 후보가 여러 개면 장르가 맞는 쪽을 쓰고, 그래도 여럿이면 목록 앞의 것을 쓴다.
 * 힌트도 후보도 없으면 undefined — 클릭 비활성.
 */
export function resolveBannerConcertId(
  banner: BannerConcertRef,
  concerts: ConcertLinkCandidate[],
): number | undefined {
  if (banner.linkConcertId) return banner.linkConcertId;

  const hint = SEED_BANNER_HINTS[banner.title];
  if (!hint || concerts.length === 0) return undefined;

  const keywordHits = concerts.filter((concert) =>
    matchesKeyword(concert, hint.keywords),
  );
  if (keywordHits.length === 1) return keywordHits[0].id;
  if (keywordHits.length > 1) {
    const genreHits = keywordHits.filter((concert) =>
      hint.genres.includes(concert.genre),
    );
    return (genreHits[0] ?? keywordHits[0]).id;
  }

  const genreOnly = concerts.filter((concert) =>
    hint.genres.includes(concert.genre),
  );
  return genreOnly.length === 1 ? genreOnly[0].id : undefined;
}
