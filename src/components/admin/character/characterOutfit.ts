export type OutfitModelId =
  | "rainbow-blouse"
  | "concert"
  | "classic"
  | "festival"
  | "ballet"
  | "musical"
  | "theater";

interface OutfitOption {
  id: OutfitModelId;
  name: string;
  description: string;
  icon: string;
  modelUrl: string | null;
}

export const DEFAULT_MUSICAL_JACKET_COLOR = "#7B61FF";
export const DEFAULT_MUSICAL_INNER_COLOR = "#F8FAFC";
export const DEFAULT_MUSICAL_SHORTS_COLOR = "#2F3338";

export const MUSICAL_OUTFIT_PART_NAMES = {
  jacket: "musical_jacket",
  inner: "musical_inner",
  shorts: "musical_shorts",
} as const;

export const DEFAULT_FESTIVAL_TOP_COLOR = "#FFF526";
export const DEFAULT_FESTIVAL_BOTTOM_COLOR = "#53CBFF";

export const FESTIVAL_OUTFIT_PART_NAMES = {
  top: "festival_windbreak",
  bottom: "festival_pants",
} as const;

/**
 * 공연 등록 화면의 공연 장르 순서와 동일하게 정렬합니다.
 *
 * 공연 장르 ↔ 기존 의상 모델 매핑
 *
 * 콘서트   ↔ concert
 * 뮤지컬   ↔ musical
 * 클래식   ↔ classic
 * 재즈     ↔ rainbow-blouse
 * 페스티벌 ↔ festival
 * 팬미팅   ↔ theater
 * 발레     ↔ ballet
 *
 * 기존 OutfitModelId와 GLB 경로는 호환성을 위해 유지합니다.
 */
export const OUTFIT_OPTIONS: readonly OutfitOption[] = [
  {
    id: "concert",
    name: "콘서트",
    description: "K-POP 콘서트 의상",
    icon: "🎤",
    modelUrl: "/models/outfits/concert_outfit.glb",
  },
  {
    id: "musical",
    name: "뮤지컬",
    description: "뮤지컬 무대 의상",
    icon: "🎭",
    modelUrl: "/models/outfits/musical_outfit.glb",
  },
  {
    id: "classic",
    name: "클래식",
    description: "클래식 공연 의상",
    icon: "🎻",
    modelUrl: null,
  },
  {
    id: "rainbow-blouse",
    name: "재즈",
    description: "재즈 공연 의상",
    icon: "🎷",
    modelUrl: null,
  },
  {
    id: "festival",
    name: "페스티벌",
    description: "EDM 페스티벌 의상",
    icon: "🎧",
    modelUrl: "/models/outfits/festival_outfit.glb",
  },
  {
    id: "theater",
    name: "팬미팅",
    description: "팬미팅 무대 의상",
    icon: "💖",
    modelUrl: null,
  },
  {
    id: "ballet",
    name: "발레",
    description: "발레 공연 의상",
    icon: "🩰",
    modelUrl: "/models/outfits/ballet_outfit.glb",
  },
];

/**
 * 기존 기본 의상 값을 유지합니다.
 *
 * OUTFIT_OPTIONS의 표시 순서는 공연 장르 순서에 맞게 변경되었지만,
 * 저장 데이터 및 기존 동작과의 호환성을 위해 기본 id는 변경하지 않습니다.
 */
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
 * 기존 localStorage에는 화면에 표시하던 outfitName만 저장된 경우가 있어,
 * stable id 도입 전 저장값을 현재 OutfitModelId로 복원하기 위한 호환 맵입니다.
 *
 * 기존 표시명과 변경된 표시명을 모두 지원해,
 * 이미 저장된 캐릭터 설정이 깨지지 않도록 합니다.
 */
const LEGACY_OUTFIT_NAME_TO_ID: Record<string, OutfitModelId> = {
  // 기존 표시명
  "무지개 블라우스": "rainbow-blouse",
  "마이크 콘서트": "concert",
  "클래식 공연": "classic",
  "DJ / 페스티벌": "festival",
  "발레 / 무용 공연": "ballet",
  "뮤지컬 공연": "musical",
  "연극 / 극장": "theater",

  // #273 변경 이후 표시명
  콘서트: "concert",
  뮤지컬: "musical",
  클래식: "classic",
  재즈: "rainbow-blouse",
  페스티벌: "festival",
  팬미팅: "theater",
  발레: "ballet",
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
    OUTFIT_OPTIONS.find(
      (outfit) => outfit.id === DEFAULT_OUTFIT_MODEL_ID,
    ) ??
    OUTFIT_OPTIONS[0]
  );
}

export function getOutfitModelUrl(
  outfitModelId: OutfitModelId,
): string | null {
  return OUTFIT_MODEL_URLS[outfitModelId] ?? null;
}