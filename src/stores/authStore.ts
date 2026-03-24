// stores/authStore.tsx
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// HttpOnly Cookie 사용 시 수정
interface AuthState {
  accessToken: string | null;
  user: { name: string; email: string; role: string } | null;
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
