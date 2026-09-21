import type { HairStyle } from "@/components/admin/character/characterHair";
import type { EyeStyle } from "@/components/admin/character/characterEye";
import type { MouthStyle } from "@/components/admin/character/characterMouth";
import type { SkinToneSelection } from "@/components/admin/character/characterSkin";
import type { OutfitModelId } from "@/components/admin/character/characterOutfit";

export const CHARACTER_CONFIG_SCHEMA_VERSION = 1;
export const MAX_CHARACTER_CONFIG_BYTES = 4096;
export type CharacterPose = "standing" | "wave" | "heart" | "dance" | "sing";

/** Versioned settings shared by storage, export and the performance API. */
export interface CharacterConfig {
  schemaVersion: typeof CHARACTER_CONFIG_SCHEMA_VERSION;
  skinTone: SkinToneSelection;
  skinColor: string;
  hairStyle: HairStyle;
  mouthStyle: MouthStyle;
  eyeStyle: EyeStyle;
  hairColor: string;
  outfitModelId: OutfitModelId;
  outfitColor: string;
  jazzShirtColor: string;
  jazzInnerColor: string;
  jazzPantsColor: string;
  balletWearColor: string;
  balletShortsColor: string;
  jacketColor: string;
  innerColor: string;
  bottomColor: string;
  musicalJacketColor: string;
  musicalInnerColor: string;
  musicalShortsColor: string;
  festivalTopColor: string;
  festivalBottomColor: string;
  fanmeetCardiganColor: string;
  fanmeetInnerColor: string;
  fanmeetShortsColor: string;
  fanmeetSkirtColor: string;
  accessory: string;
  pose: CharacterPose;
  background: string;
}

/** Display-only state; outfitName is derived and never persisted. */
export type CharacterDraft = Omit<CharacterConfig, "schemaVersion"> & {
  outfitName: string;
};
