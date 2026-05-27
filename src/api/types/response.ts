// 백엔드 공통 응답 포맷 — swagger 기준 (2026-05-14)

import type { PaginationInfo } from "./pagination";

export interface ApiResponse<T = unknown> {
  isSuccess: boolean;
  code: string;
  message: string;
  traceId?: string;
  paginationInfo?: PaginationInfo;
  result: T | null;
}

export interface ApiSuccessResponse<T> extends ApiResponse<T> {
  isSuccess: true;
  result: T;
}

export interface ApiErrorResponse extends ApiResponse<null> {
  isSuccess: false;
  result: null;
}

// 타입 가드
export function isApiError(res: ApiResponse): res is ApiErrorResponse {
  return !res.isSuccess;
}

export function isApiSuccess<T>(
  res: ApiResponse<T>,
): res is ApiSuccessResponse<T> {
  return res.isSuccess;
}
