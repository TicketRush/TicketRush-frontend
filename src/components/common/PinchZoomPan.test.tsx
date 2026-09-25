import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PinchZoomPan from "./PinchZoomPan";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

describe("PinchZoomPan", () => {
  it("줌 컨트롤을 렌더한다", () => {
    const html = renderToStaticMarkup(
      <PinchZoomPan>
        <div>map</div>
      </PinchZoomPan>,
    );
    expect(html).toContain("좌석맵 확대 축소");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-keyshortcuts="Plus - 0"');
    expect(html).toContain("더하기나 등호로 확대");
    expect(html).toContain('aria-label="확대"');
    expect(html).toContain('aria-label="축소"');
    expect(html).toContain('aria-label="전체 보기"');
    expect(html).toContain("map");
  });

  it("컨트롤을 숨길 수 있다", () => {
    const html = renderToStaticMarkup(
      <PinchZoomPan showControls={false}>
        <div>map</div>
      </PinchZoomPan>,
    );
    expect(html).not.toContain('aria-label="확대"');
    expect(html).toContain("map");
  });
});
