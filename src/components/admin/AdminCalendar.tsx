
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminCalendarProps {
  /** 단일 날짜 또는 [시작, 종료] 범위 */
  selectedRange: { start: Date; end: Date };
  onRangeChange: (range: { start: Date; end: Date }) => void;
}

const YEAR_RANGE_SIZE = 24;
const YEAR_RANGE_START = 2022; // 사진과 동일

export default function AdminCalendar({
  selectedRange,
  onRangeChange,
}: AdminCalendarProps) {
  const [viewYear, setViewYear] = useState(selectedRange.start.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedRange.start.getMonth());
  const [pickerMode, setPickerMode] = useState<null | "month" | "year">(null);
  const [yearPageStart, setYearPageStart] = useState(YEAR_RANGE_START);

  // 범위 선택 중간 상태 (시작일만 클릭한 상태)
  const [pendingStart, setPendingStart] = useState<Date | null>(null);

  const today = new Date();
  function isSameDay(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }
  function isInRange(date: Date) {
    const t = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime();
    const start = new Date(
      selectedRange.start.getFullYear(),
      selectedRange.start.getMonth(),
      selectedRange.start.getDate(),
    ).getTime();
    const end = new Date(
      selectedRange.end.getFullYear(),
      selectedRange.end.getMonth(),
      selectedRange.end.getDate(),
    ).getTime();
    return t >= start && t <= end;
  }
  function isRangeEdge(date: Date) {
    return (
      isSameDay(date, selectedRange.start) || isSameDay(date, selectedRange.end)
    );
  }

  // 달력 그리드 계산
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  function handleDateClick(day: number) {
    const clicked = new Date(viewYear, viewMonth, day);
    if (!pendingStart) {
      // 첫 클릭 = 시작일
      setPendingStart(clicked);
      onRangeChange({ start: clicked, end: clicked });
    } else {
      // 두 번째 클릭 = 종료일
      const start = pendingStart < clicked ? pendingStart : clicked;
      const end = pendingStart < clicked ? clicked : pendingStart;
      onRangeChange({ start, end });
      setPendingStart(null);
    }
  }

  function selectMonth(month: number) {
    setViewMonth(month);
    setPickerMode(null);
  }

  function selectYear(year: number) {
    setViewYear(year);
    setPickerMode(null);
  }

  // 연도 페이지네이션
  const canGoYearPrev = yearPageStart > 1900;
  const canGoYearNext = yearPageStart + YEAR_RANGE_SIZE < 2200;

  return (
    <div className="bg-admin-card-bg border-2 border-admin-card-border rounded-xl p-4 relative">
      <p className="text-sm font-bold mb-3 text-gray-900">기간 설정</p>

      {/* 월/연도 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setPickerMode(pickerMode === "month" ? null : "month")}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-sm text-gray-900"
        >
          {viewMonth + 1}월 <ChevronDownMini />
        </button>
        <button
          type="button"
          onClick={() => setPickerMode(pickerMode === "year" ? null : "year")}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-sm text-gray-900"
        >
          {viewYear} <ChevronDownMini />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-500 mb-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (day === null) return <div key={di} />;
              const date = new Date(viewYear, viewMonth, day);
              const todayFlag = isSameDay(date, today);
              const inRange = isInRange(date);
              const edgeFlag = isRangeEdge(date);

              let bgClass = "";
              if (edgeFlag) {
                bgClass = "bg-primary text-white font-bold";
              } else if (inRange) {
                bgClass = "bg-primary/20 text-gray-900";
              } else if (todayFlag) {
                bgClass = "border border-primary text-primary";
              } else {
                bgClass = "hover:bg-gray-100 text-gray-900";
              }

              return (
                <button
                  key={di}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`aspect-square rounded-full text-xs transition ${bgClass}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 모달 — 절대 위치로 띄움 */}
      {pickerMode === "month" && (
        <PickerModal title="월 선택" onClose={() => setPickerMode(null)}>
          <div className="grid grid-cols-4 gap-3 p-4">
            {Array.from({ length: 12 }).map((_, i) => {
              const isCurrent = i === viewMonth;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectMonth(i)}
                  className={`py-2 rounded-full text-sm transition ${
                    isCurrent
                      ? "border border-primary text-primary font-bold"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {i + 1}월
                </button>
              );
            })}
          </div>
        </PickerModal>
      )}

      {pickerMode === "year" && (
        <PickerModal
          title="연도 선택"
          onClose={() => setPickerMode(null)}
          headerRight={
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canGoYearPrev}
                onClick={() =>
                  setYearPageStart((p) => Math.max(1900, p - YEAR_RANGE_SIZE))
                }
                className="p-1 rounded hover:bg-gray-100 disabled:cursor-not-allowed"
              >
                <ChevronLeft
                  size={14}
                  color={canGoYearPrev ? "#000000" : "#CAC5CD"}
                />
              </button>
              <button
                type="button"
                disabled={!canGoYearNext}
                onClick={() => setYearPageStart((p) => p + YEAR_RANGE_SIZE)}
                className="p-1 rounded hover:bg-gray-100 disabled:cursor-not-allowed"
              >
                <ChevronRight
                  size={14}
                  color={canGoYearNext ? "#000000" : "#CAC5CD"}
                />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-4 gap-3 p-4">
            {Array.from({ length: YEAR_RANGE_SIZE }).map((_, i) => {
              const year = yearPageStart + i;
              const isCurrent = year === viewYear;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => selectYear(year)}
                  className={`py-1.5 rounded-full text-xs transition ${
                    isCurrent
                      ? "border border-primary text-primary font-bold"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </PickerModal>
      )}
    </div>
  );
}

// ── 모달 컴포넌트 (절대 위치, 상단 보라 줄) ────────
function PickerModal({
  title,
  children,
  onClose,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  headerRight?: React.ReactNode;
}) {
  return (
    <>
      {/* 배경 클릭 시 닫기 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* 모달 본체 — 달력 위에 절대 위치 */}
      <div className="absolute top-12 left-0 right-0 z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        {/* 보라색 상단 줄 */}
        <div className="h-1 bg-primary" />
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {headerRight}
        </div>
        {children}
      </div>
    </>
  );
}

function ChevronDownMini() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}