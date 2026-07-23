// OAuth 콜백 페이지 - 카카오/네이버/구글 공용
//
// Flow A (확정):
//   백엔드가 인가 코드(code)만 붙여 프론트로 리다이렉트
//   → POST /api/v1/auth/social/login { provider, code } 로 토큰 교환
//
// ⚠️ React StrictMode는 useEffect를 두 번 실행한다. OAuth code는 1회용이라
//   두 번째 호출이 실패한다. sessionStorage로 동일 code 재사용을 막는다.
import { useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSocialLogin } from "@/hooks/auth/useAuth";
import type { OauthProvider } from "@/types/domain/auth";

const PROVIDER_MAP: Record<string, OauthProvider> = {
  kakao: "KAKAO",
  naver: "NAVER",
  google: "GOOGLE",
};

/** StrictMode 이중 실행 / 동일 code 재호출 방지 (모듈 스코프 — remount에도 유지) */
const exchangedCodes = new Set<string>();

export default function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const socialLoginMutation = useSocialLogin();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    processCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function processCallback() {
    const providerCode = provider ? PROVIDER_MAP[provider] : undefined;
    if (!providerCode) {
      toast.error("유효하지 않은 로그인 방식입니다.");
      navigate("/login", { replace: true });
      return;
    }

    const errorParam = searchParams.get("error");
    if (errorParam) {
      toast.error(
        searchParams.get("error_description") ?? "소셜 로그인에 실패했습니다.",
      );
      navigate("/login", { replace: true });
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      toast.error("인증 정보를 받지 못했습니다. 다시 시도해주세요.");
      navigate("/login", { replace: true });
      return;
    }

    // OAuth code는 1회용. StrictMode remount 시 두 번째 호출은 조용히 스킵.
    const exchangeKey = `${providerCode}:${code}`;
    if (exchangedCodes.has(exchangeKey)) {
      return;
    }
    exchangedCodes.add(exchangeKey);

    socialLoginMutation.mutate(
      { provider: providerCode, code },
      {
        onSuccess: (data) => {
          if (data.isNewUser) {
            toast.success(
              `${getProviderName(provider!)} 계정으로 가입이 완료되었습니다! TicketRush에 오신 것을 환영해요 🎉`,
            );
          } else {
            toast.success(`${getProviderName(provider!)}로 로그인되었습니다.`);
          }
        },
        onError: (error: unknown) => {
          exchangedCodes.delete(exchangeKey); // 실패 시 재시도 허용
          const message =
            error instanceof Error
              ? error.message
              : "로그인 처리 중 오류가 발생했습니다.";
          toast.error(message);
          navigate("/login", { replace: true });
        },
      },
    );
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
