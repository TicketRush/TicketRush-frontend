// 맵 뷰포트 줌/팬. AdminSeatMap의 scale(좌석 px 축소)과 달리
// transform으로 맞추고 확대한다 — 클릭 히트영역이 같이 스케일되고
// 좌석 전부 리레이아웃하지 않는다 (#344).
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type PropsWithChildren,
} from "react";
import { Plus, Minus, Maximize } from "lucide-react";
import ZoomControlButton from "@/components/common/ZoomControlButton";
import {
  applyPinchTransform,
  clamp,
  clampPan,
  CLICK_SWALLOW_MS,
  computeFitTransform,
  DEFAULT_MAX_SCALE,
  DEFAULT_MIN_SCALE,
  DEFAULT_ZOOM_SENSITIVITY,
  DRAG_THRESHOLD_PX,
  FIT_PADDING_PX,
  IDENTITY_TRANSFORM,
  isPannable,
  isZoomWheelEvent,
  pointerDistance,
  scaleByWheel,
  transformsEqual,
  zoomAroundPoint,
  ZOOM_BUTTON_FACTOR,
  type ZoomTransform,
} from "@/utils/seat/zoomTransform";

interface PinchZoomPanProps {
  /** 뷰포트가 너무 작을 때 맞춤 배율의 하한 */
  minScale?: number;
  /** 최대 배율 (기본 3, 좌석 실제 크기 기준) */
  maxScale?: number;
  /** 휠 1틱당 줌 변화량 */
  zoomSensitivity?: number;
  /** 줌/리셋 컨트롤 버튼 표시 (기본 true) */
  showControls?: boolean;
  /** 래퍼 추가 className */
  className?: string;
}

type Point = { x: number; y: number };

export default function PinchZoomPan({
  children,
  minScale = DEFAULT_MIN_SCALE,
  maxScale = DEFAULT_MAX_SCALE,
  zoomSensitivity = DEFAULT_ZOOM_SENSITIVITY,
  showControls = true,
  className = "",
}: PropsWithChildren<PinchZoomPanProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<ZoomTransform>(IDENTITY_TRANSFORM);
  const [fitted, setFitted] = useState<ZoomTransform>(IDENTITY_TRANSFORM);
  const [isDragging, setIsDragging] = useState(false);
  const [hasFitted, setHasFitted] = useState(false);

  const transformRef = useRef(transform);
  transformRef.current = transform;
  const fittedRef = useRef(fitted);
  fittedRef.current = fitted;
  const userInteractedRef = useRef(false);
  const swallowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{
    start: ZoomTransform;
    startDistance: number;
    startMid: Point;
  } | null>(null);
  const dragRef = useRef({
    active: false,
    panning: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: 0,
  });

  // 맞춤 배율보다 축소하지 않아 맵 전체가 항상 한 화면에 들어온다.
  const minInteractiveScale = useCallback(
    () => fittedRef.current.scale || minScale,
    [minScale],
  );

  const markInteracted = () => {
    userInteractedRef.current = true;
  };

  const readSizes = () => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return null;
    return {
      container: {
        width: container.clientWidth,
        height: container.clientHeight,
      },
      content: {
        width: content.offsetWidth,
        height: content.offsetHeight,
      },
    };
  };

  const boundTransform = useCallback((next: ZoomTransform) => {
    const sizes = readSizes();
    if (!sizes) return next;
    return clampPan(next, sizes.container, sizes.content);
  }, []);

  const commitTransform = useCallback(
    (next: ZoomTransform, interacted: boolean) => {
      const clamped = boundTransform(next);
      if (interacted && !transformsEqual(transformRef.current, clamped)) {
        markInteracted();
      }
      transformRef.current = clamped;
      setTransform(clamped);
    },
    [boundTransform],
  );

  const capturePointer = (pointerId: number) => {
    try {
      containerRef.current?.setPointerCapture?.(pointerId);
    } catch {
      // 이미 끝난 포인터일 수 있다
    }
  };

  const canPanMap = () =>
    isPannable(transformRef.current, minInteractiveScale());

  const applyFit = useCallback(() => {
    const sizes = readSizes();
    if (!sizes) return;

    const next = computeFitTransform(sizes.container, sizes.content, {
      padding: FIT_PADDING_PX,
      maxScale: 1,
      minScale,
    });
    fittedRef.current = next;
    setFitted(next);
    if (!userInteractedRef.current) {
      transformRef.current = next;
      setTransform(next);
    } else {
      setTransform((prev) => {
        const clamped = clampPan(prev, sizes.container, sizes.content);
        transformRef.current = clamped;
        return clamped;
      });
    }
    setHasFitted(true);
  }, [minScale]);

  useLayoutEffect(() => {
    applyFit();
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => applyFit());
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [applyFit]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (!isZoomWheelEvent(event)) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const next = scaleByWheel(
        transformRef.current,
        event.deltaY,
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        {
          minScale: minInteractiveScale(),
          maxScale,
          sensitivity: zoomSensitivity,
        },
      );
      commitTransform(next, true);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [maxScale, zoomSensitivity, minInteractiveScale, commitTransform]);

  useEffect(
    () => () => {
      if (swallowTimerRef.current) clearTimeout(swallowTimerRef.current);
    },
    [],
  );

  const beginPinch = () => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) {
      pinchRef.current = null;
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    pinchRef.current = {
      start: { ...transformRef.current },
      startDistance: pointerDistance(pts[0], pts[1]),
      startMid: {
        x: (pts[0].x + pts[1].x) / 2 - rect.left,
        y: (pts[0].y + pts[1].y) / 2 - rect.top,
      },
    };
    dragRef.current.active = false;
    dragRef.current.panning = false;
    setIsDragging(true);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2) {
      for (const id of pointersRef.current.keys()) capturePointer(id);
      beginPinch();
      return;
    }

    const current = transformRef.current;
    dragRef.current = {
      active: true,
      panning: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.x,
      originY: current.y,
      moved: 0,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }

    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()];
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      commitTransform(
        applyPinchTransform({
          start: pinch.start,
          startDistance: pinch.startDistance,
          currentDistance: pointerDistance(pts[0], pts[1]),
          startMid: pinch.startMid,
          currentMid: {
            x: (pts[0].x + pts[1].x) / 2 - rect.left,
            y: (pts[0].y + pts[1].y) / 2 - rect.top,
          },
          minScale: minInteractiveScale(),
          maxScale,
        }),
        true,
      );
      return;
    }

    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));

    if (!drag.panning) {
      if (drag.moved < DRAG_THRESHOLD_PX) return;
      if (!canPanMap()) return;
      drag.panning = true;
      setIsDragging(true);
      capturePointer(event.pointerId);
    }

    commitTransform(
      {
        scale: transformRef.current.scale,
        x: drag.originX + dx,
        y: drag.originY + dy,
      },
      true,
    );
  };

  const swallowNextClick = () => {
    const el = containerRef.current;
    if (!el) return;

    const swallow = (clickEvent: Event) => {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
    };
    el.addEventListener("click", swallow, { capture: true, once: true });
    if (swallowTimerRef.current) clearTimeout(swallowTimerRef.current);
    swallowTimerRef.current = setTimeout(() => {
      el.removeEventListener("click", swallow, true);
      swallowTimerRef.current = null;
    }, CLICK_SWALLOW_MS);
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);

    if (pinchRef.current) {
      if (pointersRef.current.size < 2) {
        pinchRef.current = null;
        setIsDragging(false);
        event.preventDefault();
        swallowNextClick();
      } else {
        beginPinch();
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const wasPanning = drag.panning;
    drag.active = false;
    drag.panning = false;
    setIsDragging(false);

    if (wasPanning) {
      event.preventDefault();
      swallowNextClick();
    }
  };

  const zoomByButton = (factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const prev = transformRef.current;
    const nextScale = clamp(
      prev.scale * factor,
      minInteractiveScale(),
      maxScale,
    );
    commitTransform(
      zoomAroundPoint(prev, nextScale, {
        x: rect.width / 2,
        y: rect.height / 2,
      }),
      true,
    );
  };

  const reset = () => {
    userInteractedRef.current = false;
    setIsDragging(false);
    transformRef.current = fittedRef.current;
    setTransform(fittedRef.current);
  };

  const fitScale = fitted.scale || minScale;
  const atMin = transform.scale <= fitScale + 0.001;
  const atMax = transform.scale >= maxScale - 0.001;
  const lockTouch = isPannable(transform, fitScale) || isDragging;

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="좌석맵 확대 축소"
      className={`relative overflow-hidden select-none ${
        lockTouch ? "touch-none overscroll-none" : "touch-pan-y"
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      style={{ cursor: isDragging ? "grabbing" : "default" }}
    >
      <div
        ref={contentRef}
        className="w-max"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          visibility: hasFitted ? "visible" : "hidden",
          transition: isDragging ? "none" : "transform 0.08s ease-out",
        }}
      >
        {children}
      </div>

      {showControls && (
        <div
          className="absolute top-3 right-3 flex flex-col gap-1 z-10"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <ZoomControlButton
            label="확대"
            disabled={atMax}
            onClick={() => zoomByButton(ZOOM_BUTTON_FACTOR)}
          >
            <Plus size={18} />
          </ZoomControlButton>
          <ZoomControlButton
            label="축소"
            disabled={atMin}
            onClick={() => zoomByButton(1 / ZOOM_BUTTON_FACTOR)}
          >
            <Minus size={18} />
          </ZoomControlButton>
          <ZoomControlButton label="전체 보기" onClick={reset}>
            <Maximize size={16} />
          </ZoomControlButton>
        </div>
      )}
    </div>
  );
}
