// 모달이 document.body에 포탈될 때 배경 스크롤을 잠근다.
// overflow:hidden만 주면 스크롤바가 사라져 페이지가 가로로 밀린다 (#341).

export type BodyScrollLockDom = {
  bodyStyle: {
    overflow: string;
    paddingRight: string;
    position: string;
    top: string;
    left: string;
    width: string;
  };
  htmlStyle: {
    overflow: string;
  };
  clientWidth: number;
  innerWidth: number;
  computedPaddingRightPx: number;
  scrollY: number;
  scrollTo: (y: number) => void;
};

type LockSnapshot = {
  dom: BodyScrollLockDom;
  bodyOverflow: string;
  bodyPaddingRight: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyWidth: string;
  htmlOverflow: string;
  scrollY: number;
};

let lockCount = 0;
let snapshot: LockSnapshot | null = null;

export function scrollbarGapPx(innerWidth: number, clientWidth: number): number {
  return Math.max(0, innerWidth - clientWidth);
}

function readBrowserDom(): BodyScrollLockDom | null {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null;
  }

  return {
    bodyStyle: document.body.style,
    htmlStyle: document.documentElement.style,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
    computedPaddingRightPx:
      Number.parseFloat(window.getComputedStyle(document.body).paddingRight) ||
      0,
    scrollY: window.scrollY,
    scrollTo: (y) => {
      window.scrollTo(0, y);
    },
  };
}

export function lockBodyScroll(dom: BodyScrollLockDom | null = readBrowserDom()): void {
  if (!dom) return;

  lockCount += 1;
  if (lockCount > 1) return;

  const gap = scrollbarGapPx(dom.innerWidth, dom.clientWidth);
  const scrollY = dom.scrollY;

  snapshot = {
    dom,
    bodyOverflow: dom.bodyStyle.overflow,
    bodyPaddingRight: dom.bodyStyle.paddingRight,
    bodyPosition: dom.bodyStyle.position,
    bodyTop: dom.bodyStyle.top,
    bodyLeft: dom.bodyStyle.left,
    bodyWidth: dom.bodyStyle.width,
    htmlOverflow: dom.htmlStyle.overflow,
    scrollY,
  };

  // overflow:hidden을 먼저 주면 스크롤이 0으로 점프한 뒤 고정되므로,
  // 위치 고정과 스크롤바 폭 보정을 먼저 적용한다.
  if (gap > 0) {
    dom.bodyStyle.paddingRight = `${dom.computedPaddingRightPx + gap}px`;
  }
  dom.bodyStyle.position = "fixed";
  dom.bodyStyle.top = `-${scrollY}px`;
  dom.bodyStyle.left = "0";
  dom.bodyStyle.width = "100%";
  dom.htmlStyle.overflow = "hidden";
  dom.bodyStyle.overflow = "hidden";
}

export function unlockBodyScroll(): void {
  if (lockCount === 0 || !snapshot) return;

  lockCount -= 1;
  if (lockCount > 0) return;

  const {
    dom,
    bodyOverflow,
    bodyPaddingRight,
    bodyPosition,
    bodyTop,
    bodyLeft,
    bodyWidth,
    htmlOverflow,
    scrollY,
  } = snapshot;
  snapshot = null;

  dom.htmlStyle.overflow = htmlOverflow;
  dom.bodyStyle.overflow = bodyOverflow;
  dom.bodyStyle.paddingRight = bodyPaddingRight;
  dom.bodyStyle.position = bodyPosition;
  dom.bodyStyle.top = bodyTop;
  dom.bodyStyle.left = bodyLeft;
  dom.bodyStyle.width = bodyWidth;
  dom.scrollTo(scrollY);
}

/** 테스트에서 잠금을 풀고 모듈 상태를 초기화한다. */
export function resetBodyScrollLock(): void {
  if (snapshot) {
    lockCount = 1;
    unlockBodyScroll();
  }
  lockCount = 0;
  snapshot = null;
}
