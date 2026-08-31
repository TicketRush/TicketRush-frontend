import { toast } from "react-toastify";
import { useCallback } from "react";

import { useConcertStore } from "@/stores/reservation/concertStore";
import useSeatStore from "@/stores/reservation/seatStore";
import useTimerStore from "@/stores/reservation/timerStore";
import usePaymentStore from "@/stores/reservation/paymentStore";

/** 서버 통신(좌석 hold 해제 등)이 필요할 때 주입하는 콜백. async 허용. */
type ReleaseSeatCallback = () => void | Promise<void>;

/** 라우터 이동이 필요할 때 주입하는 콜백. */
type NavigateCallback = () => void;

interface TimeoutOptions {
  /** 좌석 hold 해제 등 서버 정리. 실패해도 store 초기화는 진행됨. */
  onReleaseSeat?: ReleaseSeatCallback;
  /** 만료 안내 후 이동(예: /expired). */
  onNavigate?: NavigateCallback;
  /** 토스트 메시지 커스터마이즈. */
  message?: string;
}

interface PaymentFailOptions {
  /** 좌석을 계속 잡아둘지 여부. 기본 false(= 정리하지 않음, 재시도 가능). */
  releaseSeat?: ReleaseSeatCallback;
  /** 실패 후 이동(예: /payment/failed). */
  onNavigate?: NavigateCallback;
}

interface CancelOptions {
  onReleaseSeat?: ReleaseSeatCallback;
  onNavigate?: NavigateCallback;
  message?: string;
}

const DEFAULT_TIMEOUT_MSG = "예매 시간이 만료되었습니다. 다시 시도해 주세요.";
const DEFAULT_CANCEL_MSG = "예매를 취소했습니다.";

export function useReservationLifecycle() {
  // ── 4개 store의 정리 액션만 구독 (값 구독 X → 불필요한 리렌더 방지)
  const clearConcert = useConcertStore((s) => s.clearConcert);
  const resetSeat = useSeatStore((s) => s.reset);
  const resetTimer = useTimerStore((s) => s.reset);
  const failPayment = usePaymentStore((s) => s.fail);
  const resetPayment = usePaymentStore((s) => s.reset);

  /** 예매 플로우 4개 store를 모두 초기 상태로. (내부 공용) */
  const resetAll = useCallback(() => {
    clearConcert();
    resetSeat();
    resetTimer();
    resetPayment();
  }, [clearConcert, resetSeat, resetTimer, resetPayment]);

  /** 좌석+타이머만 정리 (결제 상태는 호출부가 별도 제어). (내부 공용) */
  const resetSeatAndTimer = useCallback(() => {
    resetSeat();
    resetTimer();
  }, [resetSeat, resetTimer]);

  // ───────────────────────────────────────────────────────────────────────
  // 1) 타이머 만료
  //    seat + timer + payment 초기화 + 안내 토스트 (+ 선택적 서버 정리/이동)
  // ───────────────────────────────────────────────────────────────────────
  const handleTimeout = useCallback(
    async (options: TimeoutOptions = {}) => {
      const { onReleaseSeat, onNavigate, message } = options;

      // 서버 정리는 실패해도 클라 상태 초기화는 반드시 진행
      if (onReleaseSeat) {
        try {
          await onReleaseSeat();
        } catch {
          // 만료된 hold는 백엔드에서 이미 풀렸을 수 있음 → 조용히 무시
        }
      }

      resetSeat();
      resetTimer();
      resetPayment();

      toast.warning(message ?? DEFAULT_TIMEOUT_MSG);
      onNavigate?.();
    },
    [resetSeat, resetTimer, resetPayment],
  );

  // ───────────────────────────────────────────────────────────────────────
  // 2) 결제 성공
  //    4개 store 모두 초기화 (다음 예매를 위해 클린 상태로)
  //    ※ 좌석 정보는 결제 완료 페이지가 서버(useBookingDetail)에서 다시 받으므로
  //      여기서 비워도 안전.
  // ───────────────────────────────────────────────────────────────────────
  const handlePaymentSuccess = useCallback(
    (options: { onNavigate?: NavigateCallback } = {}) => {
      resetAll();
      options.onNavigate?.();
    },
    [resetAll],
  );

  // ───────────────────────────────────────────────────────────────────────
  // 3) 결제 실패
  //    paymentStore.fail(message) + 에러 토스트.
  //    기본은 좌석을 비우지 않음(재시도 가능). releaseSeat 주입 시에만 정리.
  // ───────────────────────────────────────────────────────────────────────
  const handlePaymentFail = useCallback(
    async (message: string, options: PaymentFailOptions = {}) => {
      const { releaseSeat, onNavigate } = options;

      failPayment(message);
      toast.error(message);

      if (releaseSeat) {
        try {
          await releaseSeat();
        } catch {
          /* 무시 */
        }
        resetSeatAndTimer();
      }

      onNavigate?.();
    },
    [failPayment, resetSeatAndTimer],
  );

  // ───────────────────────────────────────────────────────────────────────
  // 4) 예매 취소 (사용자가 명시적으로 뒤로가기/취소)
  //    seat + timer + payment 초기화 + 이동
  // ───────────────────────────────────────────────────────────────────────
  const handleCancelReservation = useCallback(
    async (options: CancelOptions = {}) => {
      const { onReleaseSeat, onNavigate, message } = options;

      if (onReleaseSeat) {
        try {
          await onReleaseSeat();
        } catch {
          /* 무시 */
        }
      }

      resetSeatAndTimer();
      resetPayment();

      toast.info(message ?? DEFAULT_CANCEL_MSG);
      onNavigate?.();
    },
    [resetSeatAndTimer, resetPayment],
  );

  return {
    handleTimeout,
    handlePaymentSuccess,
    handlePaymentFail,
    handleCancelReservation,
    /** 직접 전체 초기화가 필요한 예외 케이스용 (예: 로그아웃) */
    resetAll,
  };
}

export default useReservationLifecycle;
