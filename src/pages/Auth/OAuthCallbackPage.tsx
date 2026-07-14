// OAuth 콜백 페이지 - 카카오/네이버/구글 공용
//
// 예상 flow (Flow B, 백엔드가 토큰까지 처리 후 프론트로 리다이렉트):
//   1. 사용자가 LoginPage에서 소셜 버튼 클릭
//   2. getOauthUrlApi(provider) → 백엔드가 OAuth 로그인 URL 반환
//   3. window.location.href로 카카오/네이버/구글로 리다이렉트
//   4. 사용자가 소셜 로그인 성공
//   5. 소셜 → 백엔드 (예: localhost:8082/login/oauth2/code/{provider})
//   6. 백엔드가 code 처리 → 토큰 발급 → 프론트 콜백으로 리다이렉트
//      예상 URL: /oauth/callback/{provider}?access_token=xxx&refresh_token=yyy...
//   7. 이 페이지가 URL param 파싱 → authStore 저장 → 메인 이동
//
// ★ 세부 파라미터 이름 및 전달 방식은 백엔드 확정 후 조정 필요:
//   - Query params(?) vs Fragment(#) vs Cookie
//   - 필드명: access_token vs accessToken (snake_case vs camelCase)
//   - isNewUser 여부와 필드명
//
// Flow A (백엔드가 code만 넘겨줌)로 확정되면 아래 processCallback 함수 수정 필요:
//   - URL에서 code, state만 파싱
//   - socialLoginApi({ provider, code, state }) 호출
//   - 응답에서 토큰과 사용자 정보 획득
import { useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import useAuthStore from "@/stores/global/authStore";
import type { UserRole } from "@/types/domain/auth";

const VALID_PROVIDERS = ["kakao", "naver", "google"] as const;

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

      // ★ 백엔드 flow 확정 후 여기 파라미터 이름 조정 필요
      // 현재는 Flow B 유력 시나리오로 구현
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const userIdStr = searchParams.get("user_id");
      const name = searchParams.get("name") ?? "";
      const email = searchParams.get("email") ?? "";
      const roleStr = searchParams.get("role");
      const isNewUser = searchParams.get("is_new_user") === "true";
      const joinedAt =
        searchParams.get("joined_at") ?? new Date().toISOString();

      // 에러 파라미터 확인 (OAuth 실패 시 백엔드가 error 필드로 전달할 수도)
      const errorParam = searchParams.get("error");
      if (errorParam) {
        throw new Error(
          searchParams.get("error_description") ??
            "소셜 로그인에 실패했습니다.",
        );
      }

      if (!accessToken || !refreshToken) {
        throw new Error("인증 정보를 받지 못했습니다. 다시 시도해주세요.");
      }

      // authStore에 저장
      const userId = userIdStr ? Number(userIdStr) : 0;
      const role: UserRole = roleStr === "ADMIN" ? "ADMIN" : "MEMBER";

      setAuth(accessToken, refreshToken, {
        userId,
        name,
        email,
        role,
        joinedAt,
      });

      toast.success(`${getProviderName(provider!)}로 로그인되었습니다.`);

      // 신규 회원 여부에 따라 리다이렉트
      if (isNewUser) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate(role === "ADMIN" ? "/admin" : "/", { replace: true });
      }
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
