// 로그인 페이지
//
// 변경 이력 (이슈 #119):
//   - develop LoginPage UI/에러 처리(setFocus, errors.root) 유지
//   - 소셜 로그인만 추가: getOauthUrlApi → 리다이렉트, provider별 loading·중복 클릭 방지
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { loginSchema, type LoginFormData } from "../../schemas/auth";
import { useEmailLogin } from "@/hooks/auth/useAuth";
import { getOauthUrlApi } from "@/api/auth";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";

type SocialProvider = "kakao" | "naver" | "google";

export default function LoginPage() {
  const navigate = useNavigate();
  const emailLogin = useEmailLogin();

  // 소셜 로그인 진행 중인 provider (중복 클릭 방지)
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    setFocus,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    setFocus("email");
  }, [setFocus]);

  const onSubmit = (data: LoginFormData) => {
    emailLogin.mutate(data, {
      onError: (error: unknown) => {
        const err = error as {
          response?: { status?: number };
          message?: string;
        };
        if (err?.response?.status === 401) {
          setError("root", {
            message: "이메일 또는 비밀번호가 올바르지 않습니다",
          });
        } else {
          setError("root", {
            message: err?.message ?? "로그인 중 오류가 발생했습니다",
          });
        }
      },
    });
  };

  async function handleSocialLogin(provider: SocialProvider) {
    if (pendingProvider) return;

    setPendingProvider(provider);
    try {
      const { url } = await getOauthUrlApi(provider);
      // 이후: BE 콜백 → /oauth/callback/:provider?code=... → social/login
      window.location.href = url;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "소셜 로그인 요청에 실패했습니다.";
      toast.error(message);
      setPendingProvider(null);
    }
  }

  return (
    <div className="relative flex justify-center min-h-screen px-6 pt-20 pb-10 bg-[#f8f9fa]">
      <div className="absolute top-6 left-6">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          ← 뒤로가기
        </Button>
      </div>

      <div className="w-full max-w-[480px] px-10 py-12 bg-white rounded-2xl border border-border self-start">
        <h1 className="font-pretendard text-[28px] font-bold text-text mb-2">
          로그인
        </h1>
        <p className="font-pretendard text-base text-text-secondary mb-8">
          계정에 로그인하세요
        </p>

        <form
          className="flex flex-col gap-5"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Input
            label="이메일"
            icon={<span>✉</span>}
            required
            type="email"
            placeholder="user@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="비밀번호"
            icon={<span>🔒</span>}
            required
            type="password"
            placeholder="비밀번호를 입력해주세요"
            error={errors.password?.message}
            {...register("password")}
          />

          {errors.root && (
            <p className="font-pretendard text-sm text-error text-center">
              {errors.root.message}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={emailLogin.isPending}
          >
            로그인
          </Button>
        </form>

        <div className="flex items-center gap-4 my-7">
          <div className="flex-1 h-px bg-border" />
          <span className="font-pretendard text-sm text-text-secondary whitespace-nowrap">
            간편 로그인
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="kakao"
            size="md"
            className="flex-1"
            loading={pendingProvider === "kakao"}
            disabled={pendingProvider !== null}
            onClick={() => handleSocialLogin("kakao")}
          >
            카카오
          </Button>
          <Button
            type="button"
            variant="naver"
            size="md"
            className="flex-1"
            loading={pendingProvider === "naver"}
            disabled={pendingProvider !== null}
            onClick={() => handleSocialLogin("naver")}
          >
            네이버
          </Button>
          <Button
            type="button"
            variant="google"
            size="md"
            className="flex-1"
            loading={pendingProvider === "google"}
            disabled={pendingProvider !== null}
            onClick={() => handleSocialLogin("google")}
          >
            구글
          </Button>
        </div>

        <p className="font-pretendard text-sm text-text-secondary text-center mt-6">
          계정이 없으신가요?{" "}
          <Link to="/signup" className="text-primary font-semibold underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
