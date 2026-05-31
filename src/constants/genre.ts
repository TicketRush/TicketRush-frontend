import type { Genre } from "../api/types/domain/concert";

interface GenreConfig {
  label: string;
  color: string;
}

export const GENRE_MAP: Record<Genre, GenreConfig> = {
  MUSICAL: { label: "뮤지컬", color: "#6C5CE7" },
  CONCERT: { label: "콘서트", color: "#FF6B9D" },
  CLASSIC: { label: "클래식", color: "#6496FF" },
  JAZZ: { label: "재즈", color: "#FFA502" },
  FESTIVAL: { label: "페스티벌", color: "#20AE7F" },
  FANMEETING: { label: "팬미팅", color: "#E679FF" },
  BALLET: { label: "발레", color: "#C6B5FF" },
} as const;
