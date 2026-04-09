//  백엔드 공통 응답 포맷 (성공 + 실패 모두 동일 구조)
export interface ApiResponse<T = unknown> {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T | null;
}

// 성공 응답 — isSuccess: true 가 보장된 타입
export interface ApiSuccessResponse<T> extends ApiResponse<T> {
  isSuccess: true;
  result: T;
}

// 실패 응답 — isSuccess: false 가 보장된 타입
export interface ApiErrorResponse extends ApiResponse<null> {
  isSuccess: false;
  result: null;
}

// -------------------------------------------------------
// 타입 가드
// -------------------------------------------------------

export function isApiError(res: ApiResponse): res is ApiErrorResponse {
  return !res.isSuccess;
}

export function isApiSuccess<T>(
  res: ApiResponse<T>,
): res is ApiSuccessResponse<T> {
  return res.isSuccess;
}
