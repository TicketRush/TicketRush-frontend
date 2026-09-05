// 특정 ISO 시각까지 남은 시간을 1초 주기로 계산.
//
// QR payload 만료(expiresAt) 근접 여부를 표시하기 위해 사용.
// 전역 상태가 필요 없는 순수 표시용 로컬 카운트다운이라 timerStore와는 분리.
import { useEffect, useState } from "react";

// targetIso까지 남은 시간(ms). 값이 없거나 이미 지났으면 0.
export function useCountdownTo(targetIso: string | undefined): number {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!targetIso) {
      setRemainingMs(0);
      return;
    }

    const targetMs = new Date(targetIso).getTime();
    const tick = () => setRemainingMs(Math.max(0, targetMs - Date.now()));

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return remainingMs;
}
