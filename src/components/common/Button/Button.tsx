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
// relative: 로딩 스피너를 레이블 위에 올려 버튼 너비가 늘어나지 않게 한다 (#251)
const baseStyle =
  "relative inline-flex items-center justify-center gap-2 cursor-pointer " +
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
  // 배경만 회색으로 바꾸면 카카오/네이버처럼 브랜드 border가 남아 선만 보이는
  // 상태가 된다. border도 disabled-bg에 맞춰 덮어 테두리만 남지 않게 한다 (#249).
  disabled:
    "!bg-disabled-bg !text-text-disabled !border-disabled-bg !shadow-none cursor-not-allowed opacity-100",
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
        // 로딩 중에는 브랜드 색을 유지하고 스피너만 보여 준다.
        // disabled 회색을 씌우면 소셜 버튼이 테두리만 남은 것처럼 보인다 (#249).
        isDisabled && !loading && stateStyles.disabled,
        loading && "cursor-not-allowed",
        className, // 외부 커스터마이징 허용
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          {/* 보이지 않는 레이블로 원래 너비를 유지하고, 스피너만 가운데 표시 (#251) */}
          <span className="invisible inline-flex items-center gap-2" aria-hidden>
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </span>
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
