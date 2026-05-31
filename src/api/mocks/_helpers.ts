// Mock 공통 헬퍼

/** Mock 네트워크 딜레이 (default 400ms ± 100ms) */
export function mockDelay(ms = 400): Promise<void> {
  const jitter = Math.random() * 200;
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

/**
 * Mock 에러 throw — errorMapper의 ApiError shape으로 던지기
 * (instance.ts를 거치지 않으므로 plain object로 던지고
 *  hook의 catch에서 ApiError.fromUnknown으로 정규화하거나
 *  queryClient의 onError에서 일관 처리)
 */
export async function mockError(
  code: string,
  message: string,
  delay = 300,
  status = 400,
): Promise<never> {
  await mockDelay(delay);
  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  throw {
    isSuccess: false,
    code,
    message,
    result: null,
    status,
  };
}

/**
 * 확률 기반 mock 에러 트리거 (개발 중 에러 케이스 테스트용)
 * 예: if (shouldThrow(0.1)) await mockError("SEAT_4001", "이미 선점된 좌석입니다");
 */
export function shouldThrow(probability = 0.1): boolean {
  return Math.random() < probability;
}
