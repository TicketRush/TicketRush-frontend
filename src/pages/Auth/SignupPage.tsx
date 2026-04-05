import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { signupSchema, type SignupFormData } from "../../schemas/auth";
// import { apiClient } from '../../api';
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";

// TODO: 백엔드 완성 시 apiClient.post로 교체
const mockRegister = async (data: SignupFormData) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (data.email === "exist@test.com") {
    throw { response: { status: 409 } };
  }
  return { message: "success" };
};

export default function SignupPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: mockRegister, // TODO: (data) => apiClient.post('/api/auth/register', data)
    onSuccess: () => {
      // TODO: toast.success('회원가입이 완료되었습니다')
      console.log("signup success");
      navigate("/login");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 409) {
        setError("email", { message: "이미 사용 중인 이메일입니다" });
      }
      // status >= 500 은 QueryClient onError에서 toast.error 처리
    },
  });

  const onSubmit = (data: SignupFormData) => {
    mutate(data);
  };

  return (
    <div className="relative flex justify-center min-h-screen px-6 pt-20 pb-10 bg-[#f8f9fa]">
      {/* 뒤로가기 */}
      <div className="absolute top-6 left-6">
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          ← 뒤로가기
        </Button>
      </div>

      {/* 카드 */}
      <div className="w-full max-w-[480px] px-10 py-12 bg-white rounded-2xl border border-border self-start">
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
            icon={<span>👤</span>}
            required
            type="text"
            placeholder="이름을 입력해주세요"
            error={errors.name?.message}
            {...register("name")}
          />
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
            label="인증 번호"
            icon={<span>⊙</span>}
            required
            type="text"
            placeholder="xxxxxx"
            error={errors.verificationCode?.message}
            helperText="이메일로 발송된 인증 번호를 입력해주세요"
            {...register("verificationCode")}
          />
          <Input
            label="비밀번호"
            icon={<span>🔒</span>}
            required
            type="password"
            placeholder="비밀번호를 입력해주세요 (8자 이상)"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="비밀번호 확인"
            icon={<span>🔒</span>}
            required
            type="password"
            placeholder="비밀번호를 다시 입력해주세요"
            error={errors.passwordConfirm?.message}
            {...register("passwordConfirm")}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isPending}
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

        {/* OAuth */}
        <div className="flex gap-3">
          <Button variant="kakao" size="md" className="flex-1">
            카카오
          </Button>
          <Button variant="naver" size="md" className="flex-1">
            네이버
          </Button>
          <Button variant="google" size="md" className="flex-1">
            구글
          </Button>
        </div>

        {/* 푸터 */}
        <p className="font-pretendard text-sm text-text-secondary text-center mt-6">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-primary font-semibold underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
