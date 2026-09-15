import { describe, expect, it } from "vitest";
import {
  mapAdminMonitoringSeats,
  mapAdminSeatDetail,
  markAdminSeatBookerLoadFailed,
  mergeAdminSeatDetailWithBooker,
} from "./adminSeatMapper";

describe("mapAdminMonitoringSeats", () => {
  it("키가 생략되면 빈 맵이다", () => {
    expect(mapAdminMonitoringSeats(undefined)).toEqual([]);
    expect(mapAdminMonitoringSeats({})).toEqual([]);
  });

  it("seatNumber에서 row/col을 파생한다", () => {
    const seats = mapAdminMonitoringSeats({
      seats: [
        {
          seatId: 100,
          seatLayoutId: 101,
          seatNumber: "A-1",
          seatStatus: "HOLD",
        },
      ],
    });

    expect(seats[0]).toMatchObject({
      id: 100,
      seatLayoutId: 101,
      seatNumber: "A-1",
      row: "A",
      col: 1,
      status: "HOLD",
    });
  });
});

describe("mapAdminSeatDetail", () => {
  it("예매자 이름을 좌석 응답만으로 채우지 않는다", () => {
    const mapped = mapAdminSeatDetail({
      seatId: 100,
      seatNumber: "A-1",
      seatStatus: "HOLD",
      bookingNumber: "X7B29-KLPW1",
      holdStartedAt: "2026-05-22 10:30:00",
      remainingSeconds: 212,
    });

    expect(mapped.reservedBy).toBeUndefined();
    expect(mapped.bookingNumber).toBe("X7B29-KLPW1");
    expect(mapped.reservedAt).toBe("2026-05-22 10:30:00");
    expect(mapped.holdRemainingSec).toBe(212);
  });

  it("비HOLD는 타이머 필드를 두지 않는다", () => {
    const mapped = mapAdminSeatDetail({
      seatId: 2,
      seatNumber: "B-3",
      seatStatus: "SOLD",
      bookingNumber: "A3K91-PQXM2",
    });

    expect(mapped.holdRemainingSec).toBeUndefined();
    expect(mapped.reservedAt).toBeUndefined();
  });
});

describe("mergeAdminSeatDetailWithBooker", () => {
  it("이름과 이메일을 조합하고 SOLD는 bookedAt을 쓴다", () => {
    const seat = mapAdminSeatDetail({
      seatId: 2,
      seatNumber: "B-3",
      seatStatus: "SOLD",
      bookingNumber: "A3K91-PQXM2",
    });

    const merged = mergeAdminSeatDetailWithBooker(seat, {
      bookingNumber: "A3K91-PQXM2",
      bookerName: "김철수",
      bookerEmail: "a@b.com",
      bookedAt: "2026-05-22 11:00:00",
    });

    expect(merged.reservedBy).toBe("김철수 (a@b.com)");
    expect(merged.reservedAt).toBe("2026-05-22 11:00:00");
    expect(merged.bookerLoadFailed).toBe(false);
  });

  it("예매 단건이 없으면 좌석 필드만 둔다", () => {
    const seat = mapAdminSeatDetail({
      seatId: 100,
      seatNumber: "A-1",
      seatStatus: "HOLD",
      bookingNumber: "X7B29-KLPW1",
      holdStartedAt: "2026-05-22 10:30:00",
      remainingSeconds: 10,
    });

    expect(mergeAdminSeatDetailWithBooker(seat, undefined).reservedBy).toBe(
      undefined,
    );
    expect(mergeAdminSeatDetailWithBooker(seat, undefined).reservedAt).toBe(
      "2026-05-22 10:30:00",
    );
  });
});

describe("markAdminSeatBookerLoadFailed", () => {
  it("좌석 필드는 두고 실패만 표시한다", () => {
    const seat = mapAdminSeatDetail({
      seatId: 2,
      seatNumber: "B-3",
      seatStatus: "SOLD",
      bookingNumber: "A3K91-PQXM2",
    });
    const marked = markAdminSeatBookerLoadFailed(seat);
    expect(marked.bookerLoadFailed).toBe(true);
    expect(marked.bookingNumber).toBe("A3K91-PQXM2");
    expect(marked.reservedBy).toBeUndefined();
  });
});
