export const MOUTH_STYLES = [
  "DEFAULT",
  "SMILE",
  "OPEN_SMILE",
  "PUCKER",
  "CAT",
  "ROUND",
] as const;

export type MouthStyle = (typeof MOUTH_STYLES)[number];

export const DEFAULT_MOUTH_STYLE: MouthStyle = "DEFAULT";

export const MOUTH_STYLE_LABELS: Record<MouthStyle, string> = {
  DEFAULT: "기본 입",
  SMILE: "미소 입",
  OPEN_SMILE: "활짝 웃는 입",
  PUCKER: "3 모양 입",
  CAT: "고양이 입",
  ROUND: "동그란 입",
};

export function isMouthStyle(value: unknown): value is MouthStyle {
  return (
    typeof value === "string" &&
    MOUTH_STYLES.includes(value as MouthStyle)
  );
}

export function resolveStoredMouthStyle(value: unknown): MouthStyle {
  return isMouthStyle(value) ? value : DEFAULT_MOUTH_STYLE;
}