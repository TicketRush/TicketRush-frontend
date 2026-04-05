// 성공 코드
export const SUCCESS_CODES = {
  OK: "COMMON_200",
  CREATED: "COMMON_201",
  NO_CONTENT: "COMMON_204",
} as const;

// 에러 코드
export const ERROR_CODES = {
  // 공통
  BAD_REQUEST: "COMMON_400",
  UNAUTHORIZED: "COMMON_401",
  FORBIDDEN: "COMMON_403",
  NOT_FOUND: "COMMON_404",
  INTERNAL_SERVER_ERROR: "COMMON_500",

  // 입력값 검증
  VALIDATION_ERROR: "VALID_401",

  // --------------------------------------------------
  // TODO: 도메인별 에러 코드 추가 (백엔드 확정 후)
  // --------------------------------------------------
} as const;

export type SuccessCode = (typeof SUCCESS_CODES)[keyof typeof SUCCESS_CODES];
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type ApiCode = SuccessCode | ErrorCode;
