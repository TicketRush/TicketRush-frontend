# 관리자(Admin) API 요청 문서

> 관련 이슈: `#115` [백엔드 연동] Sprint 9 실 API 연동 (Epic) — "관리자" 하위 항목
> "[관리자] mock 유지 명시 + 백엔드 API 요청 문서화"

## 현재 상태

> **업데이트 (2026-07-18)**: swagger-ui 실측 결과 아래 2개 항목은 이미 실 API가
> 존재함을 확인하여 실 연동으로 전환했습니다. 나머지(대시보드 통계/예매 내역
> 목록/좌석 모니터링)는 여전히 백엔드 API가 없어 mock으로 동작합니다.
>   - **공연 CRUD** → performance-service `POST/PATCH/DELETE /api/v1/performance/admin/{id}`,
>     `PATCH /api/v1/performance/admin/{id}/status` (아래 "4. 공연 CRUD" 섹션 갱신됨)
>   - **환불 모니터링** → booking-service `GET /api/v1/booking/admin/bookings/refund-failed`,
>     `GET /api/v1/booking/admin/bookings/refunding-stuck`,
>     `POST /api/v1/booking/admin/{bookingNumber}/refund-retry`
>     (`src/api/bookings.ts`, `src/pages/Admin/AdminRefundsPage.tsx`)
>
> ⚠️ 단, 대시보드의 "전체 공연 목록"(판매좌석/매출 집계 포함)은 여전히
> mock 소스(`MOCK_CONCERTS`)를 사용합니다. 공연 CRUD 자체는 실 API로 전환됐지만,
> 목록에서 얻는 `id`가 mock ID라 실제 백엔드 공연과 일치하지 않을 수 있습니다.
> 대시보드 목록까지 완전히 실 데이터로 전환하려면 매출 집계 API(또는
> performanceId로 결제 내역을 조회할 수 있는 API)가 필요합니다.

관리자(백오피스) 도메인 중 대시보드 통계/예매 내역 목록/좌석 모니터링은
**백엔드 API가 아직 구현되지 않아 mock으로 동작**합니다
(`src/api/admin.ts`, `src/api/mocks/admin.ts`, `VITE_USE_MOCK` 여부와 무관하게
해당 함수들이 `USE_MOCK`이 아닐 때 `throw new Error("Real API not implemented")`).

사용자(퍼블릭) 도메인(인증/공연/좌석/예매/결제/티켓)은 이미 실 API로 전환 완료되어
있으므로, 이 문서는 **아직 mock인 관리자 도메인 항목만** 다룹니다.

프론트는 이미 아래 요청/응답 shape을 기준으로 UI·훅·타입을 구현해뒀습니다
(`src/types/domain/admin.ts`). 백엔드팀은 아래 스펙을 참고해 API를 구현하거나,
다른 shape으로 확정될 경우 알려주시면 프론트에서 매핑 레이어를 추가하겠습니다.

## 공통 사항

- 모든 엔드포인트는 `ADMIN` 권한(JWT) 필요.
- 응답 포맷은 다른 도메인과 동일하게 `ApiResponse<T>` 래퍼
  (`{ isSuccess, code, message, traceId, paginationInfo?, result }`) 사용을 권장.
- 필드명은 snake_case로 내려줘도 무방 (axios-case-converter가 프론트에서 자동으로
  camelCase 변환).

## 요청 엔드포인트 목록

### 1. 대시보드

`GET /api/v1/admin/dashboard`

전체 통계 + 최근 7일 매출 추이 + 장르별 매출 + 공연별 판매 현황 + 공연 목록을
한 번에 반환 (프론트 대시보드 화면 1회 로드용 aggregation).

```ts
interface Response {
  stats: {
    totalConcerts: number;
    soldTickets: number;
    totalRevenue: number;
    averageOccupancyRate: number; // 0.0 ~ 1.0
  };
  dailyRevenue: Array<{
    date: string; // YYYY-MM-DD
    revenue: number;
    ticketsSold: number;
  }>; // 최근 7일
  genreRevenue: Array<{
    genre: "CONCERT" | "MUSICAL" | "CLASSIC" | "JAZZ" | "FESTIVAL" | "FANMEETING" | "BALLET";
    label: string; // 한글 표시명
    revenue: number;
    percentage: number; // 0 ~ 100
  }>;
  concertSales: Array<{
    concertId: number;
    title: string;
    genre: string;
    date: string;
    soldSeats: number;
    totalSeats: number;
    occupancyRate: number; // 0.0 ~ 1.0
    revenue: number;
    isSoldOut: boolean;
  }>;
  concertList: Array<{
    id: number;
    title: string;
    genre: string;
    date: string;
    soldSeats: number;
    totalSeats: number;
    occupancyRate: number;
    revenue: number;
    status: "UPCOMING" | "ON_SALE" | "CLOSED" | "CANCELED";
  }>;
}
```

> ⚠️ 통계 aggregation을 백엔드 한 번에 내려주기 부담스러우면, 엔드포인트를
> `/dashboard/stats`, `/dashboard/revenue`, `/dashboard/concerts` 등으로 쪼개도 됩니다.
> 프론트 훅(`useAdminDashboard`)만 병렬 호출로 바꾸면 되는 정도라 변경 비용이 작습니다.

---

### 2. 예매 내역 관리

`GET /api/v1/admin/bookings`

| 쿼리 파라미터 | 타입 | 설명 |
|---|---|---|
| `page` | number | 0-based |
| `size` | number | 기본 10 |
| `status` | `PENDING\|CONFIRMED\|CANCELED\|REFUNDING\|REFUNDED\|REFUND_FAILED\|EXPIRED` | 선택, 없으면 전체 |
| `keyword` | string | 공연명/예매자명/예매번호 부분 일치 검색 |

```ts
interface Response {
  items: Array<{
    bookingNumber: string;
    concertTitle: string;
    concertDate: string;
    bookedAt: string; // ISO datetime
    userName: string;
    userEmail: string;
    seatNumbers: string[]; // 1인 1석이라 현재는 항상 길이 1
    seatCount: number;
    unitPrice: number;
    totalAmount: number;
    status: string; // BookingStatus
    paymentMethod: string; // 예: "간편결제", "신용카드"
  }>;
  pagination: {
    pageIndex: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
  };
}
```

`GET /api/v1/admin/bookings/stats`

```ts
interface Response {
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  cancelledBookings: number;
}
```

`POST /api/v1/admin/bookings/{bookingNumber}/refund`

관리자가 강제 환불 처리. 본문 없음(또는 사유 텍스트 optional). 응답 본문 불필요(204 또는 갱신된 booking 반환).
기존 결제 도메인의 `POST /api/v1/payment/{paymentId}/cancel`과 로직이 겹칠 수 있어
백엔드에서 내부적으로 재사용 가능한지 검토 필요.

---

### 3. 좌석 모니터링

`GET /api/v1/admin/seats/{performanceId}/monitoring`

프론트가 10초 간격 polling (`refetchInterval: 10_000`)으로 실시간성을 흉내내는 중.
SSE/WebSocket으로 대체 가능하면 폴링 부담을 줄일 수 있음 (사용자 도메인의
`/api/v1/seat/{performanceId}/seat-status/stream`과 동일 패턴 재사용 검토 요청).

```ts
interface Response {
  stats: {
    totalSeats: number;
    availableSeats: number;
    soldSeats: number;
    holdingSeats: number;
  };
  seats: Array<{
    id: number; // seatId
    seatLayoutId: number;
    seatNumber: string; // "A-1"
    row: string;
    col: number;
    status: "AVAILABLE" | "HOLD" | "SOLD";
  }>;
}
```

`GET /api/v1/admin/seats/{performanceId}/{seatId}`

좌석 클릭 시 상세 조회.

```ts
interface Response {
  seatId: number;
  seatNumber: string;
  status: "AVAILABLE" | "HOLD" | "SOLD";
  reservedBy?: string; // HOLD/SOLD일 때만
  reservedAt?: string; // ISO datetime, HOLD/SOLD일 때만
  holdRemainingSec?: number; // HOLD일 때만 — 5분 타이머 잔여 시간
}
```

`DELETE /api/v1/admin/seats/{performanceId}/{seatId}/hold`

관리자가 HOLD 상태 좌석을 강제로 해제 (고객 문의 대응용). 응답 불필요.

---

### 4. 공연 CRUD — ✅ 실 API 연동 완료 (2026-07-18)

더 이상 요청 대상이 아닙니다. performance-service에 이미 구현되어 있던
아래 admin 엔드포인트로 전환 완료했습니다 (`src/api/admin.ts`):

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/api/v1/performance/admin` | 공연 생성 (multipart/form-data — `request` JSON 파트 + `mainImage`/`gallery` 파일 파트) |
| `PATCH` | `/api/v1/performance/admin/{id}` | 공연 수정 (application/json — 이미지 변경 미지원) |
| `DELETE` | `/api/v1/performance/admin/{id}` | 공연 삭제 |
| `PATCH` | `/api/v1/performance/admin/{id}/status` | 상태 변경 (`{ status }`) |

수정 폼 프리필은 별도 admin 조회 엔드포인트가 없어 퍼블릭 상세
(`GET /api/v1/performance/{id}`)를 재사용합니다.

참고 — 백엔드가 실제로 받는 필드 (프론트 `venue`/`notices`는 대응 필드가 없어 폼에서 제거함):

```ts
interface PerformanceCreateRequest {
  title: string;
  performer: string;
  genre: "CONCERT" | "MUSICAL" | "CLASSIC" | "JAZZ" | "FESTIVAL" | "FANMEETING" | "BALLET";
  description: string;
  showDate: string; // YYYY-MM-DD
  showTime: string; // HH:mm
  durationMinutes: number;
  price: number;
  totalSeats: number;
  address: string;
  bookingOpenAt?: string; // ISO datetime
  facilities?: string[];
}
// PATCH(수정)는 위와 동일한 필드의 부분 집합 (이미지 필드 없음, JSON body)
```

## 다음 단계

1. 남은 항목(대시보드 통계/예매 내역 목록/좌석 모니터링)은 백엔드팀 검토 후
   실제 채택할 엔드포인트/응답 shape 확정.
2. 확정되면 `src/api/admin.ts`의 주석 처리된 `apiClient` 호출을 활성화하고
   `USE_MOCK` 분기를 다른 도메인과 동일한 패턴으로 정리 (참고: `src/api/bookings.ts`,
   `src/api/payments.ts`, 그리고 이번에 전환한 공연 CRUD/환불 모니터링).
3. 응답 shape이 위와 다르면 `src/types/domain/admin.ts` 타입만 갱신하면 되고,
   화면 컴포넌트는 대부분 변경 불필요 (훅 레이어에서 매핑 가능).
4. (선택) 대시보드 "전체 공연 목록" 집계까지 완전히 실 데이터로 전환하려면
   performanceId 기준 매출/판매좌석 집계 API가 필요함 — 백엔드팀에 문의 필요.
