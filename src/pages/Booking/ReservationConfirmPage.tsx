// 예매 확인 페이지
//
// 백엔드 스펙 반영 변경:
//   - selectedSeat.seatNumber → seatNumber
//   - totalAmount 계산: selectedSeat 제거, currentConcert만 사용
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, ArrowLeft, AlertCircle } from "lucide-react";
import { CircularTimer } from "@/components/common/CircularTimer/CircularTimer";
import {
  useTimerDisplay,
  useTimerExpiry,
} from "@/stores/reservation/timerStore";
import useSeatStore from "@/stores/reservation/seatStore";
import { useConcertStore } from "@/stores/reservation/concertStore";

export default function ReservationConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const selectedSeat = useSeatStore((s) => s.selectedSeat);
  const currentConcert = useConcertStore((s) => s.currentConcert);
  const { remainingMs } = useTimerDisplay();

  // 만료 시 expired 페이지로
  useTimerExpiry(() => {
    navigate(`/concerts/${id}/payment/expired`, { replace: true });
  });

  // 좌석 없으면 좌석 페이지로
  useEffect(() => {
    if (!selectedSeat) {
      navigate(`/concerts/${id}/seats`, { replace: true });
    }
  }, [selectedSeat, id, navigate]);

  if (!selectedSeat) return null;

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  // 좌석 단위 가격 없음 → 공연 단가 사용 (백엔드 스펙)
  const totalAmount = currentConcert?.price ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-lg text-sm hover:bg-gray-50 mb-6"
      >
        <ArrowLeft size={14} />
        뒤로가기
      </button>

      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
          <Clock size={12} /> 한정 좌석 예매중
        </span>
        <h1 className="text-3xl font-bold mb-1">예매 확인</h1>
        <p className="text-sm text-text-secondary">
          좌석을 확인하시고 결제를 진행해주세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-8">
        <div className="flex justify-center">
          <CircularTimer remainingSeconds={remainingSeconds} />
        </div>

        <div className="bg-white border border-border rounded-xl p-6">
          <h3 className="font-bold mb-4">📋 예매된 좌석</h3>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1.5 rounded bg-primary text-white text-sm font-bold">
              {selectedSeat.seatNumber}
            </span>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <Row label="좌석 수" value="1석" />
            <Row
              label="총 결제 금액"
              value={`₩${totalAmount.toLocaleString()}`}
              emphasized
            />
          </div>

          <button
            type="button"
            onClick={() => navigate(`/concerts/${id}/payment`)}
            className="w-full mt-6 py-3 rounded-lg bg-primary text-white font-bold hover:opacity-90"
          >
            결제하기
          </button>
          <button
            type="button"
            onClick={() => navigate(`/concerts/${id}/seats`)}
            className="w-full mt-2 py-3 rounded-lg bg-white border border-border text-text-secondary hover:bg-gray-50"
          >
            좌석 다시 선택
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
        <AlertCircle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-yellow-900 mb-1">
            예매 시간 안내
          </p>
          <p className="text-xs text-yellow-800 leading-relaxed">
            좌석 선택 후 결제 확인 버튼을 누르는 시점부터 5분의 제한 시간이
            시작됩니다. 결제 페이지에서도 동일한 타이머가 유지되며, 시간 내에
            결제를 완료해야 합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-text-secondary">{label}</span>
      <span
        className={
          emphasized
            ? "font-bold text-lg text-primary"
            : "text-sm font-semibold"
        }
      >
        {value}
      </span>
    </div>
  );
}
