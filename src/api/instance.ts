// -------------------------------------------------------
// src/api/instance.ts
// Axios 인스턴스 — 프로젝트 유일한 HTTP 클라이언트
//
// 변경 이력:
// - 2026-05-21:
//   - axios-case-converter 적용 (camelCase ↔ snake_case 자동 변환)
//   - AxiosResponse에 paginationInfo, traceId 필드 추가 (module augmentation)
// - 2026-07-10:
//   - 401 시 refresh 토큰 자동 재발급 로직 추가 (이슈 #120)
//     * 동시성 제어: 진행 중 refresh는 1개만 (Promise 캐싱)
//     * 무한 루프 방지: _retry 플래그로 재시도 요청 스킵
//     * 순환 참조 방지: refresh 요청은 raw axios 사용
//   - Request interceptor에 PUBLIC_ENDPOINTS 화이트리스트 추가
// - 2026-07-11:
//   - PR #114 리뷰 반영: 전역 Content-Type 제거, ignoreHeaders: true 옵션
// - 2026-07-12 (후속 리뷰 반영):
//   - PUBLIC_ENDPOINTS 매칭 로직 개선:
//     * query params/hash 제거 후 pathname으로 비교
//     * exact match(전체 경로 일치) + prefix match(하위 경로) 두 그룹으로 분리
//     * substring match(includes) 사용 안 함 → endpoint 이름 겹치는 오탐지 방지
//   - 재시도 후 두 번째 401 감지 시 로그아웃 안전장치 추가
//     * refresh 성공 후 재시도 요청이 다시 401 반환하는 극단 케이스 방지
//   - refresh 실패 시 원인 로깅 (console.error)
//   - window.location.href → replace: 히스토리 정리
//   - PUBLIC_ENDPOINTS에 as const, API_BASE_URL 상수화, 구조 분해 적용
// - 2026-07-21 (백엔드 소스 직접 확인):
//   - applyCaseMiddleware에 ignoreParams: true 추가.
//     GET 쿼리 파라미터는 Jackson 네이밍 전략과 무관하게 컨트롤러의 Java 필드명
//     그대로(camelCase) 바인딩되므로, snake_case 자동 변환이 minPrice/maxPrice/
//     cursorId/seatIds 같은 다단어 파라미터를 조용히 깨뜨리고 있었음.
// - 2026-09-19:
//   - 공개 조회 endpoint(/performance, /performance/{id}, /banner,
//     /seat/{id}/seat-counts)를 PUBLIC_ENDPOINTS에 추가. 서버 재시작 후
//     localStorage에 남은 만료 토큰이 비로그인도 보는 공연 목록/배너/잔여석
//     요청에까지 붙어, 로그아웃해야 화면이 다시 보이는 문제가 있었음.
//   - 관리자 경로(/performance/admin/..., /seat/admin/...)와 겹치지 않도록
//     {id}가 숫자인 경로만 정규식으로 매칭.
//   - 토큰 거부 판별을 401 전용에서 isTokenRejection(401 + 토큰 문제인 403)으로
//     확대. 게이트웨이가 만료 토큰을 403으로 자르면 재발급도 로그아웃도 하지
//     않아 죽은 토큰이 계속 남던 문제. 권한 부족 403은 제외해 정상 로그인
//     사용자가 로그아웃되지 않게 한다.
//   - forceLogout: 이미 /login이면 replace 생략(리로드 루프 방지), 토큰 삭제는 항상.
//   - performTokenRefresh가 USE_MOCK이면 mockReissue를 탄다. 이전에는 raw
//     axios로 실 /auth/reissue만 호출해 mock 모드에서 재발급이 항상 실패했다.
//   - persist merge에서 JWT exp가 둘 다 끝난 세션을 조용히 비운다. 헤더만
//     로그인처럼 보이던 상태를 첫 렌더부터 막는다.
// -------------------------------------------------------

import axios, {
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import applyCaseMiddleware from "axios-case-converter";
import type { ApiResponse } from "./types/response";
import { isApiError } from "./types/response";
import type { PaginationInfo } from "./types/pagination";
import { ApiError } from "./errors/errorMapper";
import { isTokenRejection } from "./errors/tokenRejection";
import { USE_MOCK } from "./useMock";
import useAuthStore from "../stores/global/authStore";

// -------------------------------------------------------
// Module augmentation
// AxiosResponse에 백엔드 envelope의 메타 필드 확장
// (interceptor가 unwrap하면서 result만 data에 넣고 나머지는 여기로)
// -------------------------------------------------------
declare module "axios" {
  export interface AxiosResponse {
    pagination?: PaginationInfo;
    traceId?: string;
  }
  export interface InternalAxiosRequestConfig {
    /** refresh 재시도된 요청 여부 — 무한 루프 방지용 */
    _retry?: boolean;
  }
}

// -------------------------------------------------------
// 상수
// -------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 인증 불필요 endpoint (전체 경로 완전 일치 매칭)
 *
 * 예: "/api/v1/auth/login" → pathname === "/api/v1/auth/login" 인 경우만 매칭
 * "/api/v1/auth/login/history" 같은 하위 경로는 매칭 안 됨 (인증 필요로 취급)
 */
const PUBLIC_ENDPOINTS_EXACT = [
  "/api/v1/auth/login",
  "/api/v1/auth/social/login",
  "/api/v1/auth/reissue",
  "/api/v1/user/signup",
  "/api/v1/user/exists/email",
  // 비로그인도 보는 조회 API. 관리자 등록/수정은 /performance/admin 하위라 겹치지 않는다.
  "/api/v1/performance",
  "/api/v1/banner",
] as const;

/**
 * 인증 불필요 endpoint (하위 경로 모두 포함, prefix 매칭)
 *
 * 예: "/api/v1/auth/oauth" → "/api/v1/auth/oauth/kakao/url" 매칭됨
 * 정확히 endpoint 아래로 시작하는 경우만 매칭 (path + "/" 로 시작)
 */
const PUBLIC_ENDPOINTS_PREFIX = [
  "/api/v1/auth/oauth", // /kakao/url, /naver/url 등
  "/api/v1/auth/signup", // /email-verification/send 등
] as const;

/**
 * 인증 불필요 endpoint (패턴 매칭)
 *
 * 공개된 건 {id} 자리가 숫자인 경로뿐이다. 같은 prefix 아래
 * /performance/admin/..., /seat/admin/... 이 관리자 전용이라 prefix 매칭은 못 쓴다.
 *
 * seat-counts는 비로그인도 보는 공연 상세의 잔여석 게이지가 쓴다.
 * seat-layouts(좌석맵)는 로그인 필수 흐름(ProtectedRoute)이라 제외한다.
 */
const PUBLIC_ENDPOINTS_PATTERN = [
  /^\/api\/v1\/performance\/\d+$/,
  /^\/api\/v1\/seat\/\d+\/seat-counts$/,
] as const;

/**
 * URL이 인증 불필요 endpoint인지 판별.
 *
 * 안전한 매칭 규칙:
 *   1. query params(?)/hash(#)를 제거하고 pathname만으로 비교
 *      → "/api/v1/user/settings?redirect=/api/v1/auth/login" 같은 우회 방지
 *   2. exact match 또는 path + "/"로 시작하는 경우만 public
 *      → "/api/v1/auth/login-history" 같은 substring 오탐지 방지
 */
function isPublicEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  const pathname = url.split("?")[0].split("#")[0];

  return (
    PUBLIC_ENDPOINTS_EXACT.some((path) => pathname === path) ||
    PUBLIC_ENDPOINTS_PREFIX.some((path) => pathname.startsWith(path + "/")) ||
    PUBLIC_ENDPOINTS_PATTERN.some((pattern) => pattern.test(pathname))
  );
}

// -------------------------------------------------------
// Axios 인스턴스 생성 + case-converter 적용
//
// Content-Type을 전역 설정하지 않음:
//   axios가 request body 타입에 따라 자동으로 Content-Type 설정
//   - JSON body → application/json
//   - FormData → multipart/form-data; boundary=...
//   - Blob/ArrayBuffer → application/octet-stream 등
// -------------------------------------------------------
const rawClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
});

// applyCaseMiddleware 옵션:
//   ignoreHeaders: true — request 헤더 case 변환 방지
//   (Authorization, X-Internal-Token 등 커스텀 헤더 이름 유지)
//   ignoreParams: true — 2026-07-21, 백엔드 소스 직접 확인 후 추가.
//     axios-case-converter는 기본적으로 GET 쿼리 파라미터(config.params)도
//     camelCase → snake_case로 변환한다. 하지만 백엔드 컨트롤러의
//     @RequestParam / @ModelAttribute 바인딩은 Jackson 네이밍 전략(snake_case
//     직렬화, 응답 body에만 적용)과 무관하게 Java 필드명을 그대로(camelCase) 사용해
//     매칭한다. 예:
//       - PerformanceController: minPrice, maxPrice, CursorPageRequest.cursorId
//       - SeatController#getSeatNumbers: @RequestParam List<Long> seatIds
//     변환이 켜져 있으면 seatIds → seat_ids로 나가 버려 필수 파라미터가 아예
//     안 잡히고(400), minPrice/maxPrice/cursorId도 조용히 무시된다.
//     → 쿼리 파라미터는 변환하지 않고, 응답 바디(camel)와 요청 바디(snake)만 변환한다.
const apiClient = applyCaseMiddleware(rawClient, {
  ignoreHeaders: true,
  ignoreParams: true,
});

// -------------------------------------------------------
// Refresh 토큰 자동 재발급 로직
// -------------------------------------------------------
let refreshingPromise: Promise<string | null> | null = null;

/**
 * 실제 refresh API 호출.
 * 성공 시 새 access token 반환, 실패 시 null 반환.
 *
 * 실 API는 raw axios를 쓴다 (interceptor 미적용) — 무한 루프 방지.
 * mock 모드는 mockReissue를 탄다. reissueTokenApi는 apiClient를 쓰므로
 * 여기서 호출하면 interceptor에 다시 들어가 순환한다.
 *
 * ⚠️ 2026-07-18 실제 백엔드 스펙 확인(swagger-ui) 결과, 요청/응답 필드 모두
 *   camelCase임이 확인됨 (TokenReissueRequest.refreshToken,
 *   TokenReissueResponse.accessToken/refreshToken). 이전에는 snake_case로
 *   잘못 가정되어 있어 refresh가 항상 실패(→ 강제 로그아웃)하는 버그였음.
 */
async function performTokenRefresh(): Promise<string | null> {
  const currentRefreshToken = useAuthStore.getState().refreshToken;
  if (!currentRefreshToken) return null;

  try {
    const result = USE_MOCK
      ? await (await import("./mocks/auth")).mockReissue()
      : await requestTokenReissue(currentRefreshToken);

    if (!result?.accessToken) return null;

    useAuthStore
      .getState()
      .setTokens(result.accessToken, result.refreshToken ?? currentRefreshToken);

    return result.accessToken;
  } catch (error) {
    // refresh 실패 원인 파악용 로깅
    // (프로덕션에서는 Sentry 등 모니터링 도구 연동 검토)
    console.error("[Refresh Token] 재발급 실패:", error);
    return null;
  }
}

async function requestTokenReissue(refreshToken: string) {
  const res = await axios.post(
    `${API_BASE_URL}/api/v1/auth/reissue`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } },
  );

  // 백엔드 응답: { isSuccess, code, result: { accessToken, refreshToken, ... } }
  return res.data?.result;
}

/**
 * 진행 중인 refresh 요청이 있으면 그것을 반환, 없으면 새로 시작.
 * (동시성 제어의 핵심)
 */
function getOrCreateRefreshPromise(): Promise<string | null> {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = performTokenRefresh().finally(() => {
    refreshingPromise = null;
  });

  return refreshingPromise;
}

/**
 * 강제 로그아웃 + 로그인 페이지로 리다이렉트.
 *
 * window.location.replace 사용:
 *   - href 대신 replace로 히스토리에 남기지 않음
 *   - 뒤로가기 시 401 만료 페이지 재진입 방지
 *   - UX 개선
 *
 * 토큰 삭제는 리다이렉트 여부와 무관하게 항상 수행한다. 죽은 토큰이 남아 있으면
 * 다음 요청에도 다시 붙어 같은 실패가 반복된다 (#326).
 * 이미 /login이면 replace를 생략한다. 동시에 여러 요청이 거부될 때
 * 같은 주소로 replace가 반복되면 로그인 페이지가 계속 리로드된다.
 */
function forceLogout(): void {
  useAuthStore.getState().logout();

  if (window.location.pathname === "/login") return;
  window.location.replace("/login");
}

/**
 * 요청에 Authorization 헤더가 실제로 붙어 있었는지.
 *
 * AxiosHeaders.get은 대소문자를 구분하지 않는다. 헤더를 직접 넘긴 호출부가
 * "authorization"으로 썼더라도 놓치지 않기 위해 get을 우선 사용한다.
 */
function hadAuthorizationHeader(
  config: InternalAxiosRequestConfig | undefined,
): boolean {
  const headers = config?.headers;
  if (!headers) return false;

  if (typeof headers.get === "function") {
    return Boolean(headers.get("Authorization"));
  }
  return Boolean(headers.Authorization);
}

// -------------------------------------------------------
// Request Interceptor
// - 인증 불필요 endpoint는 Authorization 헤더 안 붙임
// - 인증 필요 endpoint만 accessToken 주입
// -------------------------------------------------------
apiClient.interceptors.request.use((config) => {
  if (isPublicEndpoint(config.url)) {
    return config;
  }

  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -------------------------------------------------------
// Response Interceptor
// 주의: case-converter가 먼저 동작하므로 response.data는 이미 camelCase
// -------------------------------------------------------
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const data = response.data;

    if (isApiError(data)) {
      throw new ApiError(data, response.status);
    }

    // 구조 분해로 가독성 개선
    const { result, paginationInfo, traceId } = data;
    return {
      ...response,
      data: result,
      pagination: paginationInfo,
      traceId,
    };
  },

  async (error: AxiosError<ApiResponse>) => {
    if (!axios.isAxiosError(error) || !error.response) {
      throw new ApiError(
        {
          isSuccess: false,
          code: "NETWORK_ERROR",
          message: "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.",
          result: null,
        },
        0,
      );
    }

    const originalRequest = error.config;
    const { status, data } = error.response;

    // ── 토큰 거부 (401, 그리고 토큰 문제로 판별된 403) ──
    if (
      originalRequest &&
      isTokenRejection({
        status,
        hadAuthorizationHeader: hadAuthorizationHeader(originalRequest),
        data,
      })
    ) {
      // 안전장치: 이미 재시도한 요청인데 또 거부됨
      // → refresh 성공 후 재시도가 다시 401/403 반환하는 극단 케이스
      // → 즉시 로그아웃 (사용자 UI에서 인증 만료 상태 명확히)
      if (originalRequest._retry) {
        forceLogout();
        throw new ApiError(
          {
            isSuccess: false,
            code: "AUTH_UNAUTHORIZED",
            message: "인증이 만료되었습니다. 다시 로그인해주세요.",
            traceId: data?.traceId,
            result: null,
          },
          status,
        );
      }

      // 첫 번째 거부: 인증 필요 endpoint에서만 refresh 시도
      // (public endpoint의 401은 인증 실패 = refresh와 무관)
      if (!isPublicEndpoint(originalRequest.url)) {
        originalRequest._retry = true;

        const newAccessToken = await getOrCreateRefreshPromise();

        if (newAccessToken) {
          // 새 토큰으로 원 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }

        // refresh 실패 → 로그아웃
        forceLogout();
        throw new ApiError(
          {
            isSuccess: false,
            code: "AUTH_UNAUTHORIZED",
            message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
            traceId: data?.traceId,
            result: null,
          },
          status,
        );
      }
    }

    // ── 백엔드 에러 응답 포맷이면 ApiError로 변환 ──
    if (data && typeof data.isSuccess === "boolean") {
      throw new ApiError(
        {
          isSuccess: false,
          code: data.code,
          message: data.message,
          traceId: data.traceId,
          result: null,
        },
        status,
      );
    }

    // ── 그 외 예상치 못한 에러 ──
    throw new ApiError(
      {
        isSuccess: false,
        code: "UNKNOWN",
        message: "알 수 없는 오류가 발생했습니다.",
        result: null,
      },
      status,
    );
  },
);

export default apiClient;
