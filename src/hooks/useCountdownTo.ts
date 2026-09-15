// 특정 Instant까지 남은 시간을 1초 주기로 계산.
//
// QR payload 만료(expiresAt) 근접 여부를 표시하기 위해 사용.
import { useEffect, useState } from "react";
import { remainingMsUntil } from "@/utils/booking/parseBackendDateTime";

export function useCountdownTo(targetIso: string | undefined): number {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!targetIso) {
      setRemainingMs(0);
      return;
    }

    const tick = () => setRemainingMs(remainingMsUntil(targetIso));

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return remainingMs;
}
