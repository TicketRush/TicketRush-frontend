/** 좌석맵 뷰포트 줌/팬 변환 (#344) */

export type ZoomTransform = {
  scale: number;
  x: number;
  y: number;
};

export const DEFAULT_MIN_SCALE = 0.25;
export const DEFAULT_MAX_SCALE = 3;
export const DEFAULT_ZOOM_SENSITIVITY = 0.0015;
export const DRAG_THRESHOLD_PX = 5;
export const ZOOM_BUTTON_FACTOR = 1.25;
export const FIT_PADDING_PX = 24;
export const CLICK_SWALLOW_MS = 400;

export const IDENTITY_TRANSFORM: ZoomTransform = { scale: 1, x: 0, y: 0 };

export function transformsEqual(
  a: ZoomTransform,
  b: ZoomTransform,
  epsilon = 0.001,
) {
  return (
    Math.abs(a.scale - b.scale) < epsilon &&
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon
  );
}

/** Ctrl/Meta+휠, 트랙패드 핀치(브라우저가 ctrlKey를 붙임)만 줌으로 본다. */
export function isZoomWheelEvent(event: {
  ctrlKey: boolean;
  metaKey: boolean;
}) {
  return event.ctrlKey || event.metaKey;
}

export type SeatMapZoomKeyAction = "in" | "out" | "fit";

/**
 * 좌석맵 키보드 줌. `+`/`=`/넘패드 더하기는 확대, `-`는 축소, `0`은 전체 보기다.
 * Ctrl/Alt 조합은 브라우저 확대라 여기서 다루지 않는다.
 */
export function resolveSeatMapZoomKey(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}): SeatMapZoomKeyAction | null {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  // `+`는 Shift가 필요해서 `=`도 확대. 넘패드는 key가 Add/Subtract로 온다.
  // Enter·Space는 좌석 버튼 선택이라 여기서 다루지 않는다.
  if (event.key === "+" || event.key === "=" || event.key === "Add") {
    return "in";
  }
  if (event.key === "-" || event.key === "_" || event.key === "Subtract") {
    return "out";
  }
  if (event.key === "0") return "fit";
  return null;
}

export type SeatMapPanDirection = "left" | "right" | "up" | "down";

export const KEYBOARD_PAN_STEP_PX = 48;

/** 맵 자체에 포커스가 있을 때의 방향키. 좌석 이동 키와 구분하려고 여기서는 키만 본다. */
export function resolveSeatMapPanKey(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): SeatMapPanDirection | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.key === "ArrowLeft") return "left";
  if (event.key === "ArrowRight") return "right";
  if (event.key === "ArrowUp") return "up";
  if (event.key === "ArrowDown") return "down";
  return null;
}

/** 화살표가 가리키는 쪽이 보이게 콘텐츠를 옮긴다. */
export function panDeltaForArrow(
  direction: SeatMapPanDirection,
  step = KEYBOARD_PAN_STEP_PX,
) {
  if (direction === "left") return { x: step, y: 0 };
  if (direction === "right") return { x: -step, y: 0 };
  if (direction === "up") return { x: 0, y: step };
  return { x: 0, y: -step };
}

/** 포커스된 좌석이 있으면 그 중심, 없으면 뷰포트 중심. */
export function viewportPoint(
  container: { left: number; top: number; width: number; height: number },
  target: { left: number; top: number; width: number; height: number } | null,
) {
  if (!target) {
    return { x: container.width / 2, y: container.height / 2 };
  }
  return {
    x: target.left + target.width / 2 - container.left,
    y: target.top + target.height / 2 - container.top,
  };
}

/** 대상이 뷰포트 안에 들어오게 옮길 팬 거리. 이미 보이면 0. */
export function panDeltaToReveal(
  container: { left: number; top: number; right: number; bottom: number },
  target: { left: number; top: number; right: number; bottom: number },
  padding = 0,
) {
  let x = 0;
  let y = 0;
  if (target.left < container.left + padding) {
    x = container.left + padding - target.left;
  } else if (target.right > container.right - padding) {
    x = container.right - padding - target.right;
  }
  if (target.top < container.top + padding) {
    y = container.top + padding - target.top;
  } else if (target.bottom > container.bottom - padding) {
    y = container.bottom - padding - target.bottom;
  }
  return { x, y };
}

/** 입력 칸에서는 줌 키를 가로채지 않는다. 좌석 버튼은 대상이 아니다. */
export function isZoomKeyTypingTarget(
  target: { closest?: (selector: string) => unknown } | null,
): boolean {
  if (!target || typeof target.closest !== "function") return false;
  return (
    target.closest("input, textarea, select, [contenteditable='true']") != null
  );
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function zoomAroundPoint(
  prev: ZoomTransform,
  nextScale: number,
  point: { x: number; y: number },
): ZoomTransform {
  if (prev.scale === 0 || !Number.isFinite(prev.scale)) {
    return { scale: nextScale, x: prev.x, y: prev.y };
  }
  const ratio = nextScale / prev.scale;
  return {
    scale: nextScale,
    x: point.x - (point.x - prev.x) * ratio,
    y: point.y - (point.y - prev.y) * ratio,
  };
}

/**
 * 컨테이너 안에 콘텐츠가 잘리지 않게 맞추고 가운데 정렬한다.
 * 작은 맵은 확대하지 않는다(maxScale, 기본 1).
 */
export function computeFitTransform(
  container: { width: number; height: number },
  content: { width: number; height: number },
  options?: { padding?: number; maxScale?: number; minScale?: number },
): ZoomTransform {
  const padding = options?.padding ?? FIT_PADDING_PX;
  const maxScale = options?.maxScale ?? 1;
  const minScale = options?.minScale ?? DEFAULT_MIN_SCALE;
  const availW = Math.max(0, container.width - padding * 2);
  const availH = Math.max(0, container.height - padding * 2);

  if (content.width <= 0 || content.height <= 0 || availW <= 0 || availH <= 0) {
    return { ...IDENTITY_TRANSFORM };
  }

  const scale = clamp(
    Math.min(availW / content.width, availH / content.height, maxScale),
    minScale,
    maxScale,
  );

  return {
    scale,
    x: (container.width - content.width * scale) / 2,
    y: (container.height - content.height * scale) / 2,
  };
}

export function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function applyPinchTransform(args: {
  start: ZoomTransform;
  startDistance: number;
  currentDistance: number;
  startMid: { x: number; y: number };
  currentMid: { x: number; y: number };
  minScale: number;
  maxScale: number;
}): ZoomTransform {
  const ratio =
    args.startDistance > 0 ? args.currentDistance / args.startDistance : 1;
  const nextScale = clamp(
    args.start.scale * ratio,
    args.minScale,
    args.maxScale,
  );
  const zoomed = zoomAroundPoint(args.start, nextScale, args.startMid);
  return {
    scale: zoomed.scale,
    x: zoomed.x + (args.currentMid.x - args.startMid.x),
    y: zoomed.y + (args.currentMid.y - args.startMid.y),
  };
}

function clampAxis(pos: number, scaled: number, viewport: number) {
  if (scaled <= viewport) {
    return clamp(pos, 0, viewport - scaled);
  }
  return clamp(pos, viewport - scaled, 0);
}

/** 맵이 뷰포트보다 클 때만 팬한다. 맞춤 배율에서는 페이지 스크롤을 살린다. */
export function isPannable(
  transform: ZoomTransform,
  fitScale: number,
  epsilon = 0.001,
) {
  return transform.scale > fitScale + epsilon;
}

/** 맵이 뷰포트 밖으로 완전히 나가지 않게 팬을 제한한다. */
export function clampPan(
  transform: ZoomTransform,
  container: { width: number; height: number },
  content: { width: number; height: number },
): ZoomTransform {
  if (content.width <= 0 || content.height <= 0) return transform;
  return {
    scale: transform.scale,
    x: clampAxis(
      transform.x,
      content.width * transform.scale,
      container.width,
    ),
    y: clampAxis(
      transform.y,
      content.height * transform.scale,
      container.height,
    ),
  };
}

export function scaleByWheel(
  prev: ZoomTransform,
  deltaY: number,
  point: { x: number; y: number },
  options: {
    minScale: number;
    maxScale: number;
    sensitivity?: number;
  },
): ZoomTransform {
  const sensitivity = options.sensitivity ?? DEFAULT_ZOOM_SENSITIVITY;
  const nextScale = clamp(
    prev.scale - deltaY * sensitivity * prev.scale,
    options.minScale,
    options.maxScale,
  );
  if (nextScale === prev.scale) return prev;
  return zoomAroundPoint(prev, nextScale, point);
}
