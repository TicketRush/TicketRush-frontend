// 결제 API — 모두 가상 스펙 (백엔드 payment-service 진행 중)

import type {
  PaymentInitRequest,
  PaymentInitResponse,
  PaymentConfirmRequest,
  PaymentConfirmResponse,
} from "@/types/domain/payment";
import {
  mockPaymentInit,
  mockPaymentConfirm,
  mockPaymentCancel,
} from "./mocks/payments";
// import apiClient from "./instance";

const USE_MOCK = true;

export async function paymentInitApi(
  req: PaymentInitRequest,
): Promise<PaymentInitResponse> {
  if (USE_MOCK) return mockPaymentInit(req);
  // const res = await apiClient.post<PaymentInitResponse>(
  //   "/api/v1/payment/init",
  //   req,
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

export async function paymentConfirmApi(
  req: PaymentConfirmRequest,
): Promise<PaymentConfirmResponse> {
  if (USE_MOCK) return mockPaymentConfirm(req);
  // const res = await apiClient.post<PaymentConfirmResponse>(
  //   "/api/v1/payment/confirm",
  //   req,
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

export async function paymentCancelApi(paymentKey: string): Promise<void> {
  if (USE_MOCK) return mockPaymentCancel(paymentKey);
  // await apiClient.post(`/api/v1/payment/${paymentKey}/cancel`);
  throw new Error("Real API not implemented");
}
