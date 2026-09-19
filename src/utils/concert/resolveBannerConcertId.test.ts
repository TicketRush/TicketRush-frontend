import { describe, expect, it } from "vitest";
import type { ConcertLinkCandidate } from "./resolveBannerConcertId";
import { resolveBannerConcertId } from "./resolveBannerConcertId";

function concert(
  partial: Partial<ConcertLinkCandidate> & Pick<ConcertLinkCandidate, "id">,
): ConcertLinkCandidate {
  return {
    title: "Untitled",
    performer: "Unknown",
    genre: "CONCERT",
    ...partial,
  };
}

describe("resolveBannerConcertId", () => {
  it("서버 linkConcertId가 있으면 목록과 무관하게 그대로 쓴다", () => {
    expect(
      resolveBannerConcertId(
        { title: "Summer Jazz Night", linkConcertId: 99 },
        [concert({ id: 4, title: "Jazz Night Live", genre: "JAZZ" })],
      ),
    ).toBe(99);
  });

  it("시드 배너 제목과 mock 공연을 연결한다", () => {
    const concerts = [
      concert({
        id: 1,
        title: "BTS World Tour: Beyond the Stars",
        performer: "BTS",
        genre: "CONCERT",
      }),
      concert({
        id: 3,
        title: "Classical Evening: Beethoven Symphony",
        genre: "CLASSIC",
      }),
      concert({ id: 4, title: "Jazz Night Live", genre: "JAZZ" }),
    ];

    expect(
      resolveBannerConcertId({ title: "Summer Jazz Night" }, concerts),
    ).toBe(4);
    expect(
      resolveBannerConcertId({ title: "K-Pop Mega Concert" }, concerts),
    ).toBe(1);
    expect(resolveBannerConcertId({ title: "Classical Gala" }, concerts)).toBe(
      3,
    );
  });

  it("백엔드 local 시드 공연 제목과도 연결한다", () => {
    const concerts = [
      concert({ id: 10, title: "레미제라블", genre: "MUSICAL" }),
      concert({
        id: 11,
        title: "BTS World Tour 2025 : CONNECT",
        performer: "BTS",
        genre: "CONCERT",
      }),
      concert({
        id: 12,
        title: "서울시향 브람스 교향곡 전집",
        genre: "CLASSIC",
      }),
      concert({ id: 13, title: "재즈 페스타 서울 2025", genre: "JAZZ" }),
    ];

    expect(
      resolveBannerConcertId({ title: "Summer Jazz Night" }, concerts),
    ).toBe(13);
    expect(
      resolveBannerConcertId({ title: "K-Pop Mega Concert" }, concerts),
    ).toBe(11);
    expect(resolveBannerConcertId({ title: "Classical Gala" }, concerts)).toBe(
      12,
    );
  });

  it("키워드가 여러 개면 장르가 맞는 공연을 고른다", () => {
    expect(
      resolveBannerConcertId({ title: "Summer Jazz Night" }, [
        concert({ id: 1, title: "Jazz Brunch Talk", genre: "CONCERT" }),
        concert({ id: 2, title: "Jazz Night Live", genre: "JAZZ" }),
      ]),
    ).toBe(2);
  });

  it("키워드가 없고 장르 후보가 하나일 때만 장르로 고른다", () => {
    expect(
      resolveBannerConcertId({ title: "Summer Jazz Night" }, [
        concert({ id: 8, title: "나윤선 트리오", genre: "JAZZ" }),
      ]),
    ).toBe(8);

    expect(
      resolveBannerConcertId({ title: "Summer Jazz Night" }, [
        concert({ id: 8, title: "나윤선 트리오", genre: "JAZZ" }),
        concert({ id: 9, title: "말로 밴드", genre: "JAZZ" }),
      ]),
    ).toBeUndefined();
  });

  it("모르는 배너 제목이고 서버 ID도 없으면 연결하지 않는다", () => {
    expect(
      resolveBannerConcertId({ title: "Unknown Promo" }, [
        concert({ id: 4, title: "Jazz Night Live", genre: "JAZZ" }),
      ]),
    ).toBeUndefined();
  });

  it("목록이 비어 있으면 서버 ID가 있을 때만 연결한다", () => {
    expect(
      resolveBannerConcertId({ title: "Summer Jazz Night" }, []),
    ).toBeUndefined();
    expect(
      resolveBannerConcertId(
        { title: "Summer Jazz Night", linkConcertId: 4 },
        [],
      ),
    ).toBe(4);
  });
});
