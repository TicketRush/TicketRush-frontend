// components/common/Skeleton/Skeleton.tsx
import { type CSSProperties } from "react";

type Variant = "text" | "image" | "circle";

export interface SkeletonProps {
  /** text: 텍스트 줄 / image: 이미지 영역 / circle: 원형 (아바타) */
  variant?: Variant;
  width?: string | number;
  height?: string | number;
  className?: string;
}
const variantStyles: Record<Variant, string> = {
  text: "rounded",
  image: "rounded-lg",
  circle: "rounded-full",
};

export default function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
}: SkeletonProps) {
  const computedWidth = width ?? (variant === "circle" ? "40px" : undefined);

  const computedHeight =
    height ??
    (variant === "text" ? "1rem" : variant === "circle" ? "40px" : undefined);

  const style: CSSProperties = {
    ...(computedWidth !== undefined && { width: computedWidth }),
    ...(computedHeight !== undefined && { height: computedHeight }),
  };

  return (
    <div
      aria-hidden="true"
      className={[
        "bg-gray-200 animate-pulse",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    />
  );
}
