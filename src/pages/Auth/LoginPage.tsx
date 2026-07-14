// 로그인 페이지
//
// 변경 이력 (2026-07-12):
//   - 소셜 로그인 버튼 클릭 로직 추가 (이슈 #119)
//     * getOauthUrlApi(provider)로 OAuth URL 받아서 리다이렉트
//     * 실패 시 toast 알림
//     * 진행 중 버튼 비활성화 (중복 클릭 방지)
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { loginSchema, type LoginFormData } from "../../schemas/auth";
import { useEmailLogin } from "@/hooks/auth/useAuth";
import { getOauthUrlApi } from "@/api/auth";
import { ApiError } from "@/api/errors/errorMapper";
import backbtnIcon from "@/assets/icons/arrow-back.svg";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import emailIcon from "@/assets/icons/email.svg";
import lockIcon from "@/assets/icons/lock.svg";

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
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    emailLogin.mutate(data, {
      onError: (error: unknown) => {
        const maybeResp = (error as { response?: { status?: number } } | null)
          ?.response;
        if (maybeResp?.status === 401) {
          setError("email", { message: " " });
          setError("password", {
            message: "이메일 또는 비밀번호가 올바르지 않습니다",
          });
        } else {
          const err =
            error instanceof ApiError || error instanceof Error
              ? error
              : new Error("로그인에 실패했습니다.");
          toast.error(err.message);
        }
      },
    });
  };

  async function handleSocialLogin(provider: SocialProvider) {
    if (pendingProvider) return; // 이미 진행 중이면 무시

    setPendingProvider(provider);
    try {
      // 백엔드에서 OAuth 로그인 URL 받아옴
      const { url } = await getOauthUrlApi(provider);

      // 소셜 로그인 페이지로 리다이렉트 (전체 페이지 이동)
      // 이후 흐름: 소셜 로그인 성공 → 백엔드 콜백 → 프론트 콜백(/oauth/callback/:provider) 이동
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
    <div className="relative flex justify-center min-h-screen px-6 pt-20 pb-10 bg-white">
      {/* 뒤로가기 */}
      <div className="absolute top-6 left-6">
        <Button
          variant="secondary"
          size="sm"
          icon={<img src={backbtnIcon} alt="" className="w-4 h-4" />}
          onClick={() => navigate(-1)}
        >
          뒤로가기
        </Button>
      </div>

      {/* 카드 */}
      <div className="w-full max-w-[448px] px-10 py-12 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] self-start">
        <h1 className="font-pretendard text-[28px] font-bold text-text mb-2">
          로그인
        </h1>
        <p className="font-pretendard text-base text-text-secondary mb-8">
          계정에 로그인하여 서비스를 이용하세요
        </p>

        {/* 폼 */}
        <form
          className="flex flex-col gap-5"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Input
            label="이메일"
            icon={<img src={emailIcon} alt="" className="w-4 h-4" />}
            required
            type="email"
            placeholder="user@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="비밀번호"
            icon={<img src={lockIcon} alt="" className="w-4 h-4" />}
            required
            type="password"
            placeholder="비밀번호를 입력해주세요"
            error={errors.password?.message}
            {...register("password")}
          />

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

        {/* 구분선 */}
        <div className="flex items-center gap-4 my-7">
          <div className="flex-1 h-px bg-border" />
          <span className="font-pretendard text-sm text-text-secondary whitespace-nowrap">
            간편 로그인
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* OAuth 3종 */}
        <div className="flex gap-3">
          <Button
            variant="kakao"
            size="oauth"
            className="flex-1"
            loading={pendingProvider === "kakao"}
            disabled={pendingProvider !== null}
            onClick={() => handleSocialLogin("kakao")}
          >
            카카오
          </Button>
          <Button
            variant="naver"
            size="oauth"
            className="flex-1"
            loading={pendingProvider === "naver"}
            disabled={pendingProvider !== null}
            onClick={() => handleSocialLogin("naver")}
          >
            네이버
          </Button>
          <Button
            variant="google"
            size="oauth"
            className="flex-1"
            loading={pendingProvider === "google"}
            disabled={pendingProvider !== null}
            onClick={() => handleSocialLogin("google")}
          >
            구글
          </Button>
        </div>

        {/* 푸터 */}
        <p className="font-pretendard text-sm text-text-secondary text-center mt-6">
          아직 회원이 아니신가요?{" "}
          <Link to="/signup" className="text-primary font-semibold underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
