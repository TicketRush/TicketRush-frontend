// offset 페이지네이션 (관리자 테이블용)
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  pageIndex: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({
  pageIndex,
  totalPages,
  onChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // 5개 페이지 번호 표시 (현재 페이지 중심)
  const start = Math.max(0, Math.min(pageIndex - 2, totalPages - 5));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => start + i,
  );

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        type="button"
        onClick={() => onChange(pageIndex - 1)}
        disabled={pageIndex === 0}
        className="p-1.5 rounded hover:bg-admin-border/50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`min-w-[28px] h-7 px-2 rounded text-xs ${
            p === pageIndex
              ? "bg-primary text-white font-bold"
              : "hover:bg-admin-border/50"
          }`}
        >
          {p + 1}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(pageIndex + 1)}
        disabled={pageIndex >= totalPages - 1}
        className="p-1.5 rounded hover:bg-admin-border/50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
