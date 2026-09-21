/** `/admin/seat-monitoring/:performanceId` 경로 파라미터. */
export function parseAdminPerformanceId(
  raw: string | undefined,
): number | null {
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}
