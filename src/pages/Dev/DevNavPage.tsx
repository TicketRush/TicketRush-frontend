import { Navigate, useNavigate } from "react-router-dom";
import { useConcertStore } from "@/stores/reservation/concertStore";
import useSeatStore from "@/stores/reservation/seatStore";
import { useTimerStore } from "@/stores/reservation/timerStore";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import type { Genre, ConcertStatus } from "@/types/domain/concert";
import type { Seat } from "@/types/domain/seat";

// concertStore.Concert 인터페이스에 맞춤
const MOCK_CONCERT: {
  id: number;
  title: string;
  price: number;
  showDate: string;
  showTime: string;
  venue: string;
  performer: string;
  genre: Genre;
  imageMainUrl: string;
  address: string;
  durationMinutes: number;
  totalSeats: number;
  remainingSeats: number;
  status: ConcertStatus;
} = {
  id: 1,
  title: "Summer Jazz Night",
  price: 80000,
  showDate: "2026-06-15",
  showTime: "19:00",
  venue: "Grand Concert Hall",
  performer: "Various Artists",
  genre: "JAZZ",
  imageMainUrl: "",
  address: "서울특별시 강남구 테헤란로 123",
  durationMinutes: 120,
  totalSeats: 500,
  remainingSeats: 245,
  status: "ON_SALE",
};

// Seat 타입은 도메인에 정의된 것 사용 — 실제 shape이 다르면 캐스팅으로 통과
const MOCK_SEAT: Seat = {
  id: 5,
  seatLayoutId: 5,
  seatNumber: "A-5",
  row: "A",
  col: 5,
};

export default function DevNavPage() {
  // 훅은 항상 호출되어야 하므로 가드보다 위에 둠
  const navigate = useNavigate();

  // 프로덕션 빌드 차단
  if (!import.meta.env.DEV) {
    return <Navigate to="/" replace />;
  }

  function setupBase() {
    useConcertStore.getState().setConcert(MOCK_CONCERT);
    useSeatStore.getState().selectSeat(MOCK_SEAT);
  }

  function resetAll() {
    useTimerStore.getState().reset();
    usePaymentStore.getState().reset();
    useConcertStore.getState().clearConcert();
    useSeatStore.getState().reset();
  }

  const scenarios = [
    {
      label: "1. 예매 확인 페이지 (타이머 5분 시작)",
      path: "/concerts/1/payment/confirm",
      run: () => {
        setupBase();
        useTimerStore.getState().startTimer();
      },
    },
    {
      label: "2. 결제 페이지 (타이머 진행중)",
      path: "/concerts/1/payment",
      run: () => {
        setupBase();
        useTimerStore.getState().startTimer();
        usePaymentStore
          .getState()
          .startBooking(
            "X7B29-KLPW1",
            1,
            MOCK_SEAT.id,
            MOCK_CONCERT.price,
          );
      },
    },
    {
      label: "3. 결제 페이지 (타이머 10초 — 만료 확인용)",
      path: "/concerts/1/payment",
      run: () => {
        setupBase();
        useTimerStore.getState().startTimer(10_000);
        usePaymentStore
          .getState()
          .startBooking(
            "X7B29-KLPW1",
            1,
            MOCK_SEAT.id,
            MOCK_CONCERT.price,
          );
      },
    },
    {
      label: "4. 결제 완료 페이지",
      path: "/reservations/X7B29-KLPW1",
      run: () => {
        resetAll();
        usePaymentStore.getState().succeed();
      },
    },
    {
      label: "5. 시간 초과 페이지",
      path: "/concerts/1/payment/expired",
      run: () => {
        setupBase();
        useTimerStore.getState().reset();
        usePaymentStore.getState().expire();
      },
    },
    {
      label: "6. 결제 실패 페이지",
      path: "/concerts/1/payment/failed",
      run: () => {
        setupBase();
        useTimerStore.getState().reset();
        usePaymentStore.getState().fail("결제가 거절되었습니다.");
      },
    },
  ];

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-100 text-yellow-800 rounded">
            DEV ONLY
          </span>
          <h1 className="text-2xl font-bold">🛠 결제 플로우 테스트</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          mock 데이터로 각 페이지에 바로 진입. <code>npm run dev</code>에서만
          동작.
        </p>

        <div className="space-y-2">
          {scenarios.map((s) => (
            <button
              key={s.path}
              type="button"
              onClick={() => {
                s.run();
                navigate(s.path);
              }}
              className="w-full text-left px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
            >
              <div className="font-semibold">{s.label}</div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">
                {s.path}
              </div>
            </button>
          ))}
        </div>

        <hr className="my-6" />

        <button
          type="button"
          onClick={resetAll}
          className="w-full px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold"
        >
          🧹 모든 store 초기화
        </button>
      </div>
    </div>
  );
}
