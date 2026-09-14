export const EYE_STYLES = [
  "default",
  "happy",
  "wink",
  "squeeze",
  "angry",
  "closed",
] as const;

export type EyeStyle = (typeof EYE_STYLES)[number];

export const DEFAULT_EYE_STYLE: EyeStyle = "default";

export function isEyeStyle(value: unknown): value is EyeStyle {
  return (
    typeof value === "string" &&
    EYE_STYLES.includes(value as EyeStyle)
  );
}

export function resolveStoredEyeStyle(value: unknown): EyeStyle {
  return isEyeStyle(value) ? value : DEFAULT_EYE_STYLE;
}