// OAuth 콜백 페이지 - 카카오/네이버/구글 공용
//
// ✅ 콜백 경로 확정 (2026-07-18, 백엔드 협의):
//   - 운영: https://ticketrush.store/oauth/callback/{provider}
//   - 로컬: http://localhost:5173/oauth/callback/{provider}
//   → 현재 라우트(/oauth/callback/:provider, App.tsx)와 일치, 변경 불필요.
//
// ✅ Flow A로 확정 (2026-07-18, 백엔드 로그로 실증):
//   소셜 제공자가 백엔드가 아니라 "프론트" 콜백 URL로 code를 직접 리다이렉트하므로,
//   프론트가 그 code를 받아 백엔드에 로그인 요청을 보내야 함.
//   1. 사용자가 LoginPage/SignupPage에서 소셜 버튼 클릭
//   2. getOauthUrlApi(provider) → 백엔드가 OAuth 로그인 URL(소셜 제공자 authorize URL) 반환
//   3. window.location.href로 카카오/네이버/구글로 리다이렉트
//   4. 사용자가 소셜 로그인 성공
//   5. 소셜 제공자 → 프론트 콜백(/oauth/callback/{provider}?code=xxx&state=yyy)으로 직접 리다이렉트
//   6. (이 페이지) code를 꺼내서 POST /api/v1/auth/social/login { provider, code } 호출
//   7. 응답(OauthLoginResponse)의 토큰 + 사용자 정보를 authStore에 저장 → 메인/온보딩 이동
//
// ※ 이전에는 백엔드가 토큰까지 처리해 콜백 URL에 access_token 등을 실어 보내는 Flow B로
//   잘못 구현되어 있었음 (실제로는 /api/v1/auth/social/login 요청이 전혀 발생하지 않는 버그).
//
// ✅ 응답 필드 보정 (2026-07-18, swagger-ui 실측):
//   socialLoginApi 응답(OauthLoginResponse)에는 email/role/joinedAt이 없음
//   (userId, name, isNewUser, accessToken, refreshToken, ...expiresIn 뿐).
//   - role: 소셜 로그인 계정은 관리자를 지원하지 않는다는 가정으로 MEMBER 고정
//     (관리자는 이메일 로그인만 사용 — 백엔드에 소셜 관리자 지원 여부 확인 필요)
//   - email/name/joinedAt: getMeApi()로 비동기 보강 (실패해도 로그인 자체는 유지)
//
// ✅ isNewUser 분기 반영 (2026-07-20):
//   전용 온보딩 페이지가 없어 신규/기존 회원 모두 "/"로 이동하는 건 동일하지만,
//   res.isNewUser로 신규 가입 여부를 구분해 환영 토스트 문구만 다르게 노출.
import { useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import useAuthStore from "@/stores/global/authStore";
import { socialLoginApi, getMeApi } from "@/api/auth";
import type { OauthProvider, UserRole } from "@/types/domain/auth";

const VALID_PROVIDERS = ["kakao", "naver", "google"] as const;

const PROVIDER_TO_BACKEND: Record<
  (typeof VALID_PROVIDERS)[number],
  OauthProvider
> = {
  kakao: "KAKAO",
  naver: "NAVER",
  google: "GOOGLE",
};

export default function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  // React StrictMode 하에서 useEffect 중복 실행 방지
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    processCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function processCallback() {
    try {
      // provider 유효성 검사
      if (
        !provider ||
        !VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])
      ) {
        throw new Error("유효하지 않은 로그인 방식입니다.");
      }

      // 소셜 제공자가 인가 실패/취소 시 error 파라미터로 전달
      const errorParam = searchParams.get("error");
      if (errorParam) {
        throw new Error(
          searchParams.get("error_description") ??
            "소셜 로그인에 실패했습니다.",
        );
      }

      // Flow A: 소셜 제공자가 프론트 콜백 URL로 code(+state)를 직접 전달
      const code = searchParams.get("code");
      if (!code) {
        throw new Error("인증 코드를 받지 못했습니다. 다시 시도해주세요.");
      }

      const backendProvider =
        PROVIDER_TO_BACKEND[provider as (typeof VALID_PROVIDERS)[number]];

      // POST /api/v1/auth/social/login { provider, code } → 토큰 + 사용자 정보 발급
      const res = await socialLoginApi({ provider: backendProvider, code });

      // 응답에 role이 없어 MEMBER로 고정 (관리자는 이메일 로그인만 지원한다는 가정)
      const role: UserRole = "MEMBER";

      setAuth(res.accessToken, res.refreshToken, {
        userId: res.userId,
        name: res.name,
        email: "",
        role,
        joinedAt: new Date().toISOString(),
      });

      if (res.isNewUser) {
        toast.success(
          `${getProviderName(provider)} 계정으로 가입이 완료되었습니다! TicketRush에 오신 것을 환영해요 🎉`,
        );
      } else {
        toast.success(`${getProviderName(provider)}로 로그인되었습니다.`);
      }

      // ⚠️ 2026-07-18: "/onboarding" 라우트가 App.tsx에 존재하지 않아(전용
      // 온보딩 페이지 미구현) 신규 회원을 그쪽으로 보내면 NotFoundPage로
      // 빠지는 버그가 있었음. 온보딩 페이지가 만들어지기 전까지는 신규/기존
      // 회원 모두 "/"로 이동(위 토스트 문구로만 구분).
      navigate("/", { replace: true });

      // email/name/joinedAt을 /user/me로 비동기 보강 (실패해도 로그인은 유지)
      getMeApi()
        .then((me) => {
          setAuth(res.accessToken, res.refreshToken, {
            userId: res.userId,
            name: me.name,
            email: me.email,
            role,
            joinedAt: me.createdAt,
          });
        })
        .catch(() => {});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "로그인 처리 중 오류가 발생했습니다.";
      toast.error(message);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={48} className="animate-spin text-primary" />
        <p className="text-text-secondary">
          {provider
            ? `${getProviderName(provider)} 로그인 처리 중...`
            : "로그인 처리 중..."}
        </p>
      </div>
    </div>
  );
}

function getProviderName(provider: string): string {
  const names: Record<string, string> = {
    kakao: "카카오",
    naver: "네이버",
    google: "구글",
  };
  return names[provider] ?? provider;
}
