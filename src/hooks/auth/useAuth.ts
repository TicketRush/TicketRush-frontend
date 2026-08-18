// 인증 관련 mutation 훅들
//
// 변경사항:
//   - setAuth 호출부에 refreshToken 매개변수 추가 (refresh 토큰 자동 재발급 지원)
//   - 소셜 로그인 응답에 email/role/joinedAt 없음 반영 (백엔드 OauthLoginResponse)
//   - 이메일 로그인 응답에 name/joinedAt 없음 반영 (백엔드 LoginResponse)
//   - 로그인 직후 getMeApi()로 프로필(name/email/createdAt/role) 보강 (#137)
//   - authStore.role SSOT = /me.role (BE role = MEMBER | ADMIN 통일)
//   - 로그인 성공 시 저장된 복귀 경로가 있으면 그곳으로 이동 (#101)
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { socialLoginApi, emailLoginApi, logoutApi, getMeApi } from "@/api/auth";
import useAuthStore from "@/stores/global/authStore";
import { consumeLoginRedirect } from "@/utils/auth/loginRedirect";
import type { UserRole } from "@/types/domain/auth";

/** BE role → UserRole. 알 수 없는 값은 MEMBER로 안전하게 처리 */
function toUserRole(backendRole?: string): UserRole {
  return backendRole === "ADMIN" ? "ADMIN" : "MEMBER";
}

/** 예매 흐름에서 밀려온 경우 그 경로를 우선하고, 없으면 역할별 기본 진입점 */
function resolveLandingPath(role: UserRole): string {
  return consumeLoginRedirect() ?? (role === "ADMIN" ? "/admin" : "/");
}

export function useSocialLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: socialLoginApi,
    onSuccess: async (data) => {
      // 소셜 응답 body에 role 없음 → /me 전 임시 MEMBER, 보강 후 me.role 사용
      let role: UserRole = "MEMBER";

      setAuth(data.accessToken, data.refreshToken, {
        userId: data.userId,
        name: data.name ?? "",
        email: "",
        role,
        joinedAt: new Date().toISOString(),
      });

      try {
        const me = await getMeApi();
        role = toUserRole(me.role);
        setAuth(data.accessToken, data.refreshToken, {
          userId: data.userId,
          name: me.name ?? data.name ?? "",
          email: me.email ?? "",
          role,
          joinedAt: me.createdAt ?? new Date().toISOString(),
        });
      } catch {
        // /me 실패해도 로그인 자체는 유지 (role은 임시 MEMBER)
      }

      navigate(resolveLandingPath(role));
    },
  });
}

export function useEmailLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: emailLoginApi,
    onSuccess: async (data, variables) => {
      // /me 전: 로그인 응답 role. /me 성공 시 me.role로 덮어씀 (SSOT).
      let role = toUserRole(data.role);

      setAuth(data.accessToken, data.refreshToken, {
        userId: data.userId,
        name: "",
        email: variables.email,
        role,
        joinedAt: new Date().toISOString(),
      });

      try {
        const me = await getMeApi();
        role = toUserRole(me.role);
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

      navigate(resolveLandingPath(role));
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
