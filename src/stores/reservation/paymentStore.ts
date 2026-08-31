// 결제 상태 머신 store
//
// 상태 전이:
//   IDLE
//     ├─ startRequest()      → REQUESTING (SDK 호출 시작)
//     ├─ cancel()            → CANCELLED  (예매 진입 전/직후 취소)
//     └─ expire()            → EXPIRED    (타이머 만료)
//
//   REQUESTING
//     ├─ startConfirming()   → CONFIRMING (SDK 콜백 후 백엔드 confirm 진행)
//     ├─ cancel()            → CANCELLED  (사용자가 SDK 창에서 닫음)
//     ├─ fail(msg)           → FAILED     (SDK 오류)
//     └─ expire()            → EXPIRED    (타이머 만료)
//
//   CONFIRMING
//     ├─ succeed()           → SUCCESS    (confirm 성공)
//     └─ fail(msg)           → FAILED     (confirm 실패)
//
//   SUCCESS / FAILED / EXPIRED / CANCELLED
//     └─ reset()             → IDLE       (새 예매 시작)
//
// ⚠️ Toss 결제창 리다이렉트로 페이지가 완전히 새로 로드되므로, 리다이렉트 복귀 후에도
// bookingNumber/bookingId/seatId/amount/status를 잃지 않도록 sessionStorage에 persist.
// (localStorage가 아닌 sessionStorage: 탭 종료 시 예매 컨텍스트 정리)
//
// ⚠️ 이슈 #126 후속: bookingId/seatId 추가.
//   POST /payment/confirm(PaymentConfirmRequest)이 bookingId/seatId를 요구하는데,
//   Toss 리다이렉트로 페이지가 재부팅되는 PaymentSuccessPage에서는 이 값을
//   React state로 들고 있을 수 없어 store(persist)에서 복원해야 함.
//   또한 retryPayment 추가: 결제 실패 후 "재시도"는 예매(PENDING) 자체는 유효하므로
//   bookingNumber/bookingId/seatId/amount/method는 유지하고 상태만 IDLE로 되돌림.
//   (reset()은 다음 예매를 위한 완전 초기화이므로 재시도에는 부적합)

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PaymentStatus, PaymentMethod } from "@/types/domain/payment";

interface PaymentStoreState {
  status: PaymentStatus;
  method: PaymentMethod | null;
  bookingNumber: string | null;
  bookingId: number | null;
  seatId: number | null;
  paymentKey: string | null;
  amount: number;
  errorMessage: string | null;

  // ── 액션 ───────────────────────────────────────────
  /** 예매(PENDING) 생성 성공 시 (SeatSelectionPage) */
  startBooking: (
    bookingNumber: string,
    bookingId: number,
    seatId: number,
    amount: number,
  ) => void;

  /** 결제 수단 선택 */
  setMethod: (method: PaymentMethod) => void;

  /** SDK 호출 시작 */
  startRequest: (paymentKey: string) => void;

  /** SDK 콜백 후 백엔드 confirm 진행 */
  startConfirming: () => void;

  /** 결제 성공 */
  succeed: () => void;

  /** 결제 실패 (SDK 오류, confirm 실패 등 시스템 오류) */
  fail: (message: string) => void;

  /** 사용자가 명시적으로 결제 취소 (SDK 창 닫기, 뒤로가기 등) */
  cancel: () => void;

  /** 타이머 만료 */
  expire: () => void;

  /** 결제 실패 모달 close 후 재시도 — 예매 정보는 유지, 상태만 IDLE로 */
  retryPayment: () => void;

  /** 전체 초기화 (다음 예매 시작 시) */
  reset: () => void;
}

const initial = {
  status: "IDLE" as PaymentStatus,
  method: null,
  bookingNumber: null,
  bookingId: null,
  seatId: null,
  paymentKey: null,
  amount: 0,
  errorMessage: null,
};

export const usePaymentStore = create<PaymentStoreState>()(
  persist(
    (set) => ({
      ...initial,

      startBooking: (bookingNumber, bookingId, seatId, amount) =>
        set({
          status: "IDLE",
          bookingNumber,
          bookingId,
          seatId,
          amount,
          errorMessage: null,
        }),

      setMethod: (method) => set({ method }),

      startRequest: (paymentKey) =>
        set({ status: "REQUESTING", paymentKey, errorMessage: null }),

      startConfirming: () => set({ status: "CONFIRMING" }),

      succeed: () => set({ status: "SUCCESS" }),

      fail: (message) => set({ status: "FAILED", errorMessage: message }),

      cancel: () => set({ status: "CANCELLED", errorMessage: null }),

      expire: () => set({ status: "EXPIRED" }),

      retryPayment: () =>
        set({ status: "IDLE", paymentKey: null, errorMessage: null }),

      reset: () => set(initial),
    }),
    {
      name: "payment-storage",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export default usePaymentStore;
