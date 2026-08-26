// 전체 공연 목록 테이블 (TanStack Table) — 대시보드 하단
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import type { AdminConcertItem } from "@/types/domain/admin";
import type { ConcertStatus, Genre } from "@/types/domain/concert";

interface AdminConcertTableProps {
  data: AdminConcertItem[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const GENRE_LABELS: Record<Genre, string> = {
  MUSICAL: "뮤지컬",
  CONCERT: "콘서트",
  CLASSIC: "클래식",
  JAZZ: "재즈",
  FESTIVAL: "페스티벌",
  FANMEETING: "팬미팅",
  BALLET: "발레",
};

const STATUS_STYLES: Record<string, string> = {
  판매중: "bg-green-100 text-green-700",
  매진: "bg-red-100 text-red-700",
  예정: "bg-blue-100 text-blue-700",
  종료: "bg-gray-100 text-gray-600",
  취소: "bg-red-100 text-red-700",
};

/** Figma: 초록 판매중 / 빨강 매진. 매진은 enum이 아니라 잔여 0. */
function statusBadge(row: AdminConcertItem): { label: string; color: string } {
  if (row.status === "CANCELED") {
    return { label: "취소", color: STATUS_STYLES.취소 };
  }
  const soldOut = row.totalSeats > 0 && row.soldSeats >= row.totalSeats;
  if (soldOut) {
    return { label: "매진", color: STATUS_STYLES.매진 };
  }
  const byStatus: Record<ConcertStatus, string> = {
    UPCOMING: "예정",
    ON_SALE: "판매중",
    CLOSED: "종료",
    CANCELED: "취소",
  };
  const label = byStatus[row.status] ?? "판매중";
  return { label, color: STATUS_STYLES[label] ?? STATUS_STYLES.판매중 };
}

export default function AdminConcertTable({
  data,
  onEdit,
  onDelete,
}: AdminConcertTableProps) {
  const columns: ColumnDef<AdminConcertItem>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          E{String(row.original.id).padStart(3, "0")}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "공연명",
      cell: ({ getValue }) => (
        <span className="font-bold text-sm">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "genre",
      header: "장르",
      cell: ({ getValue }) =>
        GENRE_LABELS[getValue() as Genre] ?? (getValue() as string),
    },
    { accessorKey: "date", header: "날짜" },
    {
      id: "sales",
      header: "판매/총",
      cell: ({ row }) => (
        <span>
          {row.original.soldSeats}/{row.original.totalSeats}
        </span>
      ),
    },
    {
      accessorKey: "occupancyRate",
      header: "점유율",
      cell: ({ getValue }) => {
        const rate = (getValue() as number) * 100;
        const color =
          rate >= 90
            ? "text-green-600"
            : rate >= 50
              ? "text-blue-600"
              : "text-gray-500";
        return <span className={`font-bold ${color}`}>{rate.toFixed(0)}%</span>;
      },
    },
    {
      accessorKey: "revenue",
      header: "매출",
      cell: ({ getValue }) => `₩${(getValue() as number).toLocaleString()}`,
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => {
        const s = statusBadge(row.original);
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${s.color}`}
          >
            {s.label}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "관리",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(row.original.id)}
            className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 text-xs flex items-center gap-1"
          >
            <Edit size={12} /> 수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(row.original.id)}
            className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-800 hover:bg-red-50 text-xs flex items-center gap-1"
          >
            <Trash2 size={12} /> 삭제
          </button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        등록된 공연이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-gray-200 bg-gray-50">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="py-3 px-3 text-xs font-semibold text-gray-500"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-3 px-3 text-gray-800">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
