// stores/PaymentStore.tsx
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { sessionStorageAdapter } from "../utils/sessionStorageAdapter";

// sessionStorage 사용 — 탭별 독립 예매 플로우 보장 (스토리지 전략 상세: authStore.ts 참고)

type PaymentStatus =
  | "IDLE"
  | "CONFIRMING"
  | "PROCESSING"
  | "VERIFYING"
  | "SUCCESS"
  | "FAIL";

interface PaymentState {
  status: PaymentStatus;
  errorMessage: string | null;
  updatedAt: number | null;
  startPayment: () => void;
  verifyPayment: () => void;
  completePayment: () => void;
  failPayment: (message: string) => void;
  reset: () => void;
}

export const usePaymentStore = create<PaymentState>()(
  devtools(
    persist(
      (set) => ({
        status: "IDLE",
        errorMessage: null,
        updatedAt: null,
        confirmPayment: () =>
          set({
            status: "CONFIRMING",
            errorMessage: null,
            updatedAt: Date.now(),
          }),
        startPayment: () =>
          set({
            status: "PROCESSING",
            errorMessage: null,
            updatedAt: Date.now(),
          }),
        verifyPayment: () =>
          set({ status: "VERIFYING", updatedAt: Date.now() }),
        completePayment: () =>
          set({
            status: "SUCCESS",
            errorMessage: null,
            updatedAt: Date.now(),
          }),
        failPayment: (message) =>
          set({
            status: "FAIL",
            errorMessage: message,
            updatedAt: Date.now(),
          }),
        reset: () =>
          set({ status: "IDLE", errorMessage: null, updatedAt: null }),
      }),
      { name: "payment-storage", storage: sessionStorageAdapter },
    ),
  ),
);
