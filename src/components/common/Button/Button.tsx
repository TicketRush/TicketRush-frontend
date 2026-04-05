import { type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "kakao" | "naver" | "google";
  // primary: 보라색 | secondary: 흰 배경+테두리 | danger: 빨간색
  // kakao/naver/google: OAuth 간편 로그인

  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  children: ReactNode;
}

const baseStyle =
  "inline-flex items-center justify-center gap-2 border-none cursor-pointer " +
  "font-pretendard transition-all duration-150 ease-in-out " +
  "active:scale-[0.98]";

const variantStyles = {
  primary:
    "bg-primary text-white font-bold rounded-button shadow-button hover:opacity-90",
  secondary:
    "bg-white text-text-secondary font-medium border border-border rounded-button hover:bg-[#f8f9fa]",
  danger: "bg-danger text-white font-bold rounded-button hover:opacity-90",
  kakao:
    "bg-kakao text-kakao-text font-semibold rounded-button hover:opacity-90",
  naver: "bg-naver text-white font-semibold rounded-button hover:opacity-90",
  google:
    "bg-white text-text font-medium border border-border rounded-button hover:bg-[#f8f9fa]",
} as const;

const sizeStyles = {
  sm: "h-[42px] px-5 text-sm",
  md: "h-12 px-7 text-base",
  lg: "h-14 px-8 text-lg",
} as const;

const stateStyles = {
  disabled:
    "!bg-disabled-bg !text-text-disabled !border-none !shadow-none cursor-not-allowed opacity-100",
};

// Spinner 컴포넌트 (로딩 UI)
function Spinner() {
  return (
    <span className="inline-block w-[18px] h-[18px] border-2 border-white/30 border-t-current rounded-full animate-spin" />
  );
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  icon,
  iconPosition = "left",
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={clsx(
        baseStyle, // 공통 스타일
        variantStyles[variant], // 버튼 종류
        sizeStyles[size], // 크기
        fullWidth && "w-full", // full width 옵션
        isDisabled && stateStyles.disabled, // 비활성 상태
        className, // 외부 커스터마이징 허용
      )}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner />
          <span className="opacity-70">{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && icon}
          {children}
          {icon && iconPosition === "left" && icon}
        </>
      )}
    </button>
  );
}
