export type SkinTonePreset =
  | "light"
  | "lightMedium"
  | "medium"
  | "tan"
  | "dark";

export type SkinToneSelection = SkinTonePreset | "custom";

export interface SkinTonePresetOption {
  value: SkinTonePreset;
  label: string;
  color: string;
}

export interface ResolvedSkinTone {
  skinTone: SkinToneSelection;
  skinColor: string;
}

export const SKIN_TONE_PRESETS: SkinTonePresetOption[] = [
  { value: "light", label: "Light", color: "#F7C6A8" },
  {
    value: "lightMedium",
    label: "Light Medium",
    color: "#E8B08F",
  },
  { value: "medium", label: "Medium", color: "#D59A78" },
  { value: "tan", label: "Tan", color: "#BF7D4F" },
  { value: "dark", label: "Dark", color: "#8F582D" },
];

export const DEFAULT_SKIN_TONE: SkinTonePreset = "light";
export const DEFAULT_SKIN_COLOR = "#F7C6A8";

const HEX_COLOR_PATTERN = /^#?[0-9A-Fa-f]{6}$/;
const SKIN_TONE_PRESET_VALUES = new Set<SkinTonePreset>(
  SKIN_TONE_PRESETS.map((preset) => preset.value),
);

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();

  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return null;
  }

  const normalized = trimmed.startsWith("#")
    ? trimmed
    : `#${trimmed}`;

  return normalized.toUpperCase();
}

export function isSkinTonePreset(value: unknown): value is SkinTonePreset {
  return (
    typeof value === "string" &&
    SKIN_TONE_PRESET_VALUES.has(value as SkinTonePreset)
  );
}

export function findSkinTonePresetByColor(
  color: string,
): SkinTonePreset | undefined {
  const normalized = normalizeHexColor(color);

  if (!normalized) {
    return undefined;
  }

  return SKIN_TONE_PRESETS.find(
    (preset) => preset.color.toUpperCase() === normalized,
  )?.value;
}

export function getSkinTonePresetColor(
  preset: SkinTonePreset,
): string {
  return (
    SKIN_TONE_PRESETS.find((option) => option.value === preset)?.color ??
    DEFAULT_SKIN_COLOR
  );
}

export function resolveStoredSkinTone(
  skinTone: unknown,
  skinColor: unknown,
): ResolvedSkinTone {
  const normalizedColor =
    typeof skinColor === "string" ? normalizeHexColor(skinColor) : null;

  if (skinTone === "custom" && normalizedColor) {
    return {
      skinTone: "custom",
      skinColor: normalizedColor,
    };
  }

  if (isSkinTonePreset(skinTone)) {
  return {
    skinTone,
    skinColor: getSkinTonePresetColor(skinTone),
  };
}

  if (normalizedColor) {
    const matchedPreset = findSkinTonePresetByColor(normalizedColor);

    return {
      skinTone: matchedPreset ?? "custom",
      skinColor: normalizedColor,
    };
  }

  return {
    skinTone: DEFAULT_SKIN_TONE,
    skinColor: DEFAULT_SKIN_COLOR,
  };
}