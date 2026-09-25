import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PendingResumeBanner } from "./PendingResumeBanner";

beforeEach(() => {
  vi.stubGlobal("React", React);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PendingResumeBanner", () => {
  it("남은 시간과 이어가기 버튼을 보여 준다", () => {
    const html = renderToStaticMarkup(
      <PendingResumeBanner
        title="봄 콘서트"
        remainingLabel="04:12"
        cancelPending={false}
        onResume={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(html).toContain("결제 대기 중인 예매가 있습니다");
    expect(html).toContain("봄 콘서트");
    expect(html).toContain("04:12 안에 결제를 마쳐야 좌석이 유지됩니다.");
    expect(html).toContain("예매 이어가기");
    expect(html).toContain("예매 취소");
  });

  it("취소 중에는 버튼을 비활성화한다", () => {
    const html = renderToStaticMarkup(
      <PendingResumeBanner
        title="봄 콘서트"
        remainingLabel="04:12"
        cancelPending
        onResume={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(html).toContain("취소 중...");
    expect(html).toContain("disabled");
  });
});
