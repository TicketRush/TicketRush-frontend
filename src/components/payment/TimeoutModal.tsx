import { XCircle } from "lucide-react";

interface TimeoutModalProps {
  onClose: () => void;
}

export default function TimeoutModal({ onClose }: TimeoutModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
          onClick={onClose}
          className="w-full py-3 rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-800"
        >
          좌석으로 돌아가기
        </button>
      </div>
    </div>
  );
}
