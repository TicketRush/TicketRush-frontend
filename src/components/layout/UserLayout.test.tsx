import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UserLayout from "./UserLayout";

const mocks = vi.hoisted(() => ({
  resume: {
    visible: false,
    title: "봄 콘서트",
    remainingLabel: "04:12",
    cancelPending: false,
    onResume: vi.fn(),
    onCancel: vi.fn(),
  },
}));

vi.mock("@/hooks/booking/usePendingResume", () => ({
  usePendingResume: () => mocks.resume,
}));
vi.mock("@/hooks/booking/useBlockPaymentInFlightLeave", () => ({
  useBlockPaymentInFlightLeave: () => undefined,
}));
vi.mock("./Header", () => ({
  default: () => <header>헤더</header>,
}));
vi.mock("./Footer", () => ({
  default: () => <footer>푸터</footer>,
}));

beforeEach(() => {
  vi.stubGlobal("React", React);
  mocks.resume.visible = false;
  mocks.resume.cancelPending = false;
  mocks.resume.onResume.mockReset();
  mocks.resume.onCancel.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function renderLayout() {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<UserLayout />}>
          <Route path="/" element={<main>홈</main>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("UserLayout pending resume banner (#369)", () => {
  it("이어갈 PENDING이 없으면 배너를 숨긴다", () => {
    const html = renderLayout();
    expect(html).toContain("홈");
    expect(html).not.toContain("결제 대기 중인 예매가 있습니다");
    expect(html).not.toContain("예매 이어가기");
  });

  it("이어갈 PENDING이 있으면 헤더 아래 배너를 보여 준다", () => {
    mocks.resume.visible = true;
    const html = renderLayout();
    expect(html).toContain("결제 대기 중인 예매가 있습니다");
    expect(html).toContain("봄 콘서트");
    expect(html).toContain("예매 이어가기");
    expect(html).toContain("홈");
  });
});
