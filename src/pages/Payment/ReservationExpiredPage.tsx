// 직접 URL 진입 시 fallback 페이지
// PaymentPage 내부 모달이 정상 케이스
import { useNavigate, useParams } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function ReservationExpiredPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <XCircle size={36} className="text-red-600" />
        </div>
        <h2 className="text-lg font-bold mb-2">
          예약 제한 시간이 초과되었습니다.
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">
          선택하신 좌석의 예매 임시 점유가 해제되었습니다.
          <br />
          다시 예매하려면 좌석을 다시 선택해주세요.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/concerts/${id}/seats`)}
          className="w-full py-3 rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-800"
        >
          좌석으로 돌아가기
        </button>
      </div>
    </div>
  );
}
