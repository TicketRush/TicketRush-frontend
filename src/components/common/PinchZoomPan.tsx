import {
  useRef,
  useState,
  useCallback,
  type PropsWithChildren,
  type WheelEvent,
  type PointerEvent,
} from "react";
import { Plus, Minus, Maximize } from "lucide-react";

interface Transform {
  scale: number;
  x: number;
  y: number;
}

interface PinchZoomPanProps {
  /** 최소 배율 (기본 0.5) */
  minScale?: number;
  /** 최대 배율 (기본 3) */
  maxScale?: number;
  /** 휠 1틱당 줌 변화량 (기본 0.0015 * deltaY) */
  zoomSensitivity?: number;
  /** 줌/리셋 컨트롤 버튼 표시 (기본 true) */
  showControls?: boolean;
  /** 래퍼 추가 className */
  className?: string;
}

const DEFAULT_MIN = 0.5;
const DEFAULT_MAX = 3;
const DRAG_THRESHOLD = 5; // px. 이보다 적게 움직이면 클릭으로 간주
const ZOOM_STEP = 0.25; // 버튼 줌 단위

const INITIAL: Transform = { scale: 1, x: 0, y: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function PinchZoomPan({
  children,
  minScale = DEFAULT_MIN,
  maxScale = DEFAULT_MAX,
  zoomSensitivity = 0.0015,
  showControls = true,
  className = "",
}: PropsWithChildren<PinchZoomPanProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>(INITIAL);
  const [isDragging, setIsDragging] = useState(false);

  // 드래그(팬) 상태는 ref로 — 리렌더 없이 추적
  const dragState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: 0, // 누적 이동량 (클릭/드래그 판별용)
  });

  // ── 휠 줌 (마우스 포인터 기준 focal zoom)
  const handleWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // 컨테이너 기준 포인터 위치 (0.7배율 영향 제거: rect가 실제 크기)
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      setTransform((prev) => {
        const nextScale = clamp(
          prev.scale - e.deltaY * zoomSensitivity * prev.scale,
          minScale,
          maxScale,
        );
        const ratio = nextScale / prev.scale;
        // 포인터 아래 지점이 그대로 유지되도록 x/y 보정
        return {
          scale: nextScale,
          x: px - (px - prev.x) * ratio,
          y: py - (py - prev.y) * ratio,
        };
      });
    },
    [minScale, maxScale, zoomSensitivity],
  );

  // ── 팬 시작
  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      // 터치 2개 → 핀치 모드 (단순화: 단일 포인터 팬만 정밀 처리)
      dragState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: transform.x,
        originY: transform.y,
        moved: 0,
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [transform.x, transform.y],
  );

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const d = dragState.current;
    if (!d.active) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(dy));

    setTransform((prev) => ({
      ...prev,
      x: d.originX + dx,
      y: d.originY + dy,
    }));
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const d = dragState.current;
    d.active = false;
    setIsDragging(false);

    // 드래그 거리가 임계값 미만이면 클릭으로 간주 → 막지 않음(자식이 처리)
    // 임계값 이상이면 팬이었으므로 클릭 전파를 막아 좌석 오선택 방지
    if (d.moved >= DRAG_THRESHOLD) {
      e.preventDefault();
      // capture 단계에서 click을 한 번 삼킴
      const swallow = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
        containerRef.current?.removeEventListener("click", swallow, true);
      };
      containerRef.current?.addEventListener("click", swallow, true);
    }
  }, []);

  // ── 버튼 줌 (컨테이너 중심 기준)
  const zoomByButton = useCallback(
    (delta: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      setTransform((prev) => {
        const nextScale = clamp(prev.scale + delta, minScale, maxScale);
        const ratio = nextScale / prev.scale;
        return {
          scale: nextScale,
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        };
      });
    },
    [minScale, maxScale],
  );

  const reset = useCallback(() => setTransform(INITIAL), []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden touch-none select-none ${className}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: dragState.current.active ? "grabbing" : "grab" }}
    >
      {/* 변환 레이어 — 자식(SeatMap 등)을 그대로 감쌈 */}
      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          width: "fit-content",
          // 드래그 중 부드러움, 그 외엔 즉시
          transition: isDragging ? "none" : "transform 0.08s ease-out",
        }}
      >
        {children}
      </div>

      {/* 줌 컨트롤 */}
      {showControls && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
          <button
            type="button"
            onClick={() => zoomByButton(ZOOM_STEP)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-700"
            aria-label="확대"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={() => zoomByButton(-ZOOM_STEP)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-700"
            aria-label="축소"
          >
            <Minus size={18} />
          </button>
          <button
            type="button"
            onClick={reset}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-700"
            aria-label="원래 크기로"
          >
            <Maximize size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
