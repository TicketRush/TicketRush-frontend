import { afterEach, describe, expect, it } from "vitest";
import {
  type BodyScrollLockDom,
  lockBodyScroll,
  resetBodyScrollLock,
  scrollbarGapPx,
  unlockBodyScroll,
} from "./bodyScrollLock";

function createDom(options?: {
  clientWidth?: number;
  innerWidth?: number;
  paddingRightPx?: number;
  scrollY?: number;
}): BodyScrollLockDom & { scrolledTo: number | null } {
  const scrolled = { to: null as number | null };
  return {
    bodyStyle: {
      overflow: "",
      paddingRight: "",
      position: "",
      top: "",
      left: "",
      width: "",
    },
    htmlStyle: { overflow: "" },
    clientWidth: options?.clientWidth ?? 1024,
    innerWidth: options?.innerWidth ?? 1039,
    computedPaddingRightPx: options?.paddingRightPx ?? 0,
    scrollY: options?.scrollY ?? 240,
    scrollTo: (y) => {
      scrolled.to = y;
    },
    get scrolledTo() {
      return scrolled.to;
    },
  };
}

afterEach(() => {
  resetBodyScrollLock();
});

describe("scrollbarGapPx", () => {
  it("스크롤바 너비를 0 이상으로 계산한다", () => {
    expect(scrollbarGapPx(1039, 1024)).toBe(15);
    expect(scrollbarGapPx(1024, 1024)).toBe(0);
    expect(scrollbarGapPx(800, 900)).toBe(0);
  });
});

describe("lockBodyScroll", () => {
  it("스크롤바 너비만큼 padding-right를 보정하고 body를 고정한다", () => {
    const dom = createDom({
      innerWidth: 1039,
      clientWidth: 1024,
      paddingRightPx: 8,
      scrollY: 320,
    });

    lockBodyScroll(dom);

    expect(dom.htmlStyle.overflow).toBe("hidden");
    expect(dom.bodyStyle.overflow).toBe("hidden");
    expect(dom.bodyStyle.paddingRight).toBe("23px");
    expect(dom.bodyStyle.position).toBe("fixed");
    expect(dom.bodyStyle.top).toBe("-320px");
    expect(dom.bodyStyle.left).toBe("0");
    expect(dom.bodyStyle.width).toBe("100%");
  });

  it("스크롤바가 없으면 padding-right를 건드리지 않는다", () => {
    const dom = createDom({ innerWidth: 1024, clientWidth: 1024 });

    lockBodyScroll(dom);

    expect(dom.bodyStyle.paddingRight).toBe("");
    expect(dom.bodyStyle.overflow).toBe("hidden");
    expect(dom.bodyStyle.position).toBe("fixed");
  });

  it("중첩 잠금은 한 번만 적용하고 마지막 unlock에서 복원한다", () => {
    const dom = createDom({ scrollY: 80 });

    lockBodyScroll(dom);
    lockBodyScroll(dom);
    expect(dom.bodyStyle.position).toBe("fixed");

    unlockBodyScroll();
    expect(dom.bodyStyle.position).toBe("fixed");
    expect(dom.scrolledTo).toBeNull();

    unlockBodyScroll();
    expect(dom.bodyStyle.overflow).toBe("");
    expect(dom.bodyStyle.paddingRight).toBe("");
    expect(dom.bodyStyle.position).toBe("");
    expect(dom.bodyStyle.top).toBe("");
    expect(dom.htmlStyle.overflow).toBe("");
    expect(dom.scrolledTo).toBe(80);
  });

  it("잠금 없이 unlock하면 예외 없이 무시한다", () => {
    expect(() => unlockBodyScroll()).not.toThrow();
  });

  it("reset은 잠긴 스타일을 되돌리고 다음 lock이 다시 적용되게 한다", () => {
    const dom = createDom({ scrollY: 40 });
    lockBodyScroll(dom);
    expect(dom.bodyStyle.position).toBe("fixed");

    resetBodyScrollLock();
    expect(dom.bodyStyle.position).toBe("");
    expect(dom.scrolledTo).toBe(40);

    lockBodyScroll(dom);
    expect(dom.bodyStyle.position).toBe("fixed");
  });
});
