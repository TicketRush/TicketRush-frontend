// -------------------------------------------------------
// errorMapper: 백엔드 에러 코드 → 프론트 UI 메시지 변환
//
// 역할: 백엔드 스펙 변경으로부터 프론트 UI를 보호하는 안정 레이어
// - 백엔드 message를 기본값으로 활용하되, 프론트에서 재정의가 필요한 경우 여기서 오버라이드
// - traceId는 디버깅용으로 보존 (토스트 등에 일부 노출 가능)
//
// 변경 이력:
// - 2026-05-21: traceId 필드 추가, fromUnknown 헬퍼 추가
// -------------------------------------------------------

import { ERROR_CODES, type ErrorCode } from "./errorCodes";
import type { ApiErrorResponse } from "../types/response";

// -------------------------------------------------------
// 커스텀 에러 클래스
// -------------------------------------------------------

export class ApiError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;
  public readonly traceId?: string;

  constructor(response: ApiErrorResponse, httpStatus?: number) {
    const uiMessage = mapErrorToMessage(response.code, response.message);
    super(uiMessage);

    this.name = "ApiError";
    this.code = response.code;
    this.httpStatus = httpStatus;
    this.traceId = response.traceId;

    // Error 클래스 상속 시 instanceof 깨지는 문제 방지
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * 알 수 없는 에러 객체 → ApiError로 정규화
   * - mock에서 throw한 plain object
   * - 라이브러리에서 던진 비표준 에러
   * - 모르는 형태의 객체
   *
   * catch 블록에서 어떤 에러든 안전하게 ApiError로 변환할 때 사용.
   */
  static fromUnknown(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    // mock_helpers.ts의 mockError가 던지는 plain object 포맷
    if (
      error &&
      typeof error === "object" &&
      "isSuccess" in error &&
      "code" in error &&
      "message" in error
    ) {
      const e = error as ApiErrorResponse & { status?: number };
      return new ApiError(
        {
          isSuccess: false,
          code: e.code,
          message: e.message,
          traceId: e.traceId,
          result: null,
        },
        e.status,
      );
    }

    // Error 인스턴스 (네트워크, 코드 버그 등)
    if (error instanceof Error) {
      return new ApiError(
        {
          isSuccess: false,
          code: "UNKNOWN",
          message: error.message,
          result: null,
        },
        undefined,
      );
    }

    return new ApiError(
      {
        isSuccess: false,
        code: "UNKNOWN",
        message: "알 수 없는 오류가 발생했습니다.",
        result: null,
      },
      undefined,
    );
  }

  /**
   * 토스트/로그용 traceId 단축 표시 (앞 8자리)
   * 디버깅 시 백엔드 로그와 매칭하기 위함.
   */
  get shortTraceId(): string | undefined {
    return this.traceId?.slice(0, 8);
  }
}

// -------------------------------------------------------
// 에러 코드 → UI 메시지 매핑 테이블
//
// - 정의되지 않은 코드는 백엔드 message를 그대로 사용
// - 문자열이 정의된 코드는 백엔드 메시지를 오버라이드
// -------------------------------------------------------

const ERROR_MESSAGE_OVERRIDES: Partial<Record<ErrorCode | string, string>> = {
  // 네트워크/시스템 — instance.ts에서 throw하는 코드들
  NETWORK_ERROR: "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.",
  UNKNOWN: "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  AUTH_UNAUTHORIZED: "로그인이 만료되었습니다. 다시 로그인해주세요.",

  [ERROR_CODES.PERFORMANCE_INVALID_DASHBOARD_PERIOD]:
    "조회 시작일은 종료일보다 늦을 수 없습니다.",
  [ERROR_CODES.PERFORMANCE_DASHBOARD_PERIOD_TOO_LONG]:
    "조회 기간은 최대 92일까지 지정할 수 있습니다.",

  // 예시: 백엔드 에러 코드가 확정되는 대로 여기에 추가
  // [ERROR_CODES.UNAUTHORIZED]: "로그인이 필요합니다.",
  // [ERROR_CODES.FORBIDDEN]: "접근 권한이 없습니다.",
  // SEAT_ALREADY_HELD: "이미 다른 사용자가 선점한 좌석입니다. 다른 좌석을 선택해주세요.",
  // BOOKING_EXPIRED: "예매 시간이 만료되었습니다. 다시 시도해주세요.",
};

const FALLBACK_MESSAGE =
  "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

// -------------------------------------------------------
// 매핑 함수
// -------------------------------------------------------

/**
 * 우선순위:
 * 1. ERROR_MESSAGE_OVERRIDES에 정의된 프론트 오버라이드 메시지
 * 2. 백엔드에서 내려준 message
 * 3. FALLBACK_MESSAGE
 */
export function mapErrorToMessage(
  code: string,
  backendMessage?: string,
): string {
  const override = ERROR_MESSAGE_OVERRIDES[code];
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

/**
 * 네트워크 에러인지 (오프라인, 타임아웃 등)
 * → 재시도 가능한 에러로 분류 가능
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "NETWORK_ERROR";
}

/**
 * PENDING 취소(DELETE booking) 실패를 무시해도 안전한지.
 * 이미 없거나 만료/취소된 예매는 새 PENDING 생성 전에 통과시키고,
 * 그 외(네트워크·5xx 등)는 호출측에서 새 예매 생성을 중단해야 한다.
 */
export function isIgnorablePendingCancelError(error: unknown): boolean {
  const apiError = ApiError.fromUnknown(error);
  if (apiError.httpStatus === 404) return true;

  return (
    apiError.code === ERROR_CODES.BOOKING_NOT_FOUND ||
    apiError.code === ERROR_CODES.BOOKING_EXPIRED ||
    apiError.code === ERROR_CODES.BOOKING_CANCEL_NOT_ALLOWED ||
    // mock alias (실 API 코드표에는 없음)
    apiError.code === "BOOKING_ALREADY_CANCELED"
  );
}
