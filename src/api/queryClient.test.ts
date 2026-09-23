import { describe, expect, it, vi } from "vitest";
import { handleGlobalError, handleMutationError } from "./queryClient";
import { ApiError } from "./errors/errorMapper";
import { toast } from "../utils/toast";

vi.mock("../utils/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("handleGlobalError", () => {
  it("ApiError는 메시지를 토스트로 보여준다", () => {
    handleGlobalError(
      new ApiError(
        {
          isSuccess: false,
          code: "AUTH_UNAUTHORIZED",
          message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
          result: null,
        },
        401,
      ),
    );

    expect(toast.error).toHaveBeenCalledWith(
      "로그인이 만료되었습니다. 다시 로그인해주세요.",
    );
  });

  it("알 수 없는 에러는 공통 안내를 보여준다", () => {
    handleGlobalError(new Error("boom"));
    expect(toast.error).toHaveBeenCalledWith(
      "알 수 없는 오류가 발생했습니다.",
    );
  });

  it("skipGlobalErrorToast mutation은 공통 토스트를 띄우지 않는다", () => {
    vi.mocked(toast.error).mockClear();

    handleMutationError(new Error("파일 교체에 실패했습니다."), {
      meta: { skipGlobalErrorToast: true },
    });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("일반 mutation 실패는 공통 토스트를 그대로 보여 준다", () => {
    handleMutationError(new Error("boom"), {});

    expect(toast.error).toHaveBeenCalledWith(
      "알 수 없는 오류가 발생했습니다.",
    );
  });

  it("로그아웃이나 이동은 하지 않는다 — interceptor가 담당한다", () => {
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/", href: "", replace } });

    handleGlobalError(
      new ApiError(
        {
          isSuccess: false,
          code: "AUTH_UNAUTHORIZED",
          message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
          result: null,
        },
        401,
      ),
    );

    expect(replace).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
    vi.unstubAllGlobals();
  });
});
