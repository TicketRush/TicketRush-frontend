// 직접 URL 진입 시 fallback 페이지
// PaymentPage 내부 모달이 정상 케이스
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function PaymentFailedPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
          <AlertTriangle size={36} className="text-yellow-600" />
        </div>
        <h2 className="text-lg font-bold mb-2">결제 실패</h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">
          결제가 완료되지 않았습니다.
          <br />
          청구는 발생하지 않았습니다.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/concerts/${id}/seats`)}
          className="w-full py-3 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600"
        >
          좌석으로 돌아가기
        </button>
      </div>
    </div>
  );
}
