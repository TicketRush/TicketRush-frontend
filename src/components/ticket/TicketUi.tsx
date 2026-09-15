import { type HTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import { Calendar, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Button from "@/components/common/Button/Button";
import type { TicketQrResponse } from "@/types/domain/ticket";

const POSTER_FALLBACK_CLASS =
  "bg-gradient-to-b from-poster-fallback to-poster-fallback-end";

/** Figma 정보 박스: #f9fafb + #dfe6e9 2px. 이슈의 border-soft 토큰은 없음 → border */
const INFO_BOX_CLASS = "bg-secondary border-2 border-border rounded-input p-4";

const DOWNLOAD_QR_HINT =
  "다운로드본에는 입장 QR이 포함되지 않습니다. 입장 시 앱에서 최신 QR을 확인하세요.";

export function TicketPoster({ src, alt }: { src?: string; alt: string }) {
  return (
    <div
      className={clsx(
        "aspect-[3/1] w-full overflow-hidden rounded-input flex items-center justify-center",
        POSTER_FALLBACK_CLASS,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex flex-col items-center text-text-secondary">
          <div className="flex size-20 items-center justify-center rounded-full bg-white/50">
            <Calendar size={40} className="text-primary" />
          </div>
          <span className="mt-2 text-sm">공연 포스터</span>
        </div>
      )}
    </div>
  );
}

export function TicketInfoBox({
  icon,
  label,
  value,
  mono,
  className,
  children,
  ...rest
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx(INFO_BOX_CLASS, "relative", className)} {...rest}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-secondary">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={clsx(
          "truncate text-base font-bold text-text",
          mono && "font-mono text-sm",
        )}
      >
        {value}
      </p>
      {children}
    </div>
  );
}

function formatQrRemainingLabel(remainingMs: number): string {
  return `${Math.floor(remainingMs / 60000)}:${String(
    Math.floor((remainingMs % 60000) / 1000),
  ).padStart(2, "0")}`;
}

export function TicketQrCard({
  isConfirmed,
  isQrLoading,
  qrData,
  placeholder,
  remainingMs,
}: {
  isConfirmed: boolean;
  isQrLoading: boolean;
  qrData: TicketQrResponse | undefined;
  placeholder: string;
  remainingMs: number;
}) {
  const isTicketUsable = !qrData || qrData.ticketStatus === "UNUSED";
  const isExpiringSoon = !!qrData && remainingMs > 0 && remainingMs < 30_000;

  return (
    <div className="mb-6 rounded-xl bg-white p-8 shadow-card">
      <h3 className="mb-4 text-center text-lg font-bold">입장 QR 코드</h3>
      <div className="mb-4 flex items-center justify-center">
        <div className="relative flex size-64 items-center justify-center rounded-input border-4 border-primary bg-white p-1">
          {isConfirmed ? (
            isQrLoading && !qrData ? (
              <span className="text-xs text-text-secondary">QR 발급 중...</span>
            ) : qrData ? (
              <QRCodeSVG
                value={qrData.payload}
                size={220}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#6C5CE7"
              />
            ) : (
              <span className="text-xs text-error">
                QR 코드를 불러올 수 없습니다.
              </span>
            )
          ) : (
            <span className="px-2 text-center text-xs text-text-secondary">
              {placeholder}
            </span>
          )}
          {!isTicketUsable && isConfirmed && (
            <div className="absolute inset-0 flex items-center justify-center rounded-input bg-white/85">
              <span className="text-sm font-bold text-text-secondary">
                {qrData?.ticketStatus === "USED"
                  ? "입장 완료된 티켓"
                  : "취소된 티켓"}
              </span>
            </div>
          )}
        </div>
      </div>
      {isConfirmed && (
        <p className="text-center text-base font-semibold text-text-secondary">
          공연장 입장 시 스캔하세요
        </p>
      )}
      {isConfirmed && qrData && isTicketUsable && (
        <p
          className={clsx(
            "mt-1 text-center text-sm",
            isExpiringSoon
              ? "font-semibold text-error"
              : "text-text-secondary",
          )}
        >
          {remainingMs > 0
            ? `QR 만료까지 ${formatQrRemainingLabel(remainingMs)}`
            : "QR 코드 갱신 중..."}
        </p>
      )}
    </div>
  );
}

export function TicketDownloadActions({
  onDownload,
  primaryLabel,
  onPrimary,
  showDownload = true,
}: {
  onDownload: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  /** CONFIRMED가 아니면 미확정·취소 티켓 PNG 저장을 막는다 */
  showDownload?: boolean;
}) {
  return (
    <div className="space-y-3">
      {showDownload && (
        <>
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={onDownload}
            icon={<Download size={20} />}
          >
            다운로드
          </Button>
          <p className="px-2 text-center text-sm text-text-secondary">
            {DOWNLOAD_QR_HINT}
          </p>
        </>
      )}
      <Button
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        onClick={onPrimary}
      >
        {primaryLabel}
      </Button>
    </div>
  );
}
