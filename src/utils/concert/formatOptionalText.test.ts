import { describe, expect, it } from "vitest";
import {
  formatShowScheduleLabel,
  trimOrNull,
  UNSET_LABEL,
} from "./formatOptionalText";

describe("trimOrNull", () => {
  it("returns null for empty or whitespace", () => {
    expect(trimOrNull(undefined)).toBeNull();
    expect(trimOrNull(null)).toBeNull();
    expect(trimOrNull("")).toBeNull();
    expect(trimOrNull("   ")).toBeNull();
  });

  it("returns trimmed text", () => {
    expect(trimOrNull("  LOAD_TEST  ")).toBe("LOAD_TEST");
  });
});

describe("formatShowScheduleLabel", () => {
  it("combines time and duration", () => {
    expect(formatShowScheduleLabel("19:00", 120)).toBe("19:00 (120분)");
  });

  it("returns time only when duration missing", () => {
    expect(formatShowScheduleLabel("19:00", 0)).toBe("19:00");
    expect(formatShowScheduleLabel("19:00", null)).toBe("19:00");
  });

  it("returns duration only when time missing", () => {
    expect(formatShowScheduleLabel("", 90)).toBe("90분");
    expect(formatShowScheduleLabel(undefined, 90)).toBe("90분");
  });

  it("returns empty when both missing", () => {
    expect(formatShowScheduleLabel("", 0)).toBe("");
    expect(formatShowScheduleLabel(null, null)).toBe("");
  });
});

describe("UNSET_LABEL", () => {
  it("is 미정", () => {
    expect(UNSET_LABEL).toBe("미정");
  });
});
