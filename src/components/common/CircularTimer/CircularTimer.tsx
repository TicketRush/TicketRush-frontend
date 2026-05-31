// src/components/common/CircularTimer/CircularTimer.tsx
import { useMemo } from "react";

interface CircularTimerProps {
  /** 남은 시간 (초) */
  remainingSeconds: number;
  /** 전체 시간 (초) — 기본 300초(5분) */
  totalSeconds?: number;
  /** SVG 크기 (px) — 기본 280 */
  size?: number;
  /** 호 두께 (px) — 기본 18 */
  strokeWidth?: number;
}

/**
 * 좌석 임시 예약 카운트다운 타이머 (4개 호 디자인)
 *
 * ─ 운영 정책 ────────────────────────────────────────
 * [카운트다운 및 프로그레스 바 로직]
 *  - 프로그레스 바 동기화: 남은 시간에 비례하여 원형 프로그레스가 줄어듦
 *  - 1분 미만: 빨간색(#C10007) 변경
 *
 * [디자인 가이드]
 *  - 원형 프로그레스: 보라색(#6C5CE7), SVG 기반
 *  - 카운트다운 텍스트: 큰 폰트, 1분 미만 시 빨간색
 *  - "남은 시간" 텍스트 하단 배치
 * ────────────────────────────────────────────────────
 *
 * ─ 디자인 ──────────────────────────────────────────
 * 원이 4개의 호로 분할된 형태 (12·3·6·9시 방향에 호 중심).
 * 진행률에 따라 보라색 호가 시계 방향으로 줄어들면서
 * 뒤의 회색 호가 드러나는 구조.
 * ────────────────────────────────────────────────────
 *
 * @example
 * <CircularTimer remainingSeconds={298} />
 *
 * timerStore의 remainingMs와 함께 사용:
 * const remainingMs = useTimerStore(s => s.remainingMs);
 * <CircularTimer remainingSeconds={Math.ceil(remainingMs / 1000)} />
 */
export function CircularTimer({
  remainingSeconds,
  totalSeconds = 300,
  size = 280,
  strokeWidth = 18,
}: CircularTimerProps) {
  // 0 이하 또는 totalSeconds 초과 방어
  const clampedRemaining = Math.max(
    0,
    Math.min(remainingSeconds, totalSeconds),
  );

  // SVG 기하 계산 (useMemo로 size/strokeWidth 변경 시에만 재계산)
  const geometry = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // 4개 호로 분할: 호:갭 = 7:3
    const SEGMENTS = 4;
    const ARC_RATIO = 0.7;
    const segmentLength = circumference / SEGMENTS;
    const arcLength = segmentLength * ARC_RATIO;
    const gapLength = segmentLength - arcLength;

    return { radius, circumference, arcLength, gapLength };
  }, [size, strokeWidth]);

  // 진행률 — 남은 시간에 비례 (운영 정책: "타이머의 남은 시간과 비례")
  const progress = clampedRemaining / totalSeconds;
  const dashOffset = geometry.circumference * (1 - progress);

  // 운영 정책: 1분 미만 빨간색 변경
  const isWarning = clampedRemaining < 60;
  const progressColor = isWarning ? "#C10007" : "#6C5CE7";

  // 시간 포맷팅 (M:SS)
  const minutes = Math.floor(clampedRemaining / 60);
  const seconds = clampedRemaining % 60;
  const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const center = size / 2;
  const dashArray = `${geometry.arcLength} ${geometry.gapLength}`;

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`남은 시간 ${minutes}분 ${seconds}초`}
      >
        {/* 배경 — 회색 4개 호 (항상 표시) */}
        <circle
          cx={center}
          cy={center}
          r={geometry.radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
        {/* 진행 — 보라색 호 (시간 지나면서 줄어듦) */}
        <circle
          cx={center}
          cy={center}
          r={geometry.radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
        />
      </svg>

      {/* 중앙 텍스트 — SVG 위에 absolute 배치 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className={`text-5xl font-bold tabular-nums leading-none ${
            isWarning ? "text-[#C10007]" : "text-primary"
          }`}
        >
          {timeText}
        </span>
        <span className="mt-3 text-sm text-gray-500">남은 시간</span>
      </div>
    </div>
  );
}
