import { describe, expect, it } from "vitest";
import {
  applyPinchTransform,
  clamp,
  clampPan,
  computeFitTransform,
  isPannable,
  isZoomWheelEvent,
  pointerDistance,
  scaleByWheel,
  zoomAroundPoint,
  transformsEqual,
} from "./zoomTransform";

describe("clamp", () => {
  it("범위를 벗어난 값을 자른다", () => {
    expect(clamp(0.1, 0.5, 3)).toBe(0.5);
    expect(clamp(4, 0.5, 3)).toBe(3);
    expect(clamp(1.2, 0.5, 3)).toBe(1.2);
  });
});

describe("zoomAroundPoint", () => {
  it("포인터 아래 지점이 같은 화면 좌표에 남는다", () => {
    const next = zoomAroundPoint({ scale: 1, x: 0, y: 0 }, 2, {
      x: 100,
      y: 50,
    });
    expect(next).toEqual({ scale: 2, x: -100, y: -50 });
    expect(next.x + 100 * next.scale).toBe(100);
    expect(next.y + 50 * next.scale).toBe(50);
  });

  it("scale이 0이면 위치를 유지한 채 배율만 바꾼다", () => {
    expect(zoomAroundPoint({ scale: 0, x: 10, y: 20 }, 1, { x: 0, y: 0 })).toEqual({
      scale: 1,
      x: 10,
      y: 20,
    });
  });
});

describe("computeFitTransform", () => {
  it("넓은 맵은 가로에 맞춰 축소하고 세로 가운데 둔다", () => {
    const next = computeFitTransform(
      { width: 400, height: 300 },
      { width: 800, height: 300 },
      { padding: 0 },
    );
    expect(next.scale).toBe(0.5);
    expect(next.x).toBe(0);
    expect(next.y).toBe(75);
  });

  it("작은 맵은 확대하지 않고 가운데 정렬한다", () => {
    const next = computeFitTransform(
      { width: 400, height: 300 },
      { width: 100, height: 100 },
      { padding: 0 },
    );
    expect(next.scale).toBe(1);
    expect(next.x).toBe(150);
    expect(next.y).toBe(100);
  });

  it("패딩을 빼고 맞춘다", () => {
    const next = computeFitTransform(
      { width: 420, height: 220 },
      { width: 400, height: 200 },
      { padding: 10 },
    );
    expect(next.scale).toBe(1);
    expect(next.x).toBe(10);
    expect(next.y).toBe(10);
  });

  it("측정 전이면 identity에 가깝게 둔다", () => {
    expect(
      computeFitTransform({ width: 0, height: 300 }, { width: 100, height: 100 }),
    ).toEqual({ scale: 1, x: 0, y: 0 });
  });
});

describe("pointerDistance", () => {
  it("두 포인터 사이 거리를 계산한다", () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("applyPinchTransform", () => {
  it("거리가 두 배가 되면 배율도 두 배가 된다", () => {
    const next = applyPinchTransform({
      start: { scale: 1, x: 0, y: 0 },
      startDistance: 40,
      currentDistance: 80,
      startMid: { x: 100, y: 100 },
      currentMid: { x: 100, y: 100 },
      minScale: 0.25,
      maxScale: 3,
    });
    expect(next.scale).toBe(2);
    expect(next.x).toBe(-100);
    expect(next.y).toBe(-100);
  });

  it("핀치 중 중점이 움직이면 그만큼 팬한다", () => {
    const next = applyPinchTransform({
      start: { scale: 1, x: 0, y: 0 },
      startDistance: 40,
      currentDistance: 40,
      startMid: { x: 100, y: 100 },
      currentMid: { x: 130, y: 80 },
      minScale: 0.25,
      maxScale: 3,
    });
    expect(next.scale).toBe(1);
    expect(next.x).toBe(30);
    expect(next.y).toBe(-20);
  });

  it("최대 배율을 넘지 않는다", () => {
    const next = applyPinchTransform({
      start: { scale: 2, x: 0, y: 0 },
      startDistance: 10,
      currentDistance: 100,
      startMid: { x: 0, y: 0 },
      currentMid: { x: 0, y: 0 },
      minScale: 0.25,
      maxScale: 3,
    });
    expect(next.scale).toBe(3);
  });
});

describe("scaleByWheel", () => {
  it("위로 굴리면 확대한다", () => {
    const next = scaleByWheel(
      { scale: 1, x: 0, y: 0 },
      -100,
      { x: 0, y: 0 },
      { minScale: 0.25, maxScale: 3, sensitivity: 0.001 },
    );
    expect(next.scale).toBeCloseTo(1.1);
  });

  it("최소 배율 아래로 줄이지 않는다", () => {
    const next = scaleByWheel(
      { scale: 0.5, x: 0, y: 0 },
      10_000,
      { x: 0, y: 0 },
      { minScale: 0.5, maxScale: 3 },
    );
    expect(next.scale).toBe(0.5);
    expect(next).toEqual({ scale: 0.5, x: 0, y: 0 });
  });
});

describe("isZoomWheelEvent", () => {
  it("Ctrl 또는 Meta가 있을 때만 줌으로 본다", () => {
    expect(isZoomWheelEvent({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isZoomWheelEvent({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(isZoomWheelEvent({ ctrlKey: false, metaKey: false })).toBe(false);
  });
});

describe("clampPan", () => {
  it("큰 맵은 뷰포트 밖으로 완전히 나가지 못하게 막는다", () => {
    const next = clampPan(
      { scale: 1, x: -2000, y: 80 },
      { width: 400, height: 300 },
      { width: 800, height: 300 },
    );
    expect(next).toEqual({ scale: 1, x: -400, y: 0 });
  });

  it("작은 맵은 뷰포트 안에 머물게 한다", () => {
    const next = clampPan(
      { scale: 1, x: -50, y: 500 },
      { width: 400, height: 300 },
      { width: 100, height: 100 },
    );
    expect(next.x).toBe(0);
    expect(next.y).toBe(200);
  });
});

describe("isPannable", () => {
  it("맞춤 배율에서는 팬하지 않는다", () => {
    expect(isPannable({ scale: 0.5, x: 0, y: 0 }, 0.5)).toBe(false);
    expect(isPannable({ scale: 0.5, x: 0, y: 0 }, 0.5, 0.001)).toBe(false);
  });

  it("맞춤보다 확대되면 팬한다", () => {
    expect(isPannable({ scale: 0.8, x: 0, y: 0 }, 0.5)).toBe(true);
  });
});

describe("transformsEqual", () => {
  it("미세한 오차는 같은 변환으로 본다", () => {
    expect(
      transformsEqual({ scale: 1, x: 0, y: 0 }, { scale: 1.0004, x: 0, y: 0 }),
    ).toBe(true);
    expect(
      transformsEqual({ scale: 1, x: 0, y: 0 }, { scale: 1.5, x: 0, y: 0 }),
    ).toBe(false);
  });
});
