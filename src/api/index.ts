// api/index.ts — 배럴 export
export { default as apiClient } from "./instance";
export { queryClient } from "./queryClient";

// 타입
export type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from "./types/response";
export { isApiError, isApiSuccess } from "./types/response";

// 에러
export { ERROR_CODES, SUCCESS_CODES } from "./errors/errorCodes";
export type { ErrorCode, SuccessCode, ApiCode } from "./errors/errorCodes";
export {
  ApiError,
  mapErrorToMessage,
  isUnauthorizedError,
  isForbiddenError,
  isValidationError,
  isIgnorablePendingCancelError,
} from "./errors/errorMapper";
