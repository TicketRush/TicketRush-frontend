export type OutfitModelId =
  | "rainbow-blouse"
  | "concert"
  | "classic"
  | "festival"
  | "ballet"
  | "theater";

interface OutfitOption {
  id: OutfitModelId;
  name: string;
  description: string;
  icon: string;
  modelUrl: string | null;
}

export const OUTFIT_OPTIONS: readonly OutfitOption[] = [
  {
    id: "rainbow-blouse",
    name: "무지개 블라우스",
    description: "가벼운 공연 의상",
    icon: "👗",
    modelUrl: null,
  },
  {
    id: "concert",
    name: "마이크 콘서트",
    description: "K-POP 콘서트 대표룩",
    icon: "🎤",
    modelUrl: "/models/outfits/concert_outfit.glb",
  },
  {
    id: "classic",
    name: "클래식 공연",
    description: "포멀한 공연 의상",
    icon: "🎻",
    modelUrl: null,
  },
  {
    id: "festival",
    name: "DJ / 페스티벌",
    description: "EDM 페스티벌룩",
    icon: "🎸",
    modelUrl: null,
  },
  {
    id: "ballet",
    name: "발레 / 무용 공연",
    description: "무용 공연 의상",
    icon: "🩰",
    modelUrl: null,
  },
  {
    id: "theater",
    name: "연극 / 극장",
    description: "무대 의상",
    icon: "🎩",
    modelUrl: null,
  },
];

export const DEFAULT_OUTFIT_MODEL_ID: OutfitModelId = "rainbow-blouse";

export const OUTFIT_MODEL_URLS: Partial<
  Record<OutfitModelId, string>
> = Object.fromEntries(
  OUTFIT_OPTIONS.flatMap((outfit) =>
    outfit.modelUrl ? [[outfit.id, outfit.modelUrl]] : [],
  ),
) as Partial<Record<OutfitModelId, string>>;

const OUTFIT_MODEL_IDS = new Set<OutfitModelId>(
  OUTFIT_OPTIONS.map((outfit) => outfit.id),
);

/**
 * 기존 localStorage에는 화면 표시용 outfitName만 저장되어 있었으므로
 * stable id 도입 전 저장값을 한 번 복원하기 위한 호환 맵입니다.
 * 화면 문구가 바뀌더라도 이 키들은 삭제하지 않습니다.
 */
const LEGACY_OUTFIT_NAME_TO_ID: Record<string, OutfitModelId> = {
  "무지개 블라우스": "rainbow-blouse",
  "마이크 콘서트": "concert",
  "클래식 공연": "classic",
  "DJ / 페스티벌": "festival",
  "발레 / 무용 공연": "ballet",
  "연극 / 극장": "theater",
};

export function resolveStoredOutfitModelId(
  value: unknown,
  legacyOutfitName?: unknown,
): OutfitModelId {
  if (
    typeof value === "string" &&
    OUTFIT_MODEL_IDS.has(value as OutfitModelId)
  ) {
    return value as OutfitModelId;
  }

  if (typeof legacyOutfitName === "string") {
    return (
      LEGACY_OUTFIT_NAME_TO_ID[legacyOutfitName] ??
      DEFAULT_OUTFIT_MODEL_ID
    );
  }

  return DEFAULT_OUTFIT_MODEL_ID;
}

export function getOutfitOption(outfitModelId: OutfitModelId) {
  return (
    OUTFIT_OPTIONS.find((outfit) => outfit.id === outfitModelId) ??
    OUTFIT_OPTIONS[0]
  );
}

export function getOutfitModelUrl(
  outfitModelId: OutfitModelId,
): string | null {
  return OUTFIT_MODEL_URLS[outfitModelId] ?? null;
}
