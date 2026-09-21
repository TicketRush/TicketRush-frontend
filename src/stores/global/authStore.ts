import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { UserRole } from "@/types/domain/auth";
import { clearExpiredStoredAuth } from "@/utils/auth/decideStoredAuthCleanup";
import { clearRequestedRefunds } from "@/utils/booking/userRefund";

// HttpOnly Cookie 사용 시 수정
interface AuthState {
  accessToken: string | null;
  /** refresh 토큰 — 401 시 자동 재발급용. localStorage에 persist */
  refreshToken: string | null;
  user: {
    userId: number;
    name: string;
    email: string;
    /** 사용자 역할 — 백엔드 응답 그대로. UserRole 타입으로 좁혀 실수 방지 */
    role: UserRole;
    /** 회원 가입일 (ISO 8601) — 로그인 응답에 포함 */
    joinedAt: string;
  } | null;

  /** 로그인 성공 시 호출 — 토큰 + 사용자 정보 저장 */
  setAuth: (
    accessToken: string,
    refreshToken: string,
    user: AuthState["user"],
  ) => void;

  /**
   * 토큰 재발급 시 호출 — 토큰만 갱신, 사용자 정보 유지
   * (interceptor의 refresh 로직에서 사용)
   */
  setTokens: (accessToken: string, refreshToken: string) => void;

  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        accessToken: null,
        refreshToken: null,
        user: null,
        setAuth: (accessToken, refreshToken, user) =>
          set({ accessToken, refreshToken, user }),
        setTokens: (accessToken, refreshToken) =>
          set({ accessToken, refreshToken }),
        logout: () => {
          clearRequestedRefunds();
          set({ accessToken: null, refreshToken: null, user: null });
        },
      }),
      {
        name: "auth-storage",
        /**
         * 재수화 시 만료가 확실한 세션은 스토어에 올리지 않는다 (#326).
         *
         * onRehydrateStorage에서 logout()을 호출하면 만료 토큰이 한 번
         * 적용된 뒤에야 지워져, 헤더가 로그아웃 버튼으로 깜빡일 수 있다.
         * merge에서 걸러야 첫 렌더부터 비로그인이다.
         */
        merge: (persistedState, currentState) => {
          const persisted = (persistedState ?? {}) as Partial<AuthState>;
          return clearExpiredStoredAuth({ ...currentState, ...persisted });
        },
      },
    ),
  ),
);

// 사용 시: const isLoggedIn = useAuthStore((state) => !!state.accessToken);
export default useAuthStore;
