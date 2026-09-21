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
