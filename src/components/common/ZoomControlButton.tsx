import type { PropsWithChildren } from "react";

interface ZoomControlButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

export default function ZoomControlButton({
  label,
  disabled = false,
  onClick,
  children,
}: PropsWithChildren<ZoomControlButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
