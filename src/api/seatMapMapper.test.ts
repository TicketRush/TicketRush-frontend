import { describe, expect, it } from "vitest";
import {
  mapSeatMapItem,
  normalizeSeatMapResponse,
  seatsHaveAllCoordinates,
} from "./seatMapMapper";

describe("seatsHaveAllCoordinates", () => {
  it("빈 배열은 false", () => {
    expect(seatsHaveAllCoordinates([])).toBe(false);
  });

  it("모든 좌석에 좌표가 있으면 true", () => {
    expect(
      seatsHaveAllCoordinates([
        { seatRow: 1, seatCol: 1 },
        { seatRow: 1, seatCol: 2 },
      ]),
    ).toBe(true);
  });

  it("하나라도 누락이면 false", () => {
    expect(
      seatsHaveAllCoordinates([
        { seatRow: 1, seatCol: 1 },
        { seatRow: null, seatCol: 2 },
      ]),
    ).toBe(false);
    expect(
      seatsHaveAllCoordinates([{ seatRow: 1, seatCol: undefined }]),
    ).toBe(false);
  });

  it("NaN·0·음수는 좌표로 인정하지 않는다", () => {
    expect(seatsHaveAllCoordinates([{ seatRow: NaN, seatCol: 1 }])).toBe(
      false,
    );
    expect(seatsHaveAllCoordinates([{ seatRow: 0, seatCol: 1 }])).toBe(false);
    expect(seatsHaveAllCoordinates([{ seatRow: 1, seatCol: -1 }])).toBe(
      false,
    );
    expect(seatsHaveAllCoordinates([{ seatRow: 1.5, seatCol: 1 }])).toBe(
      false,
    );
  });
});

describe("mapSeatMapItem", () => {
  const base = {
    seatId: 10,
    seatLayoutId: 11,
    seatNumber: "A-1",
    seatStatus: "AVAILABLE" as const,
  };

  it("좌표 사용 시 seatRow→행 라벨, seatCol→열", () => {
    expect(
      mapSeatMapItem({ ...base, seatRow: 1, seatCol: 3 }, true),
    ).toMatchObject({
      id: 10,
      row: "A",
      col: 3,
      seatNumber: "A-1",
    });
    expect(
      mapSeatMapItem(
        { ...base, seatNumber: "S-5", seatRow: 2, seatCol: 5 },
        true,
      ),
    ).toMatchObject({ row: "B", col: 5 });
  });

  it("좌표 미사용 시 seatNumber 파싱", () => {
    expect(mapSeatMapItem(base, false)).toMatchObject({
      row: "A",
      col: 1,
    });
  });
});

describe("normalizeSeatMapResponse", () => {
  it("구 배열 응답은 seatNumber 파싱으로 그린다", () => {
    const result = normalizeSeatMapResponse([
      {
        seatId: 1,
        seatLayoutId: 1,
        seatNumber: "B-3",
        seatStatus: "HOLD",
      },
    ]);

    expect(result.layoutReady).toBe(true);
    expect(result.layout).toBeNull();
    expect(result.seats[0]).toMatchObject({
      id: 1,
      row: "B",
      col: 3,
      status: "HOLD",
    });
  });

  it("신 응답 + 좌표로 그리드를 구성한다", () => {
    const result = normalizeSeatMapResponse({
      layout: { totalRows: 10, maxCols: 12 },
      seats: [
        {
          seatId: 1,
          seatLayoutId: 101,
          seatNumber: "A-1",
          seatRow: 1,
          seatCol: 1,
          seatStatus: "AVAILABLE",
        },
        {
          seatId: 2,
          seatLayoutId: 101,
          seatNumber: "A-2",
          seatRow: 1,
          seatCol: 2,
          seatStatus: "SOLD",
        },
      ],
    });

    expect(result.layoutReady).toBe(true);
    expect(result.layout).toEqual({ totalRows: 10, maxCols: 12 });
    expect(result.seats).toHaveLength(2);
    expect(result.seats[0]).toMatchObject({ row: "A", col: 1 });
    expect(result.seats[1]).toMatchObject({ row: "A", col: 2, status: "SOLD" });
  });

  it("layout: null이면 배치 미생성이다", () => {
    expect(
      normalizeSeatMapResponse({ layout: null, seats: [] }),
    ).toEqual({ layout: null, layoutReady: false, seats: [] });
  });

  it("layout 키 생략 + seats=[]이면 배치 미생성으로 방어한다", () => {
    expect(normalizeSeatMapResponse({ seats: [] })).toEqual({
      layout: null,
      layoutReady: false,
      seats: [],
    });
    expect(normalizeSeatMapResponse({})).toEqual({
      layout: null,
      layoutReady: false,
      seats: [],
    });
  });

  it("layout 키 생략이어도 seats가 있으면 구형처럼 렌더한다", () => {
    const result = normalizeSeatMapResponse({
      seats: [
        {
          seatId: 1,
          seatLayoutId: 1,
          seatNumber: "A-1",
          seatStatus: "AVAILABLE",
        },
      ],
    });

    expect(result.layoutReady).toBe(true);
    expect(result.seats[0]).toMatchObject({ row: "A", col: 1 });
  });

  it("좌표가 일부 누락되면 seatNumber 폴백으로 그린다", () => {
    const result = normalizeSeatMapResponse({
      layout: { totalRows: 2, maxCols: 2 },
      seats: [
        {
          seatId: 1,
          seatLayoutId: 1,
          seatNumber: "A-1",
          seatRow: 1,
          seatCol: 1,
          seatStatus: "AVAILABLE",
        },
        {
          seatId: 2,
          seatLayoutId: 1,
          seatNumber: "B-2",
          seatRow: null,
          seatCol: null,
          seatStatus: "AVAILABLE",
        },
      ],
    });

    expect(result.layoutReady).toBe(true);
    expect(result.layout).toEqual({ totalRows: 2, maxCols: 2 });
    // 전체 폴백이므로 둘 다 seatNumber 기준
    expect(result.seats[0]).toMatchObject({ row: "A", col: 1 });
    expect(result.seats[1]).toMatchObject({ row: "B", col: 2 });
  });

  it("NaN 좌표가 있으면 seatNumber 폴백이다", () => {
    const result = normalizeSeatMapResponse({
      layout: { totalRows: 1, maxCols: 1 },
      seats: [
        {
          seatId: 1,
          seatLayoutId: 1,
          seatNumber: "C-3",
          seatRow: NaN,
          seatCol: 1,
          seatStatus: "AVAILABLE",
        },
      ],
    });

    expect(result.seats[0]).toMatchObject({ row: "C", col: 3 });
  });

  it("유효하지 않은 layout 숫자는 layout null로 둔다", () => {
    const result = normalizeSeatMapResponse({
      layout: { totalRows: 0, maxCols: 12 },
      seats: [
        {
          seatId: 1,
          seatLayoutId: 1,
          seatNumber: "A-1",
          seatRow: 1,
          seatCol: 1,
          seatStatus: "AVAILABLE",
        },
      ],
    });

    expect(result.layoutReady).toBe(true);
    expect(result.layout).toBeNull();
    expect(result.seats[0]).toMatchObject({ row: "A", col: 1 });
  });

  it("소수 layout은 무효로 둔다", () => {
    expect(
      normalizeSeatMapResponse({
        layout: { totalRows: 10.5, maxCols: 12 },
        seats: [],
      }).layout,
    ).toBeNull();
  });

  it("부분 행 layout(예: 26×385)을 seats.length와 무관하게 유지한다", () => {
    const result = normalizeSeatMapResponse({
      layout: { totalRows: 26, maxCols: 385 },
      seats: [
        {
          seatId: 1,
          seatLayoutId: 1,
          seatNumber: "Z-1",
          seatRow: 26,
          seatCol: 1,
          seatStatus: "AVAILABLE",
        },
      ],
    });

    expect(result.layout).toEqual({ totalRows: 26, maxCols: 385 });
    expect(result.seats).toHaveLength(1);
    expect(result.seats[0]).toMatchObject({ row: "Z", col: 1 });
  });

  it("null/undefined 응답은 빈 맵(ready)이다", () => {
    expect(normalizeSeatMapResponse(null)).toEqual({
      layout: null,
      layoutReady: true,
      seats: [],
    });
    expect(normalizeSeatMapResponse(undefined)).toEqual({
      layout: null,
      layoutReady: true,
      seats: [],
    });
  });
});
