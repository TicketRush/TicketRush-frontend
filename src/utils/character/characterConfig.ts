import { resolveStoredHairStyle } from "@/components/admin/character/characterHair";
import { resolveStoredEyeStyle } from "@/components/admin/character/characterEye";
import { resolveStoredMouthStyle } from "@/components/admin/character/characterMouth";
import {
  normalizeHexColor,
  resolveStoredSkinTone,
} from "@/components/admin/character/characterSkin";
import {
  DEFAULT_MUSICAL_INNER_COLOR,
  DEFAULT_MUSICAL_JACKET_COLOR,
  DEFAULT_MUSICAL_SHORTS_COLOR,
  DEFAULT_FESTIVAL_BOTTOM_COLOR,
  DEFAULT_FESTIVAL_TOP_COLOR,
  DEFAULT_FANMEET_CARDIGAN_COLOR,
  DEFAULT_FANMEET_INNER_COLOR,
  DEFAULT_FANMEET_SHORTS_COLOR,
  DEFAULT_FANMEET_SKIRT_COLOR,
  getOutfitOption,
  resolveStoredOutfitModelId,
} from "@/components/admin/character/characterOutfit";
import {
  CHARACTER_CONFIG_SCHEMA_VERSION,
  MAX_CHARACTER_CONFIG_BYTES,
  type CharacterConfig,
  type CharacterDraft,
  type CharacterPose,
} from "@/types/domain/character";

export const CHARACTER_STORAGE_KEY = "ticketRush:admin-character";
const DEFAULT_HAIR_COLOR = "#151515";
const DEFAULT_OUTFIT_COLOR = "#60A5FA";
const DEFAULT_BACKGROUND_COLOR = "#E9DDFF";

function resolvePose(value: unknown): CharacterPose {
  return value === "wave" ||
    value === "heart" ||
    value === "dance" ||
    value === "sing"
    ? value
    : "standing";
}

/** Accept legacy drafts, but reject invalid roots and unknown schema versions. */
export function restoreCharacterDraft(value: unknown): CharacterDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parsed = value as Record<string, unknown>;
  if (
    parsed.schemaVersion !== undefined &&
    parsed.schemaVersion !== CHARACTER_CONFIG_SCHEMA_VERSION
  )
    return null;
  if (
    !["hairStyle", "outfitModelId", "outfitName", "skinColor"].some(
      (key) => typeof parsed[key] === "string",
    )
  )
    return null;
  const resolvedSkin = resolveStoredSkinTone(parsed.skinTone, parsed.skinColor);

  const resolvedHairColor =
    typeof parsed.hairColor === "string"
      ? normalizeHexColor(parsed.hairColor)
      : null;

  const resolvedOutfitColor =
    typeof parsed.outfitColor === "string"
      ? normalizeHexColor(parsed.outfitColor)
      : null;

  const legacyOutfitColor = resolvedOutfitColor ?? DEFAULT_OUTFIT_COLOR;

  const resolvedJazzShirtColor =
    typeof parsed.jazzShirtColor === "string"
      ? normalizeHexColor(parsed.jazzShirtColor)
      : null;

  const resolvedJazzInnerColor =
    typeof parsed.jazzInnerColor === "string"
      ? normalizeHexColor(parsed.jazzInnerColor)
      : null;

  const resolvedJazzPantsColor =
    typeof parsed.jazzPantsColor === "string"
      ? normalizeHexColor(parsed.jazzPantsColor)
      : null;

  const resolvedBalletWearColor =
    typeof parsed.balletWearColor === "string"
      ? normalizeHexColor(parsed.balletWearColor)
      : null;

  const resolvedBalletShortsColor =
    typeof parsed.balletShortsColor === "string"
      ? normalizeHexColor(parsed.balletShortsColor)
      : null;

  const resolvedJacketColor =
    typeof parsed.jacketColor === "string"
      ? normalizeHexColor(parsed.jacketColor)
      : null;

  const resolvedInnerColor =
    typeof parsed.innerColor === "string"
      ? normalizeHexColor(parsed.innerColor)
      : null;

  const resolvedBottomColor =
    typeof parsed.bottomColor === "string"
      ? normalizeHexColor(parsed.bottomColor)
      : null;

  const resolvedMusicalJacketColor =
    typeof parsed.musicalJacketColor === "string"
      ? normalizeHexColor(parsed.musicalJacketColor)
      : null;

  const resolvedMusicalInnerColor =
    typeof parsed.musicalInnerColor === "string"
      ? normalizeHexColor(parsed.musicalInnerColor)
      : null;

  const resolvedMusicalShortsColor =
    typeof parsed.musicalShortsColor === "string"
      ? normalizeHexColor(parsed.musicalShortsColor)
      : null;

  const resolvedFestivalTopColor =
    typeof parsed.festivalTopColor === "string"
      ? normalizeHexColor(parsed.festivalTopColor)
      : null;

  const resolvedFestivalBottomColor =
    typeof parsed.festivalBottomColor === "string"
      ? normalizeHexColor(parsed.festivalBottomColor)
      : null;

  const resolvedFanmeetCardiganColor =
    typeof parsed.fanmeetCardiganColor === "string"
      ? normalizeHexColor(parsed.fanmeetCardiganColor)
      : null;
  const resolvedFanmeetInnerColor =
    typeof parsed.fanmeetInnerColor === "string"
      ? normalizeHexColor(parsed.fanmeetInnerColor)
      : null;
  const resolvedFanmeetShortsColor =
    typeof parsed.fanmeetShortsColor === "string"
      ? normalizeHexColor(parsed.fanmeetShortsColor)
      : null;
  const resolvedFanmeetSkirtColor =
    typeof parsed.fanmeetSkirtColor === "string"
      ? normalizeHexColor(parsed.fanmeetSkirtColor)
      : null;

  const resolvedBackground =
    typeof parsed.background === "string"
      ? normalizeHexColor(parsed.background)
      : null;

  const resolvedOutfitModelId = resolveStoredOutfitModelId(
    parsed.outfitModelId,
    parsed.outfitName,
  );

  const resolvedOutfit = getOutfitOption(resolvedOutfitModelId);

  return {
    ...resolvedSkin,
    hairStyle: resolveStoredHairStyle(parsed.hairStyle),
    mouthStyle: resolveStoredMouthStyle(parsed.mouthStyle),
    eyeStyle: resolveStoredEyeStyle(parsed.eyeStyle),
    hairColor: resolvedHairColor ?? DEFAULT_HAIR_COLOR,
    outfitModelId: resolvedOutfitModelId,
    outfitName: resolvedOutfit.name,
    outfitColor: resolvedOutfitColor ?? DEFAULT_OUTFIT_COLOR,
    jazzShirtColor: resolvedJazzShirtColor ?? legacyOutfitColor,
    jazzInnerColor: resolvedJazzInnerColor ?? legacyOutfitColor,
    jazzPantsColor: resolvedJazzPantsColor ?? legacyOutfitColor,
    balletWearColor: resolvedBalletWearColor ?? legacyOutfitColor,
    balletShortsColor: resolvedBalletShortsColor ?? legacyOutfitColor,
    jacketColor: resolvedJacketColor ?? legacyOutfitColor,
    innerColor: resolvedInnerColor ?? legacyOutfitColor,
    bottomColor: resolvedBottomColor ?? legacyOutfitColor,
    musicalJacketColor:
      resolvedMusicalJacketColor ?? DEFAULT_MUSICAL_JACKET_COLOR,
    musicalInnerColor: resolvedMusicalInnerColor ?? DEFAULT_MUSICAL_INNER_COLOR,
    musicalShortsColor:
      resolvedMusicalShortsColor ?? DEFAULT_MUSICAL_SHORTS_COLOR,
    festivalTopColor: resolvedFestivalTopColor ?? DEFAULT_FESTIVAL_TOP_COLOR,
    festivalBottomColor:
      resolvedFestivalBottomColor ?? DEFAULT_FESTIVAL_BOTTOM_COLOR,
    background: resolvedBackground ?? DEFAULT_BACKGROUND_COLOR,
    fanmeetCardiganColor:
      resolvedFanmeetCardiganColor ?? DEFAULT_FANMEET_CARDIGAN_COLOR,
    fanmeetInnerColor: resolvedFanmeetInnerColor ?? DEFAULT_FANMEET_INNER_COLOR,
    fanmeetShortsColor: resolvedFanmeetShortsColor ?? DEFAULT_FANMEET_SHORTS_COLOR,
    fanmeetSkirtColor: resolvedFanmeetSkirtColor ?? DEFAULT_FANMEET_SKIRT_COLOR,
    accessory: typeof parsed.accessory === "string" ? parsed.accessory : "none",
    pose: resolvePose(parsed.pose),
  };
}

export function loadSavedCharacter(): CharacterDraft | null {
  try {
    const saved = localStorage.getItem(CHARACTER_STORAGE_KEY);
    return saved ? restoreCharacterDraft(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

/** Public cards must not invent a character from an invalid or incomplete identity. */
export function restoreCharacterForDisplay(value: unknown): CharacterDraft | null {
  const restored = restoreCharacterDraft(value);
  if (!restored) return null;
  const saved = value as Record<string, unknown>;
  for (const key of ["outfitModelId", "hairStyle", "eyeStyle", "mouthStyle"] as const) {
    if (saved[key] !== restored[key]) return null;
  }
  for (const key of ["skinColor", "hairColor", "outfitColor", "background"] as const) {
    if (typeof saved[key] !== "string" || !normalizeHexColor(saved[key])) return null;
  }
  // Missing legacy part colors use the same defaults as the creator; malformed ones do not.
  for (const [key, color] of Object.entries(saved)) {
    if (key in restored && key.endsWith("Color") &&
      (typeof color !== "string" || !normalizeHexColor(color))) return null;
  }
  return restored;
}

/** Explicit projection prevents UI-only fields from leaking into the API. */
export function createCharacterConfig(
  character: Omit<CharacterConfig, "schemaVersion">,
): CharacterConfig {
  return {
    schemaVersion: CHARACTER_CONFIG_SCHEMA_VERSION,
    skinTone: character.skinTone,
    skinColor: character.skinColor,
    hairStyle: character.hairStyle,
    mouthStyle: character.mouthStyle,
    eyeStyle: character.eyeStyle,
    hairColor: character.hairColor,
    outfitModelId: character.outfitModelId,
    outfitColor: character.outfitColor,
    jazzShirtColor: character.jazzShirtColor,
    jazzInnerColor: character.jazzInnerColor,
    jazzPantsColor: character.jazzPantsColor,
    balletWearColor: character.balletWearColor,
    balletShortsColor: character.balletShortsColor,
    jacketColor: character.jacketColor,
    innerColor: character.innerColor,
    bottomColor: character.bottomColor,
    musicalJacketColor: character.musicalJacketColor,
    musicalInnerColor: character.musicalInnerColor,
    musicalShortsColor: character.musicalShortsColor,
    festivalTopColor: character.festivalTopColor,
    festivalBottomColor: character.festivalBottomColor,
    fanmeetCardiganColor: character.fanmeetCardiganColor,
    fanmeetInnerColor: character.fanmeetInnerColor,
    fanmeetShortsColor: character.fanmeetShortsColor,
    fanmeetSkirtColor: character.fanmeetSkirtColor,
    accessory: character.accessory,
    pose: character.pose,
    background: character.background,
  };
}

export function getCharacterConfigByteSize(config: CharacterConfig): number {
  return new TextEncoder().encode(JSON.stringify(config)).byteLength;
}

export function validateCharacterConfig(
  config: CharacterConfig | null | undefined,
  required: boolean,
): string | null {
  if (!config) return required ? "3D 캐릭터를 제작해주세요." : null;
  return getCharacterConfigByteSize(config) > MAX_CHARACTER_CONFIG_BYTES
    ? `캐릭터 설정은 ${MAX_CHARACTER_CONFIG_BYTES} bytes 이하여야 합니다.`
    : null;
}
