// stores/PaymentStore.tsx
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { sessionStorageAdapter } from "../utils/sessionStorageAdapter";

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

const usePaymentStore = create<PaymentState>()(
  devtools(
    persist(
      (set) => ({
        status: "IDLE",
        errorMessage: null,
        updatedAt: null,
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

export default usePaymentStore;
