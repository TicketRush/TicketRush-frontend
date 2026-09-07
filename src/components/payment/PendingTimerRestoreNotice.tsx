interface PendingTimerRestoreNoticeProps {
  onRetry: () => void;
  onBackToSeats: () => void;
}

export default function PendingTimerRestoreNotice({
  onRetry,
  onBackToSeats,
}: PendingTimerRestoreNoticeProps) {
  return (
    <div className="bg-warning-bg border border-warning-border rounded-xl p-4 mb-4">
      <p className="text-sm font-semibold text-yellow-900 mb-1">
        만료 시각을 불러오지 못했습니다
      </p>
      <p className="text-xs text-yellow-800 mb-3">
        서버 시각을 확인해야 결제를 진행할 수 있습니다. 로컬 시간으로 임의
        연장하지 않습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90"
        >
          다시 시도
        </button>
        <button
          type="button"
          onClick={onBackToSeats}
          className="px-3 py-1.5 rounded-lg bg-white border border-border text-xs text-text-secondary hover:bg-gray-50"
        >
          좌석으로 돌아가기
        </button>
      </div>
    </div>
  );
}
