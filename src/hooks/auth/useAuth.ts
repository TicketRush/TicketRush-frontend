import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { socialLoginApi, emailLoginApi, logoutApi } from "@/api/auth";
import useAuthStore from "@/stores/global/authStore";

// ⚠️ Dev/데모용 — 관리자 계정 화이트리스트
//    백엔드에서 응답에 role 필드를 추가하면 이 화이트리스트는 제거
const ADMIN_EMAIL_WHITELIST = ["admin@ticketrush.com"];

function determineRole(email: string, backendRole?: string): "ADMIN" | "USER" {
  // 백엔드가 role을 주면 그게 우선 (백엔드 연동 후 자연스럽게 전환)
  if (backendRole === "ADMIN") return "ADMIN";
  // 화이트리스트 fallback
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
      // 소셜 로그인은 응답에 email이 없음 → 일반 USER로 처리
      // (관리자 시연은 이메일 로그인으로만)

      setAuth(data.accessToken, {
        userId: data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
        joinedAt: data.joinedAt,
      });
      navigate("/");
    },
  });
}

export function useEmailLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: emailLoginApi,
    onSuccess: (data, variables) => {
      const email = variables.email;
      const role = determineRole(email);

      setAuth(data.accessToken, {
        userId: data.userId,
        name: data.name,
        email,
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
      logout();
      navigate("/login");
    },
  });
}
