import type { Genre } from "@/types/domain/concert";

interface GenreBadgeProps {
  genre: Genre;
  className?: string;
}

// Genre 타입의 키값에 맞게 조정 (MUSICAL, CONCERT 등 실제 키값 확인 필요)
const genreStyles: Record<Genre, { label: string; classes: string }> = {
  MUSICAL: {
    label: "뮤지컬",
    classes: "bg-genre-musical/[0.125] text-genre-musical",
  },
  CONCERT: {
    label: "콘서트",
    classes: "bg-genre-concert/[0.125] text-genre-concert",
  },
  CLASSIC: {
    label: "클래식",
    classes: "bg-genre-classic/[0.125] text-genre-classic",
  },
  JAZZ: { label: "재즈", classes: "bg-genre-jazz/[0.125] text-genre-jazz" },
  FESTIVAL: {
    label: "페스티벌",
    classes: "bg-genre-festival/[0.125] text-genre-festival",
  },
  FANMEETING: {
    label: "팬미팅",
    classes: "bg-genre-fanmeeting/[0.125] text-genre-fanmeeting",
  },
  BALLET: {
    label: "발레",
    classes: "bg-genre-ballet/[0.125] text-genre-ballet",
  },
};

export default function GenreBadge({ genre, className = "" }: GenreBadgeProps) {
  const { label, classes } = genreStyles[genre];

  return (
    <span
      className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-md ${classes} ${className}`}
    >
      {label}
    </span>
  );
}
