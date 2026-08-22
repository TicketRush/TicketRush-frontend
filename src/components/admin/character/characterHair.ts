export const HAIR_STYLES = [
  "short",
  "long",
  "ponytail",
  "twintails",
  "wave",
] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];

export const DEFAULT_HAIR_STYLE: HairStyle = "ponytail";

export function isHairStyle(value: unknown): value is HairStyle {
  return (
    typeof value === "string" &&
    HAIR_STYLES.includes(value as HairStyle)
  );
}

export function resolveStoredHairStyle(value: unknown): HairStyle {
  return isHairStyle(value) ? value : DEFAULT_HAIR_STYLE;
}