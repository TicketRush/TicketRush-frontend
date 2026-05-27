// 관리자 예매 목록 테이블 — 펼치기/접기로 상세 표시 (이미지 4)
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, User, Mail, CreditCard } from "lucide-react";
import type { AdminBookingItem } from "@/types/domain/admin";

interface AdminBookingTableProps {
  data: AdminBookingItem[];
  onRefund: (bookingNumber: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; bg: string }> = {
  CONFIRMED: {
    label: "완료",
    bg: "bg-[#00C950]/20 text-[#00C950]",
  },
  CANCELLED: {
    label: "취소",
    bg: "bg-[#FB2C36]/20 text-[#FB2C36]",
  },
  PENDING: {
    label: "대기",
    bg: "bg-yellow-500/20 text-yellow-300",
  },
  EXPIRED: {
    label: "만료",
    bg: "bg-gray-500/20 text-gray-300",
  },
};

export default function AdminBookingTable({
  data,
  onRefund,
}: AdminBookingTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns: ColumnDef<AdminBookingItem>[] = [
    {
      accessorKey: "bookingNumber",
      header: "예매번호",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-blue-400">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "concertTitle",
      header: "공연명",
      cell: ({ getValue }) => (
        <span className="font-bold text-sm">{getValue() as string}</span>
      ),
    },
    { accessorKey: "concertDate", header: "공연날짜" },
    {
      accessorKey: "bookedAt",
      header: "예매일시",
      cell: ({ getValue }) => {
        const d = new Date(getValue() as string);
        return `${d.toISOString().split("T")[0]} ${d.toTimeString().slice(0, 5)}`;
      },
    },
    {
      accessorKey: "userName",
      header: "예매자",
      cell: ({ getValue }) => (
        <span className="font-semibold">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "금액",
      cell: ({ getValue }) => `₩${(getValue() as number).toLocaleString()}`,
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ getValue }) => {
        const s = STATUS_LABELS[getValue() as string] ?? STATUS_LABELS.PENDING;
        return (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${s.bg}`}>
            {s.label}
          </span>
        );
      },
    },
    {
      id: "expand",
      header: "상세",
      cell: ({ row }) => {
        const isOpen = expandedId === row.original.bookingNumber;
        return (
          <button
            type="button"
            onClick={() =>
              setExpandedId(isOpen ? null : row.original.bookingNumber)
            }
            className="p-1.5 rounded bg-admin-border hover:bg-admin-border/80"
          >
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
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
          {table.getRowModel().rows.map((row) => {
            const b = row.original;
            const isOpen = expandedId === b.bookingNumber;
            return (
              <>
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
                {isOpen && (
                  <tr className="bg-admin-bg/50">
                    <td colSpan={columns.length} className="p-6">
                      <BookingDetail booking={b} onRefund={onRefund} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BookingDetail({
  booking,
  onRefund,
}: {
  booking: AdminBookingItem;
  onRefund: (bookingNumber: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 예매자 정보 */}
      <div>
        <p className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-3">
          예매자 정보
        </p>
        <div className="space-y-3 text-sm">
          <Field icon={<User size={14} />} label="이름" value={booking.userName} />
          <Field icon={<Mail size={14} />} label="이메일" value={booking.userEmail} />
          <Field
            icon={<CreditCard size={14} />}
            label="결제 수단"
            value={booking.paymentMethod}
          />
        </div>
      </div>

      {/* 좌석 정보 + 금액 + 환불 */}
      <div>
        <p className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-3">
          좌석 정보
        </p>
        <div className="flex gap-2 mb-3 flex-wrap">
          {booking.seatLabels.map((s) => (
            <span
              key={s}
              className="px-3 py-1.5 rounded bg-primary text-white text-sm font-bold"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="bg-admin-bg/70 rounded p-4 space-y-2 text-sm">
          <Row label="좌석 수" value={`${booking.seatCount}석`} />
          <Row label="단가" value={`₩${booking.unitPrice.toLocaleString()}`} />
          <Row
            label="총 금액"
            value={`₩${booking.totalAmount.toLocaleString()}`}
            emphasized
          />
        </div>
        {booking.status === "CONFIRMED" && (
          <button
            type="button"
            onClick={() => onRefund(booking.bookingNumber)}
            className="w-full mt-3 py-3 rounded font-bold text-white"
            style={{ backgroundColor: "#931818" }}
          >
            환불 처리
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-admin-text-secondary">{icon}</div>
      <div>
        <p className="text-[10px] text-admin-text-secondary">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-admin-text-secondary">{label}</span>
      <span className={emphasized ? "font-bold text-base" : ""}>{value}</span>
    </div>
  );
}
