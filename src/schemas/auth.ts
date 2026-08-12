import { z } from "zod";

// 백엔드 비밀번호 정책과 동일한 정규식
// (user-service SignupUseCase.PASSWORD_PATTERN, 2026-07-19 백엔드 코드 확인):
//   - 소문자 1개 이상
//   - 숫자 1개 이상
//   - 특수문자 1개 이상
//   - 총 12자 이상
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요")
    .email("올바른 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요"),
    email: z
      .string()
      .min(1, "이메일을 입력해주세요")
      .email("올바른 이메일을 입력해주세요"),
    verificationCode: z.string().min(1, "인증 번호를 입력해주세요"),
    /** 이메일 인증 완료 여부 — UI 상태이지만 폼 검증에 필요 */
    isEmailVerified: z.boolean().refine((val) => val === true, {
      message: "이메일 인증을 완료해주세요",
    }),
    password: z
      .string()
      .min(1, "비밀번호를 입력해주세요")
      .regex(
        PASSWORD_PATTERN,
        "비밀번호는 소문자, 숫자, 특수문자를 포함하여 12자 이상이어야 합니다",
      ),
    passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["passwordConfirm"],
  });

export type SignupFormData = z.infer<typeof signupSchema>;
