// Toss Payments SDK v2 (@tosspayments/tosspayments-sdk) 래퍼
//
// ⚠️ 카드/간편결제(easyPay) 결제는 "Redirect 방식"으로만 동작.
//   결제 요청이 성공하면 브라우저가 결제창으로 이동했다가 완료/실패 시
//   각각 successUrl/failUrl로 "전체 페이지 이동" (Promise가 resolve되지 않음).
//   → 이 함수 호출 이후 현 페이지의 JS 컨텍스트는 보존 X
//     (paymentStore/seatStore를 sessionStorage에 persist하는 이유)

import {
  loadTossPayments,
  type TossPaymentsSDK,
} from "@tosspayments/tosspayments-sdk";
import type { PaymentMethod } from "@/types/domain/payment";

// Toss가 공개한 샌드박스 테스트용 클라이언트 키.
// 실 결제는 발생하지 않으며 로컬/개발 환경에서 SDK 연동 검증용으로만 사용함.

const SANDBOX_TEST_CLIENT_KEY = "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

// 발급받은 실 클라이언트 키를 `VITE_TOSS_CLIENT_KEY`에 설정 필요

const CLIENT_KEY: string =
  import.meta.env.VITE_TOSS_CLIENT_KEY || SANDBOX_TEST_CLIENT_KEY;

if (!import.meta.env.VITE_TOSS_CLIENT_KEY) {
  console.warn(
    "[tossSdk] VITE_TOSS_CLIENT_KEY가 설정되지 않아 Toss 샌드박스 테스트 키로 동작합니다. " +
      "운영 배포 전 반드시 실 클라이언트 키로 교체하세요.",
  );
}

/** 프론트 PaymentMethod(KAKAO/NAVER/TOSS) → Toss easyPay 조직 코드 매핑 */
const EASY_PAY_CODE: Record<PaymentMethod, string> = {
  KAKAO: "KAKAOPAY",
  NAVER: "NAVERPAY",
  TOSS: "TOSSPAY",
};

let sdkPromise: Promise<TossPaymentsSDK> | null = null;

/** SDK 스크립트는 최초 1회만 로드하고 이후 호출은 같은 Promise를 재사용 */
function getTossPayments(): Promise<TossPaymentsSDK> {
  if (!sdkPromise) {
    sdkPromise = loadTossPayments(CLIENT_KEY);
  }
  return sdkPromise;
}

export interface RequestTossPaymentParams {
  /** 결제 수단 — 간편결제(카카오페이/네이버페이/토스페이) 중 하나 */
  provider: PaymentMethod;
  /**
   * 구매자를 식별하는 고유 키 (영문/숫자/`-_=.@` 중 1개 이상 포함, 2~50자).
   * 보통 로그인 사용자 ID 기반 (예: `user_42`).
   */
  customerKey: string;
  /** 주문번호 — bookingNumber 사용 (영문/숫자/`-` 6~64자 조건을 만족) */
  orderId: string;
  /** 구매 상품명 (최대 100자) */
  orderName: string;
  /** 결제 금액 (KRW) */
  amount: number;
  customerName?: string;
  customerEmail?: string;
  /** 결제 성공 시 리다이렉트될 URL (쿼리에 paymentKey, orderId, amount가 추가됨) */
  successUrl: string;
  /** 결제 실패 시 리다이렉트될 URL (쿼리에 code, message, orderId가 추가됨) */
  failUrl: string;
}

// Toss 간편결제 결제창 (카드/간편결제 다이렉트 방식).

// 정상 흐름에서는 브라우저가 결제창으로 이동하므로 이 함수는 resolve되지 X
// reject되면 결제창이 열리기 전 단계의 오류(사용자 취소 등)이므로 인페이지에서 처리 필요

export async function requestTossPayment(
  params: RequestTossPaymentParams,
): Promise<void> {
  const tossPayments = await getTossPayments();
  const payment = tossPayments.payment({ customerKey: params.customerKey });

  await payment.requestPayment({
    method: "CARD",
    amount: { currency: "KRW", value: params.amount },
    orderId: params.orderId,
    orderName: params.orderName,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
    card: {
      flowMode: "DIRECT",
      easyPay: EASY_PAY_CODE[params.provider],
    },
  });
}
