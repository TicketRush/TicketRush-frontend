import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { NavigateProps } from "react-router-dom";
import type { ButtonProps } from "../common/Button/Button";
import type { User } from "@/types/domain/auth";
import useAuthStore from "@/stores/global/authStore";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import Header from "./Header";
import AdminRoute from "./AdminRoute";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  cancel: vi.fn(),
  info: vi.fn(),
  buttons: new Map<string, ButtonProps>(),
}));

vi.hoisted(() => {
  const createStorage = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
  };
  vi.stubGlobal("localStorage", createStorage());
  vi.stubGlobal("sessionStorage", createStorage());
  vi.stubGlobal("window", { localStorage: globalThis.localStorage });
});

// Node SSR uses Zustand's initial snapshot; select the actual current store
// so fixtures and session assertions exercise the project's AuthState.
vi.mock("@/stores/global/authStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/global/authStore")>();
  const store = actual.default;
  return {
    default: Object.assign(
      <T,>(selector: (state: ReturnType<typeof store.getState>) => T) =>
        selector(store.getState()),
      store,
    ),
  };
});
vi.mock("@/stores/reservation/paymentStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/reservation/paymentStore")>();
  const store = actual.usePaymentStore;
  return {
    usePaymentStore: Object.assign(
      <T,>(selector: (state: ReturnType<typeof store.getState>) => T) =>
        selector(store.getState()),
      store,
    ),
  };
});
vi.mock("react-router-dom", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-router-dom")>(),
  useNavigate: () => mocks.navigate,
  Navigate: ({ to }: NavigateProps) => <span>redirect:{String(to)}</span>,
}));
vi.mock("@/hooks/booking/useCancelPendingReservation", () => ({
  useCancelPendingReservation: () => mocks.cancel,
}));
vi.mock("react-toastify", () => ({ toast: { info: mocks.info } }));
vi.mock("../common/Button/Button", async (importOriginal) => {
  const { default: Button } = await importOriginal<typeof import("../common/Button/Button")>();
  return {
    default: (props: ButtonProps) => {
      mocks.buttons.set(String(props.children), props);
      return <Button {...props} />;
    },
  };
});

const admin: User = {
  userId: 42,
  name: "관리자",
  email: "test@example.com",
  role: "ADMIN",
  joinedAt: "2026-01-01T00:00:00Z",
};
const member: User = { ...admin, role: "MEMBER" };

beforeEach(() => {
  vi.stubGlobal("React", React);
  const storage = new Map<string, string>();
  useAuthStore.persist.setOptions({
    storage: {
      getItem: (key) => JSON.parse(storage.get(key) ?? "null"),
      setItem: (key, value) => { storage.set(key, JSON.stringify(value)); },
      removeItem: (key) => { storage.delete(key); },
    },
  });
  useAuthStore.getState().logout();
  usePaymentStore.setState({ status: "IDLE", bookingNumber: null });
  mocks.buttons.clear();
  vi.clearAllMocks();
  mocks.cancel.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderHeader() {
  return renderToStaticMarkup(<MemoryRouter><Header /></MemoryRouter>);
}

describe("관리자 모드 진입 버튼", () => {
  it("shows the admin button alongside existing reservation/logout menus", () => {
    useAuthStore.getState().setAuth("access", "refresh", admin);
    const html = renderHeader();
    expect(html).toContain("관리자 모드");
    expect(html).toContain('href="/reservations/mypage"');
    expect(html).toContain("내 예매");
    expect(html).toContain("로그아웃");
  });

  it.each([
    { label: "일반 회원", token: "access", user: member },
    { label: "비로그인", token: null, user: null },
    { label: "사용자 정보 로딩", token: "access", user: null },
    { label: "토큰 없는 관리자 정보", token: null, user: admin },
  ])("hides the button for $label", ({ token, user }) => {
    useAuthStore.setState({ accessToken: token, user });
    const html = renderHeader();
    expect(html).not.toContain("관리자 모드");
    expect(mocks.buttons.has("관리자 모드")).toBe(false);
    expect(html).toContain(token ? "로그아웃" : 'href="/login"');
  });

  it("navigates to /admin without changing auth state or persisted session", () => {
    useAuthStore.getState().setAuth("access", "refresh", admin);
    const before = useAuthStore.getState();
    const storage = useAuthStore.persist.getOptions().storage!;
    const persisted = storage.getItem("auth-storage");
    const write = vi.spyOn(storage, "setItem");
    const remove = vi.spyOn(storage, "removeItem");
    const logout = vi.spyOn(before, "logout");
    renderHeader();
    const onClick = mocks.buttons.get("관리자 모드")?.onClick;
    expect(onClick).toBeTypeOf("function");
    // The unlocked handler does not inspect the event.
    onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith("/admin");
    expect(useAuthStore.getState()).toBe(before);
    expect(storage.getItem("auth-storage")).toEqual(persisted);
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it("waits for pending cancellation and store cleanup before navigating, preserving auth", async () => {
    useAuthStore.getState().setAuth("access", "refresh", admin);
    usePaymentStore.getState().startBooking("pending-331", 331, 42, 10000);
    const authBefore = useAuthStore.getState();
    const storage = useAuthStore.persist.getOptions().storage!;
    const persisted = storage.getItem("auth-storage");
    const write = vi.spyOn(storage, "setItem");
    const remove = vi.spyOn(storage, "removeItem");
    const logout = vi.spyOn(authBefore, "logout");
    let finishCancellation!: () => void;
    mocks.cancel.mockImplementationOnce(() => new Promise<boolean>((resolve) => {
      finishCancellation = () => {
        // The existing cancellation hook resets payment state before returning true.
        usePaymentStore.getState().reset();
        resolve(true);
      };
    }));
    mocks.navigate.mockImplementationOnce(() => {
      expect(usePaymentStore.getState().bookingNumber).toBeNull();
    });
    renderHeader();
    const click = mocks.buttons.get("관리자 모드")!.onClick!;
    const completion = click({} as React.MouseEvent<HTMLButtonElement>);
    expect(mocks.cancel).toHaveBeenCalledOnce();
    expect(mocks.navigate).not.toHaveBeenCalled();
    finishCancellation();
    await completion;
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith("/admin");
    expect(useAuthStore.getState()).toBe(authBefore);
    expect(storage.getItem("auth-storage")).toEqual(persisted);
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();

    // Once cleared, even a subsequent activation cannot cancel that booking again.
    await click({} as React.MouseEvent<HTMLButtonElement>);
    expect(mocks.cancel).toHaveBeenCalledOnce();
  });

  it.each([false, true])("stays on the page when cancellation returns %s but the booking remains", async (cancelled) => {
    useAuthStore.getState().setAuth("access", "refresh", admin);
    usePaymentStore.getState().startBooking("pending-331", 331, 42, 10000);
    mocks.cancel.mockResolvedValueOnce(cancelled);
    renderHeader();
    await mocks.buttons.get("관리자 모드")!.onClick!({} as React.MouseEvent<HTMLButtonElement>);
    expect(mocks.cancel).toHaveBeenCalledOnce();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(usePaymentStore.getState().bookingNumber).toBe("pending-331");
  });

  it.each(["REQUESTING", "CONFIRMING"] as const)("preserves the %s payment navigation lock", async (status) => {
    useAuthStore.getState().setAuth("access", "refresh", admin);
    usePaymentStore.setState({ status, bookingNumber: "pending-331" });
    renderHeader();
    const button = mocks.buttons.get("관리자 모드")!;
    const preventDefault = vi.fn();
    expect(button["aria-disabled"]).toBe(true);
    await button.onClick?.({ preventDefault } as React.MouseEvent<HTMLButtonElement>);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(mocks.info).toHaveBeenCalledOnce();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});

describe("기존 AdminRoute 접근 제어", () => {
  it.each([
    { token: "access", user: admin, expected: "admin content" },
    { token: "access", user: member, expected: "redirect:/" },
    { token: null, user: null, expected: "redirect:/login" },
    { token: "access", user: null, expected: "redirect:/" },
  ])("checks access with token=$token, user=$user", ({ token, user, expected }) => {
    useAuthStore.setState({ accessToken: token, user });
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<span>admin content</span>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(html).toBe(`<span>${expected}</span>`);
  });
});
