// 인증 관련 mutation 훅들
//
// 변경사항 (2026-07-19, 실 API 스펙 반영):
//   - useSocialLogin 훅 제거 — 실제 OAuth 콜백 처리(code 교환)는
//     OAuthCallbackPage에서 socialLoginApi를 직접 호출하므로 이 훅은 미사용 dead code.
//     (기존 useSocialLogin은 code 교환 없이 토큰을 바로 받는 Flow B를 가정한 잘못된 구현)
//   - useEmailLogin: EmailLoginResponse에 name/joinedAt이 없으므로,
//     로그인 성공 후 getMeApi()로 프로필을 비동기 보강.
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { emailLoginApi, logoutApi, getMeApi } from "@/api/auth";
import useAuthStore from "@/stores/global/authStore";

export function useEmailLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: emailLoginApi,
    onSuccess: (data, variables) => {
      setAuth(data.accessToken, data.refreshToken, {
        userId: data.userId,
        name: variables.email.split("@")[0],
        email: data.email,
        role: data.role,
        joinedAt: new Date().toISOString(),
      });

      navigate(data.role === "ADMIN" ? "/admin" : "/");

      // 로그인 응답에 name/joinedAt이 없어 /user/me로 비동기 보강 (실패해도 로그인은 유지)
      getMeApi()
        .then((me) => {
          setAuth(data.accessToken, data.refreshToken, {
            userId: data.userId,
            name: me.name,
            email: me.email,
            role: data.role,
            joinedAt: me.createdAt,
          });
        })
        .catch(() => {});
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
