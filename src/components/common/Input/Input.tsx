import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useState,
} from "react";
import clsx from "clsx";
import { Eye, EyeClosed } from "lucide-react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  required?: boolean;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const baseStyle =
  "w-full h-[52px] px-4 py-3 " +
  "font-pretendard text-base text-text " +
  "bg-white border rounded-input outline-none " +
  "transition-all duration-150 ease-in-out " +
  "placeholder:text-placeholder/70 " +
  "focus:scale-[1.01] active:scale-[0.97]";

const stateStyles = {
  normal: "border-border",
  focus: "focus:border-border-focus focus:ring-2 focus:ring-primary/20",
  error: "border-error focus:ring-error/20",
  disabled:
    "disabled:bg-disabled-bg disabled:text-text-disabled disabled:cursor-not-allowed",
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      icon,
      required,
      error,
      helperText,
      fullWidth = true,
      type,
      className = "",
      id,
      ...rest
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputId = id || label?.replace(/\s+/g, "-").toLowerCase();

    return (
      <div className={clsx("flex flex-col gap-2", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className="flex items-center gap-1 text-sm font-medium text-text"
          >
            {icon && <span className="text-text-secondary">{icon}</span>}
            {label}
            {required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}

        {/* 인풋 래퍼 */}
        <div className="relative w-full">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            className={clsx(
              baseStyle,
              stateStyles.focus, // focus 스타일
              error ? stateStyles.error : stateStyles.normal,
              stateStyles.disabled,
              isPassword && "pr-12", // 아이콘 공간 확보
              className,
            )}
            {...rest}
          />

          {/* 비밀번호 토글 */}
          {isPassword && (
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text p-1"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {showPassword ? <EyeClosed size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>

        {/* 에러/도움말 */}
        {error ? (
          <p className="text-[13px] text-error">{error}</p>
        ) : (
          helperText && (
            <p className="text-[13px] text-text-secondary">{helperText}</p>
          )
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
