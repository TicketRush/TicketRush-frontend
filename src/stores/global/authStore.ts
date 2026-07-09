import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { UserRole } from "@/types/domain/auth";

// HttpOnly Cookie 사용 시 수정
interface AuthState {
  accessToken: string | null;
  user: {
    userId: number;
    name: string;
    email: string;
    /** 사용자 역할 — 백엔드 응답 그대로. UserRole 타입으로 좁혀 실수 방지 */
    role: UserRole;
    /** 회원 가입일 (ISO 8601) — 로그인 응답에 포함 */
    joinedAt: string;
  } | null;
  setAuth: (token: string, user: AuthState["user"]) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        accessToken: null,
        user: null,
        setAuth: (token, user) => set({ accessToken: token, user }),
        logout: () => set({ accessToken: null, user: null }),
      }),
      { name: "auth-storage" },
    ),
  ),
);

// 사용 시: const isLoggedIn = useAuthStore((state) => !!state.accessToken);
export default useAuthStore;
