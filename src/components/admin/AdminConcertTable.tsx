// 전체 공연 목록 테이블 (TanStack Table) — 대시보드 하단
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import type { AdminConcertItem } from "@/types/domain/admin";

interface AdminConcertTableProps {
  data: AdminConcertItem[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ON_SALE: { label: "판매중", color: "bg-green-500/20 text-green-300" },
  SOLD_OUT: { label: "매진", color: "bg-red-500/20 text-red-300" },
  ENDED: { label: "종료", color: "bg-gray-500/20 text-gray-300" },
  UPCOMING: { label: "예정", color: "bg-blue-500/20 text-blue-300" },
};

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
        <span className="font-mono text-xs">E{String(row.original.id).padStart(3, "0")}</span>
      ),
    },
    {
      accessorKey: "title",
      header: "공연명",
      cell: ({ getValue }) => (
        <span className="font-bold text-sm">{getValue() as string}</span>
      ),
    },
    { accessorKey: "genre", header: "장르" },
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
        const color = rate >= 90 ? "text-green-400" : rate >= 50 ? "text-blue-400" : "text-gray-400";
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
      cell: ({ getValue }) => {
        const s = STATUS_LABELS[getValue() as string] ?? STATUS_LABELS.ON_SALE;
        return (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${s.color}`}>
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
            className="px-2 py-1 rounded bg-admin-border hover:bg-admin-border/80 text-xs flex items-center gap-1"
          >
            <Edit size={12} /> 수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(row.original.id)}
            className="px-2 py-1 rounded bg-admin-border hover:bg-red-500/30 text-xs flex items-center gap-1"
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left admin-table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-admin-border">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="py-3 px-3 text-xs font-semibold text-admin-text-secondary"
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
              className="border-b border-admin-border/50 hover:bg-admin-border/30"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-3 px-3 text-admin-text">
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
