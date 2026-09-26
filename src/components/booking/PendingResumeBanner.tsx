import { Clock } from "lucide-react";
import Button from "@/components/common/Button/Button";

interface PendingResumeBannerProps {
  title: string;
  remainingLabel: string | null;
  cancelPending?: boolean;
  onResume: () => void;
  onCancel: () => void;
}

/**
 * 결제 전 이탈 후 HOLD가 남아 있을 때 헤더 아래 이어가기 진입점 (#369).
 * 내 예매 목록의 「예매 이어가기」 대신 전역 배너를 쓴다.
 */
export function PendingResumeBanner({
  title,
  remainingLabel,
  cancelPending = false,
  onResume,
  onCancel,
}: PendingResumeBannerProps) {
  return (
    <aside
      className="sticky top-16 z-30 border-b border-amber-200 bg-amber-50"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2 text-sm text-amber-950">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0">
            <span className="font-semibold">
              결제 대기 중인 예매가 있습니다.
            </span>
            {title ? (
              <span className="mt-0.5 block truncate text-amber-900">
                {title}
              </span>
            ) : null}
            {remainingLabel ? (
              <span className="mt-0.5 block tabular-nums">
                {remainingLabel} 안에 결제를 마쳐야 좌석이 유지됩니다.
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cancelPending}
            onClick={onCancel}
          >
            {cancelPending ? "취소 중..." : "예매 취소"}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={cancelPending}
            onClick={onResume}
          >
            예매 이어가기
          </Button>
        </div>
      </div>
    </aside>
  );
}
