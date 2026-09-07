import { type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "danger"
    | "kakao"
    | "naver"
    | "google";

  size?: "sm" | "md" | "lg" | "oauth";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  children: ReactNode;
}

// border-none을 두면 안 된다. Tailwind가 border-style 유틸리티를 border-width보다
// 뒤에 출력해서, variant가 border를 붙여도 style: none이 이겨 테두리가 사라진다.
// 테두리가 없어야 하는 variant는 border 클래스를 안 쓰는 것으로 충분하다.
const baseStyle =
  "inline-flex items-center justify-center gap-2 cursor-pointer " +
  "font-pretendard transition-all duration-150 ease-in-out " +
  "active:scale-[0.98]";

const variantStyles = {
  primary:
    "bg-primary text-white font-bold rounded-button shadow-button hover:opacity-90",
  secondary:
    "bg-white text-text-secondary font-medium border border-border rounded-button hover:bg-secondary",
  // 뒤로가기 / 공연 목록으로 같은 이동 버튼. secondary와 테두리는 같고 글자만 진하다.
  outline:
    "bg-white text-text font-medium border border-border rounded-button hover:bg-secondary",
  danger: "bg-danger text-white font-bold rounded-button hover:opacity-90",
  kakao:
    "bg-kakao text-kakao-text font-semibold border-2 border-kakao-border rounded-input hover:opacity-90",
  naver:
    "bg-naver text-naver-text font-semibold border-2 border-naver-border rounded-input hover:opacity-90",
  google:
    "bg-google text-google-text font-semibold border-2 border-google-border rounded-input hover:bg-secondary",
} as const;

const sizeStyles = {
  sm: "h-[42px] px-5 text-sm",
  md: "h-12 px-7 text-base",
  lg: "h-14 px-8 text-lg",
  oauth: "h-[52px] px-5 text-base",
} as const;

const stateStyles = {
  // border-none을 두면 outline/secondary/소셜 테두리가 비활성일 때 다시 사라진다.
  disabled:
    "!bg-disabled-bg !text-text-disabled !shadow-none cursor-not-allowed opacity-100",
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
          {icon && iconPosition === "right" && icon}
        </>
      )}
    </button>
  );
}
