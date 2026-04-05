// stores/authStore.tsx
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// 인증 상태 관리 스토어

// <스토리지 전략>
// authStore → localStorage (기본값)
// - 로그인 상태를 탭 간에 공유하기 위해 사용.
// - 새 탭에서도 로그인이 유지되어야 하므로 localStorage 사용.

// 나머지 store (seat, timer, payment, concert) → sessionStorage
// - 예매 플로우는 탭별로 독립되어야 하므로 sessionStorage 사용.
// -탭 A에서 좌석 선택 중일 때, 탭 B에서 별도 예매가 가능해야 함.

// HttpOnly Cookie 사용 시 수정
interface AuthState {
  accessToken: string | null;
  user: { name: string; email: string; role: string } | null;
  setAuth: (token: string, user: AuthState["user"]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
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
