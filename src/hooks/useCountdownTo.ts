// 특정 시각까지 남은 시간을 1초 주기로 계산.
//
// QR payload 만료(expiresAt) 근접 여부를 표시하기 위해 사용.
// BE는 `yyyy-MM-dd HH:mm:ss` (오프셋 없음)라 Date.parse만 쓰면 브라우저마다
// NaN이 될 수 있다. parseBackendDateTime / remainingMsUntil을 쓴다.
import { useEffect, useState } from "react";
import { remainingMsUntil } from "@/utils/booking/parseBackendDateTime";

export function useCountdownTo(target: string | undefined): number {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!target) {
      setRemainingMs(0);
      return;
    }

    const tick = () => setRemainingMs(remainingMsUntil(target));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return remainingMs;
}
