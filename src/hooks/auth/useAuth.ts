// 인증 관련 mutation 훅들
//
// 변경사항 (백엔드 스펙 반영):
//   - useEmailLogin.onSuccess에서 백엔드 응답의 data.role 우선 사용
//     (화이트리스트는 backend가 role 안 줄 때만 fallback)
//   - 실 API 연동 후에는 화이트리스트 로직 제거 가능
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { socialLoginApi, emailLoginApi, logoutApi } from "@/api/auth";
import useAuthStore from "@/stores/global/authStore";
import type { UserRole } from "@/types/domain/auth";

// ⚠️ Dev/데모용 — 관리자 계정 화이트리스트 (backend role 없을 때 fallback)
// 백엔드에서 응답에 role 필드가 확정되면 이 화이트리스트는 제거
const ADMIN_EMAIL_WHITELIST = ["admin@ticketrush.com"];

function determineRole(email: string, backendRole?: string): UserRole {
  // 백엔드가 role을 주면 그게 우선
  if (backendRole === "ADMIN") return "ADMIN";
  if (backendRole === "USER") return "USER";
  // 백엔드 role 없을 때 화이트리스트 fallback
  if (ADMIN_EMAIL_WHITELIST.includes(email.toLowerCase().trim())) {
    return "ADMIN";
  }
  return "USER";
}

export function useSocialLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: socialLoginApi,
    onSuccess: (data) => {
      // 소셜 로그인 응답에 role 이미 포함됨
      const role = determineRole(data.email, data.role);

      setAuth(data.accessToken, {
        userId: data.userId,
        name: data.name,
        email: data.email,
        role,
        joinedAt: data.joinedAt,
      });
      navigate(role === "ADMIN" ? "/admin" : "/");
    },
  });
}

export function useEmailLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: emailLoginApi,
    onSuccess: (data, variables) => {
      // 백엔드 응답의 data.role 우선, 없으면 화이트리스트 fallback
      const role = determineRole(variables.email, data.role);

      setAuth(data.accessToken, {
        userId: data.userId,
        name: data.name,
        email: variables.email,
        role,
        joinedAt: data.joinedAt,
      });

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
      // 서버 로그아웃 실패해도 클라이언트 세션은 정리
      logout();
      navigate("/login");
    },
  });
}
