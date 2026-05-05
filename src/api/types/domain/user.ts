// types/domain/user.ts

// 사용자 역할
export type UserRole = "USER" | "ADMIN";

// 사용자 정보 (로그인/회원가입 API 응답에서 오는 데이터)
export interface User {
  name: string;
  email: string;
  role: UserRole;
}

// 로그인 API 응답
export interface LoginResponse {
  accessToken: string;
  user: User;
}

// 회원가입 API 응답
export interface SignupResponse {
  message: string;
}
