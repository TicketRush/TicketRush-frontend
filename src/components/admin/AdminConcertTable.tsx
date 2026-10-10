// 관리자 공연 목록. 컬럼·매진·상태 우선순위는 같고, 색은 variant로 나눈다.
import { Fragment, type MouseEvent } from "react";
import { Edit, Trash2 } from "lucide-react";
import type { AdminConcertItem } from "@/types/domain/admin";
import {
  formatAdminOccupancy,
  formatAdminSeats,
  formatAdminShowSchedule,
  formatAdminWon,
} from "@/utils/admin/formatAdminMetric";
import {
  formatAdminConcertGenre,
  formatAdminConcertId,
  getAdminConcertStatusView,
  getAdminOccupancyClass,
  isAdminConcertRowActionTarget,
  type AdminConcertListVariant,
} from "@/utils/admin/adminConcertRow";

interface AdminConcertTableProps {
  data: AdminConcertItem[];
  variant?: AdminConcertListVariant;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRowClick?: (concert: AdminConcertItem) => void;
}

type ColumnId =
  | "id"
  | "title"
  | "genre"
  | "date"
  | "sales"
  | "occupancy"
  | "revenue"
  | "status"
  | "actions";

const DATA_COLUMNS: { id: Exclude<ColumnId, "actions">; header: string }[] = [
  { id: "id", header: "ID" },
  { id: "title", header: "공연명" },
  { id: "genre", header: "장르" },
  { id: "date", header: "날짜" },
  { id: "sales", header: "판매/총" },
  { id: "occupancy", header: "점유율" },
  { id: "revenue", header: "매출" },
  { id: "status", header: "상태" },
];

function headerClass(variant: AdminConcertListVariant, columnId: ColumnId) {
  if (variant === "monitoring") {
    return columnId === "title"
      ? "py-3 px-3 text-left"
      : "py-3 px-3 text-center whitespace-nowrap";
  }
  const align = columnId === "title" ? "text-left" : "text-center";
  return `py-3 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap ${align}`;
}

function dashboardCellClass(columnId: ColumnId) {
  const align = columnId === "title" ? "text-left" : "text-center";
  const numeric =
    columnId === "date" ||
    columnId === "sales" ||
    columnId === "occupancy" ||
    columnId === "revenue"
      ? " tabular-nums whitespace-nowrap"
      : "";
  return `py-3 px-3 text-gray-800 ${align}${numeric}`;
}

function stopRowClick(event: { stopPropagation: () => void }, action: () => void) {
  event.stopPropagation();
  action();
}

function renderCell(
  concert: AdminConcertItem,
  columnId: Exclude<ColumnId, "actions">,
  variant: AdminConcertListVariant,
) {
  if (variant === "monitoring") {
    switch (columnId) {
      case "id":
        return (
          <td className="py-3 px-3 text-center font-mono text-xs whitespace-nowrap">
            {formatAdminConcertId(concert.id)}
          </td>
        );
      case "title":
        return (
          <td className="py-3 px-3 text-left font-bold">{concert.title}</td>
        );
      case "genre":
        return (
          <td className="py-3 px-3 text-center whitespace-nowrap">
            {formatAdminConcertGenre(concert)}
          </td>
        );
      case "date":
        return (
          <td className="py-3 px-3 text-center tabular-nums whitespace-nowrap">
            {formatAdminShowSchedule(concert.date, concert.showTime)}
          </td>
        );
      case "sales":
        return (
          <td className="py-3 px-3 text-center tabular-nums whitespace-nowrap">
            {formatAdminSeats(concert.soldSeats, concert.totalSeats)}
          </td>
        );
      case "occupancy":
        return (
          <td
            className={`py-3 px-3 text-center font-bold tabular-nums whitespace-nowrap ${getAdminOccupancyClass(concert.occupancyRate, "monitoring")}`}
          >
            {formatAdminOccupancy(concert.occupancyRate)}
          </td>
        );
      case "revenue":
        return (
          <td className="py-3 px-3 text-center tabular-nums whitespace-nowrap">
            {formatAdminWon(concert.revenue)}
          </td>
        );
      case "status": {
        const status = getAdminConcertStatusView(concert, "monitoring");
        return (
          <td className="py-3 px-3 text-center whitespace-nowrap">
            <span
              className={status.className}
              style={{ backgroundColor: status.backgroundColor }}
            >
              {status.label}
            </span>
          </td>
        );
      }
    }
  }

  switch (columnId) {
    case "id":
      return (
        <td className={dashboardCellClass("id")}>
          <span className="font-mono text-xs">
            {formatAdminConcertId(concert.id)}
          </span>
        </td>
      );
    case "title":
      return (
        <td className={dashboardCellClass("title")}>
          <span className="font-bold text-sm">{concert.title}</span>
        </td>
      );
    case "genre":
      return (
        <td className={dashboardCellClass("genre")}>
          {formatAdminConcertGenre(concert)}
        </td>
      );
    case "date":
      return (
        <td className={dashboardCellClass("date")}>
          {formatAdminShowSchedule(concert.date, concert.showTime)}
        </td>
      );
    case "sales":
      return (
        <td className={dashboardCellClass("sales")}>
          {formatAdminSeats(concert.soldSeats, concert.totalSeats)}
        </td>
      );
    case "occupancy": {
      const rate = concert.occupancyRate;
      const color = getAdminOccupancyClass(rate, "dashboard");
      return (
        <td className={dashboardCellClass("occupancy")}>
          {rate == null ? (
            <span className={color}>{formatAdminOccupancy(rate)}</span>
          ) : (
            <span className={`font-bold ${color}`}>
              {formatAdminOccupancy(rate)}
            </span>
          )}
        </td>
      );
    }
    case "revenue":
      return (
        <td className={dashboardCellClass("revenue")}>
          {formatAdminWon(concert.revenue)}
        </td>
      );
    case "status": {
      const status = getAdminConcertStatusView(concert, "dashboard");
      return (
        <td className={dashboardCellClass("status")}>
          <span className={status.className}>{status.label}</span>
        </td>
      );
    }
  }
}

export default function AdminConcertTable({
  data,
  variant = "dashboard",
  onEdit,
  onDelete,
  onRowClick,
}: AdminConcertTableProps) {
  if (variant === "dashboard" && data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        등록된 공연이 없습니다.
      </div>
    );
  }
  if (data.length === 0) return null;

  const showActions = onEdit != null || onDelete != null;
  const columns: { id: ColumnId; header: string }[] = showActions
    ? [...DATA_COLUMNS, { id: "actions", header: "관리" }]
    : DATA_COLUMNS;

  function openRow(event: MouseEvent<HTMLTableRowElement>, concert: AdminConcertItem) {
    if (!onRowClick || isAdminConcertRowActionTarget(event.target)) return;
    onRowClick(concert);
  }

  return (
    <div className="overflow-x-auto">
      <table
        className={
          variant === "monitoring"
            ? "w-full text-sm admin-table"
            : "w-full text-sm text-left"
        }
      >
        <thead
          className={
            variant === "monitoring" ? "border-b border-admin-border" : undefined
          }
        >
          <tr
            className={
              variant === "monitoring"
                ? "text-xs text-admin-text-secondary"
                : "border-b border-gray-200 bg-gray-50"
            }
          >
            {columns.map((column) => (
              <th key={column.id} className={headerClass(variant, column.id)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((concert) => (
            <tr
              key={concert.id}
              onClick={
                onRowClick ? (event) => openRow(event, concert) : undefined
              }
              className={
                variant === "monitoring"
                  ? "border-b border-admin-border/50 hover:bg-admin-border/30 cursor-pointer transition"
                  : "border-b border-gray-100 hover:bg-gray-50"
              }
            >
              {DATA_COLUMNS.map((column) => (
                <Fragment key={column.id}>
                  {renderCell(concert, column.id, variant)}
                </Fragment>
              ))}
              {showActions ? (
                <td className={dashboardCellClass("actions")}>
                  <div className="flex justify-center gap-1">
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={(event) =>
                          stopRowClick(event, () => onEdit(concert.id))
                        }
                        className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 text-xs flex items-center gap-1"
                      >
                        <Edit size={12} /> 수정
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={(event) =>
                          stopRowClick(event, () => onDelete(concert.id))
                        }
                        className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-800 hover:bg-red-50 text-xs flex items-center gap-1"
                      >
                        <Trash2 size={12} /> 삭제
                      </button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
