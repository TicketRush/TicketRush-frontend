import { describe, expect, it } from "vitest";
import { seatRowToLetter } from "./seatRowToLetter";

describe("seatRowToLetter", () => {
  it("1→A, 26→Z", () => {
    expect(seatRowToLetter(1)).toBe("A");
    expect(seatRowToLetter(26)).toBe("Z");
  });

  it("잘못된 값은 ?", () => {
    expect(seatRowToLetter(0)).toBe("?");
    expect(seatRowToLetter(1.5)).toBe("?");
  });
});
