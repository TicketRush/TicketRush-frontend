// 결제 API — 백엔드 payment-service swagger (2026-06-30) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   paymentConfirmApi        → POST /api/v1/payment/confirm
//   paymentCancelApi         → POST /api/v1/payment/{paymentId}/cancel
//   getPaymentHistoryApi     → GET  /api/v1/payment
//   getPaymentDetailApi      → GET  /api/v1/payment/{paymentId} (신규)
//
// 주요 변경:
//   - paymentInitApi 완전 삭제 (백엔드에 별도 init API 없음. SDK가 직접 처리)
//   - paymentConfirmApi 요청 구조 변경 (bookingId, seatId, provider 필요)
//   - paymentCancelApi 시그니처 변경 (paymentKey → paymentId, PaymentCancelRequest 추가)
//   - 2026-07 (이슈 #126): Toss SDK 실 연동에 맞춰 mock → 실 API 활성화

import type {
  PaymentConfirmRequest,
  PaymentConfirmResponse,
  PaymentCancelRequest,
  PaymentCancelResponse,
  PaymentSummary,
  PaymentDetail,
} from "@/types/domain/payment";
import {
  mockPaymentConfirm,
  mockPaymentCancel,
  mockGetPaymentHistory,
  mockGetPaymentDetail,
} from "./mocks/payments";
import apiClient from "./instance";
import { USE_MOCK } from "./useMock";

/**
 * 결제 확정 (백엔드 확정).
 *
 * SDK(Toss 등)로부터 받은 paymentKey와 예매/좌석 정보를 전송.
 * 백엔드가 검증 후 결제 확정 + 좌석 SOLD 처리.
 */
export async function paymentConfirmApi(
  req: PaymentConfirmRequest,
): Promise<PaymentConfirmResponse> {
  if (USE_MOCK) return mockPaymentConfirm(req);
  const res = await apiClient.post<PaymentConfirmResponse>(
    "/api/v1/payment/confirm",
    req,
  );
  return res.data;
}

/** 결제 취소(환불) (백엔드 확정) */
export async function paymentCancelApi(
  paymentId: number,
  req: PaymentCancelRequest,
): Promise<PaymentCancelResponse> {
  if (USE_MOCK) return mockPaymentCancel(paymentId, req);
  const res = await apiClient.post<PaymentCancelResponse>(
    `/api/v1/payment/${paymentId}/cancel`,
    req,
  );
  return res.data;
}

/** 결제 내역 조회 — 마이페이지용 */
export async function getPaymentHistoryApi(): Promise<PaymentSummary[]> {
  if (USE_MOCK) return mockGetPaymentHistory();
  const res = await apiClient.get<PaymentSummary[]>("/api/v1/payment");
  return res.data;
}

/** 결제 단건 상세 조회 (신규) */
export async function getPaymentDetailApi(
  paymentId: number,
): Promise<PaymentDetail> {
  if (USE_MOCK) return mockGetPaymentDetail(paymentId);
  const res = await apiClient.get<PaymentDetail>(
    `/api/v1/payment/${paymentId}`,
  );
  return res.data;
}
