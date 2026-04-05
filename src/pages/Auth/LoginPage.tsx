import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, type LoginFormData } from "../../schemas/auth";
// import { useAuthStore } from '../../stores/authStore';
// import { apiClient } from '../../api';
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";

// TODO: 백엔드 완성 시 apiClient.post로 교체
const mockLogin = async (data: LoginFormData) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (data.email === "fail@test.com") {
    throw { response: { status: 401 } };
  }
  return {
    accessToken: "mock-token",
    user: { email: data.email, name: "테스트", role: "USER" },
  };
};

export default function LoginPage() {
  const navigate = useNavigate();
  // const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    setFocus,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // 페이지 마운트 시 이메일 Input에 포커스
  useEffect(() => {
    setFocus("email");
  }, [setFocus]);

  const { mutate, isPending } = useMutation({
    mutationFn: mockLogin, // TODO: (data) => apiClient.post('/api/auth/login', data)
    onSuccess: (res) => {
      // TODO: authStore 연동
      // setAuth(res.accessToken, res.user);
      console.log("login success", res);
      navigate("/");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 401) {
        setError("root", {
          message: "이메일 또는 비밀번호가 올바르지 않습니다",
        });
      }
      // 네트워크 에러는 QueryClient onError에서 toast 처리
    },
  });

  const onSubmit = (data: LoginFormData) => {
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
      {/* <div className="bg-red-500 text-white p-4">테스트</div>
      <div className="bg-primary text-text p-4">커스텀 색상 테스트</div>
      <div className="bg-primary text-text p-4">커스텀 색상 테스트</div> */}
      {/* 카드 */}
      <div className="w-full max-w-[480px] px-10 py-12 bg-white rounded-2xl border border-border self-start">
        <h1 className="font-pretendard text-[28px] font-bold text-text mb-2">
          로그인
        </h1>
        <p className="font-pretendard text-base text-text-secondary mb-8">
          계정에 로그인하세요
        </p>

        {/* 폼 */}
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
            loading={isPending}
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
          계정이 없으신가요?{" "}
          <Link to="/signup" className="text-primary font-semibold underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
