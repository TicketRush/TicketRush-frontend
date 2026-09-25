/** GET /api/v1/banner after shared snake_case conversion. */
export interface BannerItem {
  performanceId: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  date?: string | null;
  imageUrl?: string | null;
  /** Server order is preserved. */
  order: number;
}
