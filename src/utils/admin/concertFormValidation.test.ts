import { describe, expect, it } from "vitest";

import {
  MAX_CONCERT_FUTURE_YEARS,
  MAX_DURATION_MINUTES,
  MAX_TICKET_PRICE,
  MAX_TOTAL_SEATS,
  isPositiveInteger,
  isValidDate,
  isValidTime,
  sanitizeConcertForm,
  validateConcertForm,
} from "./concertFormValidation";

const baseForm = {
  title: "테스트 공연",
  performer: "테스트 출연진",
  genre: "MUSICAL",
  date: "2026-09-10",
  time: "19:30",
  durationMinutes: 120,
  venue: "테스트 공연장",
  address: "서울시 어딘가",
  price: 100000,
  description: "테스트 공연 설명",
  notices: ["공연 10분 전 입장"],
  facilities: [{ icon: "parking", label: "주차 가능" }],
};

describe("isValidDate", () => {
  it("실제로 존재하는 날짜를 허용한다", () => {
    expect(isValidDate("2026-09-10")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
  });

  it("존재하지 않는 날짜를 거부한다", () => {
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2027-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026-00-10")).toBe(false);
  });

  it("YYYY-MM-DD 형식이 아니면 거부한다", () => {
    expect(isValidDate("2026-9-10")).toBe(false);
    expect(isValidDate("26-09-10")).toBe(false);
    expect(isValidDate("20260910")).toBe(false);
  });
});

describe("isValidTime", () => {
  it("00:00부터 23:59까지 허용한다", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("09:30")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
  });

  it("잘못된 시간을 거부한다", () => {
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("29:68")).toBe(false);
    expect(isValidTime("19:60")).toBe(false);
    expect(isValidTime("9:30")).toBe(false);
  });
});

describe("isPositiveInteger", () => {
  it("양의 정수만 허용한다", () => {
    expect(isPositiveInteger(1)).toBe(true);
    expect(isPositiveInteger(100)).toBe(true);

    expect(isPositiveInteger(0)).toBe(false);
    expect(isPositiveInteger(-1)).toBe(false);
    expect(isPositiveInteger(1.5)).toBe(false);
  });
});

describe("validateConcertForm", () => {
  const today = new Date(2026, 8, 10);

  it("정상적인 폼은 null을 반환한다", () => {
    expect(
      validateConcertForm({
        form: baseForm,
        totalSeats: 100,
        today,
      }),
    ).toBeNull();
  });

  it("과거 날짜를 거부한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          date: "2026-09-09",
        },
        totalSeats: 100,
        today,
      }),
    ).toBe("과거 날짜는 공연 날짜로 선택할 수 없습니다.");
  });

  it("오늘 날짜는 허용한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          date: "2026-09-10",
        },
        totalSeats: 100,
        today,
      }),
    ).toBeNull();
  });

  it("최대 미래 날짜 경계값은 허용한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          date: `${2026 + MAX_CONCERT_FUTURE_YEARS}-09-10`,
        },
        totalSeats: 100,
        today,
      }),
    ).toBeNull();
  });

  it("최대 미래 날짜를 초과하면 거부한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          date: `${2026 + MAX_CONCERT_FUTURE_YEARS}-09-11`,
        },
        totalSeats: 100,
        today,
      }),
    ).not.toBeNull();
  });

  it("러닝타임 최대값은 허용한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          durationMinutes: MAX_DURATION_MINUTES,
        },
        totalSeats: 100,
        today,
      }),
    ).toBeNull();
  });

  it("러닝타임 최대값 초과는 거부한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          durationMinutes: MAX_DURATION_MINUTES + 1,
        },
        totalSeats: 100,
        today,
      }),
    ).not.toBeNull();
  });

  it("러닝타임 소수는 거부한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          durationMinutes: 1.5,
        },
        totalSeats: 100,
        today,
      }),
    ).not.toBeNull();
  });

  it("티켓 가격 최대값은 허용한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          price: MAX_TICKET_PRICE,
        },
        totalSeats: 100,
        today,
      }),
    ).toBeNull();
  });

  it("티켓 가격 최대값 초과는 거부한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          price: MAX_TICKET_PRICE + 1,
        },
        totalSeats: 100,
        today,
      }),
    ).not.toBeNull();
  });

  it("총 좌석 수 최대값은 허용한다", () => {
    expect(
      validateConcertForm({
        form: baseForm,
        totalSeats: MAX_TOTAL_SEATS,
        today,
      }),
    ).toBeNull();
  });

  it("총 좌석 수 최대값 초과는 거부한다", () => {
    expect(
      validateConcertForm({
        form: baseForm,
        totalSeats: MAX_TOTAL_SEATS + 1,
        today,
      }),
    ).not.toBeNull();
  });

  it("필수 문자열이 공백뿐이면 거부한다", () => {
    expect(
      validateConcertForm({
        form: {
          ...baseForm,
          title: "   ",
        },
        totalSeats: 100,
        today,
      }),
    ).toBe("공연명을 입력해주세요.");
  });
});

describe("sanitizeConcertForm", () => {
  it("문자열을 trim하고 빈 안내/편의시설을 제거한다", () => {
    const result = sanitizeConcertForm({
      ...baseForm,
      title: "  테스트 공연  ",
      performer: "  테스트 출연진  ",
      venue: "  공연장  ",
      address: "  주소  ",
      description: "  설명  ",
      notices: ["  안내 1  ", "", "   ", "안내 2"],
      facilities: [
        { icon: "parking", label: "  주차 가능  " },
        { icon: "wifi", label: "   " },
      ],
    });

    expect(result.title).toBe("테스트 공연");
    expect(result.performer).toBe("테스트 출연진");
    expect(result.venue).toBe("공연장");
    expect(result.address).toBe("주소");
    expect(result.description).toBe("설명");

    expect(result.notices).toEqual(["안내 1", "안내 2"]);

    expect(result.facilities).toEqual([
      {
        icon: "parking",
        label: "주차 가능",
      },
    ]);
  });
});