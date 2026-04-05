// -------------------------------------------------------
// errorMapper: 백엔드 에러 코드 → 프론트 UI 메시지 변환
//
// 역할: 백엔드 스펙 변경으로부터 프론트 UI를 보호하는 안정 레이어
// - 백엔드 message를 기본값으로 활용하되 프론트에서 재정의가 필요한 경우 여기서 오버라이드
// -------------------------------------------------------

import { ERROR_CODES, type ErrorCode } from "./errorCodes";
import type { ApiErrorResponse } from "../types/response";

// -------------------------------------------------------
// 커스텀 에러 클래스
// -------------------------------------------------------

export class ApiError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(response: ApiErrorResponse, httpStatus?: number) {
    const uiMessage = mapErrorToMessage(response.code, response.message);
    super(uiMessage);

    this.name = "ApiError";
    this.code = response.code;
    this.httpStatus = httpStatus;
  }
}

// -------------------------------------------------------
// 에러 코드 → UI 메시지 매핑 테이블
//
// - null 이면 백엔드 message를 그대로 사용
// - 문자열이면 프론트에서 오버라이드
// -------------------------------------------------------

const ERROR_MESSAGE_OVERRIDES: Partial<Record<ErrorCode, string>> = {
  // 예시: 백엔드 메시지 대신 프론트 자체 문구를 쓰고 싶을 때
  // [ERROR_CODES.UNAUTHORIZED]: '로그인이 필요합니다. 다시 로그인해주세요.',
  // [ERROR_CODES.FORBIDDEN]: '접근 권한이 없습니다.',
};

const FALLBACK_MESSAGE =
  "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

// -------------------------------------------------------
// 매핑 함수
// -------------------------------------------------------

// 우선순위:
// 1. ERROR_MESSAGE_OVERRIDES에 정의된 프론트 오버라이드 메시지
// 2. 백엔드에서 내려준 message
// 3. FALLBACK_MESSAGE
//
export function mapErrorToMessage(
  code: string,
  backendMessage?: string,
): string {
  const override = ERROR_MESSAGE_OVERRIDES[code as ErrorCode];
  if (override) return override;
  if (backendMessage) return backendMessage;
  return FALLBACK_MESSAGE;
}

// -------------------------------------------------------
// 유틸: 특정 에러 코드인지 확인
// -------------------------------------------------------

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.code === ERROR_CODES.FORBIDDEN;
}

export function isValidationError(error: unknown): boolean {
  return (
    error instanceof ApiError && error.code === ERROR_CODES.VALIDATION_ERROR
  );
}
