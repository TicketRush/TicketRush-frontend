// 인증 관련 mutation 훅들
//
// 변경사항 (2026-07-19, 실 API 스펙 반영):
//   - useSocialLogin 훅 제거 — OAuth 콜백은 #119 OAuthCallbackPage / useSocialLogin에서 처리
//   - useEmailLogin: EmailLoginResponse에 name/joinedAt이 없으므로 getMeApi()로 보강
//   - role: 백엔드 role 우선, 없으면 ADMIN 이메일 화이트리스트 fallback (#137 전까지)
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { emailLoginApi, logoutApi, getMeApi } from "@/api/auth";
import useAuthStore from "@/stores/global/authStore";
import type { UserRole } from "@/types/domain/auth";

const ADMIN_EMAIL_WHITELIST = ["admin@ticketrush.com"];

function determineRole(
  email: string | undefined,
  backendRole?: string,
): UserRole {
  if (backendRole === "ADMIN") return "ADMIN";
  if (backendRole === "MEMBER") return "MEMBER";
  if (email && ADMIN_EMAIL_WHITELIST.includes(email.toLowerCase().trim())) {
    return "ADMIN";
  }
  return "MEMBER";
}

export function useEmailLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: emailLoginApi,
    onSuccess: async (data, variables) => {
      const role = determineRole(variables.email, data.role);

      setAuth(data.accessToken, data.refreshToken, {
        userId: data.userId,
        name: "",
        email: variables.email,
        role,
        joinedAt: new Date().toISOString(),
      });

      try {
        const me = await getMeApi();
        setAuth(data.accessToken, data.refreshToken, {
          userId: data.userId,
          name: me.name ?? "",
          email: me.email ?? variables.email,
          role,
          joinedAt: me.createdAt ?? new Date().toISOString(),
        });
      } catch {
        // /me 실패해도 로그인 자체는 유지
      }

      navigate(role === "ADMIN" ? "/admin" : "/");
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      logout();
      navigate("/login");
    },
    onError: () => {
      logout();
      navigate("/login");
    },
  });
}
