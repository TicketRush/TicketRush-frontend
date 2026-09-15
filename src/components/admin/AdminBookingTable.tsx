// AdminBookingTable
//
// 백엔드 BookingAdminSummaryResponse (#174 / BE #561):
//   보강 필드·paymentAmount는 생략/null 가능. 결제 수단은 BE 미제공.
import { Fragment } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, User, Mail } from "lucide-react";
import type { AdminBookingItem } from "@/types/domain/admin";
import {
  formatAdminDateTime,
  formatAdminText,
  formatAdminWon,
  UNAVAILABLE_METRIC,
} from "@/utils/admin/formatAdminMetric";

interface AdminBookingTableProps {
  data: AdminBookingItem[];
  onRefund: (bookingNumber: string) => void;
  expandedId: string | null;
  onExpandedIdChange: (bookingNumber: string | null) => void;
  focusedBookingNumber?: string | null;
}

const STATUS_STYLES: Record<string, { label: string; bg: string }> = {
  CONFIRMED: { label: "완료", bg: "#00C950" },
  CANCELED: { label: "취소", bg: "#FB2C36" },
  PENDING: { label: "대기", bg: "#FBBF24" },
  EXPIRED: { label: "만료", bg: "#9CA3AF" },
  REFUNDING: { label: "환불 중", bg: "#2B7FFF" },
  REFUNDED: { label: "환불 완료", bg: "#6B7280" },
};

const SECTION_BADGE =
  "text-[10px] font-bold tracking-wider bg-admin-dark-border text-admin-text px-2 py-0.5 rounded inline-block mb-3";

export default function AdminBookingTable({
  data,
  onRefund,
  expandedId,
  onExpandedIdChange,
  focusedBookingNumber,
}: AdminBookingTableProps) {
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
        <span className="font-bold text-sm">
          {formatAdminText(getValue() as string | null)}
        </span>
      ),
    },
    {
      accessorKey: "concertDate",
      header: "공연날짜",
      cell: ({ getValue }) => formatAdminText(getValue() as string | null),
    },
    {
      accessorKey: "bookedAt",
      header: "예매일시",
      cell: ({ getValue }) => formatAdminDateTime(getValue() as string),
    },
    {
      accessorKey: "userName",
      header: "예매자",
      cell: ({ getValue }) => (
        <span className="font-semibold">
          {formatAdminText(getValue() as string | null)}
        </span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "금액",
      cell: ({ getValue }) => formatAdminWon(getValue() as number | null),
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ getValue }) => {
        const s = STATUS_STYLES[getValue() as string] ?? STATUS_STYLES.PENDING;
        return (
          <span
            className="inline-block px-3 py-1 rounded-md text-xs font-bold text-white"
            style={{ backgroundColor: s.bg }}
          >
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
            aria-expanded={isOpen}
            aria-label={isOpen ? "상세 접기" : "상세 펼치기"}
            onClick={() =>
              onExpandedIdChange(isOpen ? null : row.original.bookingNumber)
            }
            className="inline-flex items-center justify-center p-1.5 rounded text-admin-text bg-admin-dark-bg border border-admin-dark-border hover:bg-admin-dark-border/40"
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
      <table className="w-full text-sm text-center">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-admin-border">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="py-3 px-3 text-xs font-semibold text-admin-text-secondary text-center"
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
              <Fragment key={row.id}>
                <tr
                  className={`border-b border-admin-border/50 hover:bg-admin-border/30 ${
                    focusedBookingNumber === b.bookingNumber
                      ? "bg-primary/10"
                      : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="py-3 px-3 text-admin-text text-center"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
                {isOpen && (
                  <tr className="bg-admin-bg/50">
                    <td colSpan={columns.length} className="p-4 text-left">
                      <BookingDetail booking={b} onRefund={onRefund} />
                    </td>
                  </tr>
                )}
              </Fragment>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-admin-dark-bg border-2 border-admin-dark-border rounded-[10px] p-6">
      <div>
        <p className={SECTION_BADGE}>예매자 정보</p>
        <div className="space-y-3 text-sm">
          <Field
            icon={<User size={14} />}
            label="이름"
            value={formatAdminText(booking.userName)}
          />
          <Field
            icon={<Mail size={14} />}
            label="이메일"
            value={formatAdminText(booking.userEmail)}
          />
        </div>
      </div>

      <div>
        <p className={SECTION_BADGE}>좌석 정보</p>
        <div className="flex gap-2 mb-3 flex-wrap">
          {booking.seatNumbers.length === 0 ? (
            <span className="text-sm text-admin-text-secondary">
              {UNAVAILABLE_METRIC}
            </span>
          ) : (
            booking.seatNumbers.map((s) => (
              <span
                key={s}
                className="px-4 py-2 rounded text-white text-sm font-bold bg-admin-register"
              >
                {s}
              </span>
            ))
          )}
        </div>
        <div className="bg-admin-bg border-2 border-admin-dark-border rounded p-4 space-y-2 text-sm">
          <Row
            label="좌석 수"
            value={
              booking.seatNumbers.length === 0
                ? UNAVAILABLE_METRIC
                : `${booking.seatCount}석`
            }
          />
          <Row label="단가" value={formatAdminWon(booking.unitPrice)} />
          <Row
            label="총 금액"
            value={formatAdminWon(booking.totalAmount)}
            emphasized
          />
        </div>
        {booking.status === "CONFIRMED" && (
          <button
            type="button"
            onClick={() => onRefund(booking.bookingNumber)}
            className="w-full mt-3 py-3 rounded font-bold text-white bg-admin-refund"
          >
            환불 요청
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
        <p className="font-semibold text-admin-text">{value}</p>
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
    <div
      className={`flex justify-between ${
        emphasized ? "border-t-2 border-admin-dark-border pt-2.5" : ""
      }`}
    >
      <span
        className={
          emphasized
            ? "font-bold text-admin-text"
            : "text-admin-text-secondary"
        }
      >
        {label}
      </span>
      <span
        className={`font-bold text-admin-text ${emphasized ? "text-base" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
