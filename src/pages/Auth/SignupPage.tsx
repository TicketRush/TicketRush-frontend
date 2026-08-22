// 회원가입 페이지
//
// 백엔드 스펙 반영 변경 (2026-07-19):
//   - signupApi 파라미터에 passwordConfirm 추가 (백엔드 스펙 요구)
//   - ⚠️ consumeEmailAuthApi 단계 제거: send → verify → signup 2단계로 확정.
//     "consume" 엔드포인트는 실제로 존재하지 않음 (404 NoResourceFoundException 확인).
//   - 이미 가입된 이메일: 인증번호 발송 단계에서 AUTH_EMAIL_ALREADY_EXISTS,
//     회원가입 단계에서 USER_EMAIL_ALREADY_EXISTS로 각각 안내 문구 처리.
//
// 변경 이력 (이슈 #119):
//   - 소셜 버튼에 LoginPage와 동일한 OAuth 시작 로직 연결
//     * getOauthUrlApi(provider) → window.location.href 리다이렉트
//     * 실패 시 toast, pendingProvider로 로딩·중복 클릭 방지
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { signupSchema, type SignupFormData } from "../../schemas/auth";
import {
  sendEmailVerificationApi,
  verifyEmailCodeApi,
  signupApi,
  getOauthUrlApi,
} from "@/api/auth";
import { ApiError } from "@/api/errors/errorMapper";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import { saveLoginRedirect } from "@/utils/auth/loginRedirect";
import backbtnIcon from "@/assets/icons/arrow-back.svg";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import userIcon from "@/assets/icons/user.svg";
import emailIcon from "@/assets/icons/email.svg";
import checkIcon from "@/assets/icons/check.svg";
import lockIcon from "@/assets/icons/lock.svg";

type SocialProvider = "kakao" | "naver" | "google";

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 이메일 인증 상태
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // 비밀번호 토글
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // 소셜 로그인/가입 진행 중인 provider (중복 클릭 방지) — LoginPage와 동일
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      isEmailVerified: false,
    },
  });

  const email = watch("email");
  const verificationCode = watch("verificationCode");
  const isEmailVerified = watch("isEmailVerified");

  // 예매 흐름에서 밀려온 경우 복귀 경로를 보관한다. 가입 후 /login으로 넘어가도
  // sessionStorage에 남아 있어 로그인 성공 시 그대로 복귀한다 (#101)
  useEffect(() => {
    saveLoginRedirect((location.state as { from?: unknown } | null)?.from);
  }, [location.state]);

  // 재발송 카운트다운 (1초 단위 감소)
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setInterval(() => {
      setResendCountdown((p) => Math.max(0, p - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCountdown]);

  // 인증번호 발송 mutation
  const sendCodeMutation = useMutation({
    mutationFn: () => sendEmailVerificationApi(email),
    onSuccess: () => {
      setVerificationSent(true);
      setResendCountdown(180); // 3분 쿨다운
      toast.success("인증번호가 발송되었습니다. (mock: 123456)");
    },
    onError: (error: unknown) => {
      const apiError = ApiError.fromUnknown(error);
      if (apiError.code === ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS) {
        setError("email", { message: "이미 가입된 이메일입니다" });
        return;
      }
      toast.error(apiError.message || "인증번호 발송에 실패했습니다.");
    },
  });

  // 인증번호 확인 mutation
  const verifyCodeMutation = useMutation({
    mutationFn: () => verifyEmailCodeApi(email, verificationCode),
    onSuccess: () => {
      setValue("isEmailVerified", true);
      trigger("isEmailVerified"); // 검증 즉시 재실행
      toast.success("이메일이 인증되었습니다.");
    },
    onError: (error: unknown) => {
      const err =
        error instanceof Error
          ? error
          : new Error("인증번호가 일치하지 않습니다.");
      toast.error(err.message);
    },
  });

  // 회원가입 mutation
  // 이메일 인증(send → verify) 완료 후 바로 signupApi 호출.
  // ⚠️ "consume" 단계는 존재하지 않음 (제거됨, 2026-07-18 백엔드 확인).
  const signupMutation = useMutation({
    mutationFn: (data: SignupFormData) =>
      signupApi({
        name: data.name,
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
      }),
    onSuccess: () => {
      toast.success("회원가입이 완료되었습니다.");
      // 예매 흐름에서 저장한 복귀 경로를 로그인 페이지가 지우지 않게 한다
      navigate("/login", { state: { preserveRedirect: true } });
    },
    onError: (error: unknown) => {
      const apiError = ApiError.fromUnknown(error);
      // 실 백엔드는 409가 아니라 400 + USER_EMAIL_ALREADY_EXISTS로 응답
      if (apiError.code === ERROR_CODES.USER_EMAIL_ALREADY_EXISTS) {
        setError("email", { message: "이미 가입된 이메일입니다" });
      } else {
        toast.error(apiError.message || "회원가입에 실패했습니다.");
      }
    },
  });

  async function handleSendCode() {
    // 이메일 형식 먼저 검증
    const isEmailValid = await trigger("email");
    if (!isEmailValid) return;
    sendCodeMutation.mutate();
  }

  async function handleVerifyCode() {
    const isCodeValid = await trigger("verificationCode");
    if (!isCodeValid) return;
    verifyCodeMutation.mutate();
  }

  const onSubmit = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  /** LoginPage와 동일 — 소셜은 가입/로그인 구분 없이 OAuth URL로 시작 */
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

  // 이메일 입력 변경 시 인증 상태 초기화
  useEffect(() => {
    if (isEmailVerified) {
      setValue("isEmailVerified", false);
      setVerificationSent(false);
      setResendCountdown(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <div className="relative flex justify-center min-h-screen px-6 pt-20 pb-10 bg-white">
      {/* 뒤로가기 */}
      <div className="absolute top-6 left-6">
        <Button
          variant="outline"
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
          회원가입
        </h1>
        <p className="font-pretendard text-base text-text-secondary mb-8">
          새 계정을 만드세요
        </p>

        {/* 폼 */}
        <form
          className="flex flex-col gap-5"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Input
            label="이름"
            icon={<img src={userIcon} alt="" className="w-4 h-4" />}
            required
            type="text"
            placeholder="이름을 입력해주세요"
            error={errors.name?.message}
            {...register("name")}
          />

          <Input
            label="이메일"
            icon={<img src={emailIcon} alt="" className="w-4 h-4" />}
            required
            type="email"
            placeholder="user@example.com"
            error={errors.email?.message}
            disabled={isEmailVerified}
            {...register("email")}
          />

          {/* 인증번호 + 발송/확인 버튼 */}
          <div>
            <label className="font-pretendard text-sm font-medium text-text mb-1.5 inline-block">
              <span className="inline-flex items-center gap-1.5">
                <img src={checkIcon} alt="" className="w-4 h-4" />
                인증 번호
                <span className="text-error">*</span>
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="xxxxxx"
                disabled={!verificationSent || isEmailVerified}
                className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-text-secondary"
                {...register("verificationCode")}
              />
              {isEmailVerified ? (
                <span className="px-4 py-2.5 rounded-lg bg-green-100 text-green-700 font-semibold text-sm whitespace-nowrap inline-flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  인증완료
                </span>
              ) : !verificationSent ? (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleSendCode}
                  loading={sendCodeMutation.isPending}
                  className="whitespace-nowrap shrink-0"
                >
                  인증번호 발송
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleVerifyCode}
                  loading={verifyCodeMutation.isPending}
                  className="whitespace-nowrap shrink-0"
                >
                  확인
                </Button>
              )}
            </div>
            {errors.verificationCode?.message && (
              <p className="text-xs text-error mt-1">
                {errors.verificationCode.message}
              </p>
            )}
            {errors.isEmailVerified?.message && !isEmailVerified && (
              <p className="text-xs text-error mt-1">
                {errors.isEmailVerified.message}
              </p>
            )}
            {verificationSent && !isEmailVerified && resendCountdown > 0 && (
              <p className="text-xs text-text-secondary mt-1">
                재발송 가능: {Math.floor(resendCountdown / 60)}:
                {String(resendCountdown % 60).padStart(2, "0")}
              </p>
            )}
            {verificationSent && !isEmailVerified && resendCountdown === 0 && (
              <button
                type="button"
                onClick={handleSendCode}
                className="text-xs text-primary underline mt-1"
              >
                인증번호 재발송
              </button>
            )}
          </div>

          {/* 비밀번호 + 토글 */}
          <PasswordInput
            label="비밀번호"
            icon={lockIcon}
            placeholder="영소문자, 숫자, 특수문자 포함 12자 이상"
            show={showPassword}
            onToggle={() => setShowPassword((p) => !p)}
            error={errors.password?.message}
            register={register("password")}
          />

          {/* 비밀번호 확인 + 토글 */}
          <PasswordInput
            label="비밀번호 확인"
            icon={lockIcon}
            placeholder="비밀번호를 다시 입력해주세요"
            show={showPasswordConfirm}
            onToggle={() => setShowPasswordConfirm((p) => !p)}
            error={errors.passwordConfirm?.message}
            register={register("passwordConfirm")}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={signupMutation.isPending}
            disabled={!isEmailVerified}
          >
            회원가입
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

        {/* OAuth — LoginPage와 동일 핸들러 (이슈 #119) */}
        <div className="flex gap-3">
          <Button
            variant="kakao"
            size="oauth"
            className="flex-1"
            type="button"
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
            type="button"
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
            type="button"
            loading={pendingProvider === "google"}
            disabled={pendingProvider !== null}
            onClick={() => handleSocialLogin("google")}
          >
            구글
          </Button>
        </div>

        {/* 푸터 */}
        <p className="font-pretendard text-sm text-text-secondary text-center mt-6">
          이미 계정이 있으신가요?{" "}
          <Link
            to="/login"
            state={{ preserveRedirect: true }}
            className="text-primary font-semibold underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

// 비밀번호 입력 + 눈 아이콘 토글 (재사용 가능 컴포넌트)
function PasswordInput({
  label,
  icon,
  placeholder,
  show,
  onToggle,
  error,
  register,
}: {
  label: string;
  icon: string;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  error?: string;
  register: ReturnType<ReturnType<typeof useForm<SignupFormData>>["register"]>;
}) {
  return (
    <div>
      <label className="font-pretendard text-sm font-medium text-text mb-1.5 inline-block">
        <span className="inline-flex items-center gap-1.5">
          <img src={icon} alt="" className="w-4 h-4" />
          {label}
          <span className="text-error">*</span>
        </span>
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          {...register}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
          aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}
