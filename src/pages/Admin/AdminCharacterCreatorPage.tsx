import { toast } from "react-toastify";
import type {
  CharacterDraft,
  CharacterPose as Pose,
} from "@/types/domain/character";
import {
  CHARACTER_STORAGE_KEY,
  loadSavedCharacter,
  createCharacterConfig,
  validateCharacterConfig,
} from "@/utils/character/characterConfig";
import { useLayoutEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CharacterModelViewer from "@/components/admin/character/CharacterModelViewer";
import type { HairStyle } from "@/components/admin/character/characterHair";
import type { EyeStyle } from "@/components/admin/character/characterEye";
import {
  MOUTH_STYLE_LABELS,
  type MouthStyle,
} from "@/components/admin/character/characterMouth";
import {
  DEFAULT_SKIN_COLOR,
  DEFAULT_SKIN_TONE,
  SKIN_TONE_PRESETS,
  findSkinTonePresetByColor,
  normalizeHexColor,
  type SkinToneSelection,
} from "@/components/admin/character/characterSkin";
import {
  DEFAULT_MUSICAL_INNER_COLOR,
  DEFAULT_MUSICAL_JACKET_COLOR,
  DEFAULT_MUSICAL_SHORTS_COLOR,
  DEFAULT_FESTIVAL_BOTTOM_COLOR,
  DEFAULT_FANMEET_CARDIGAN_COLOR,
  DEFAULT_FANMEET_INNER_COLOR,
  DEFAULT_FANMEET_SHORTS_COLOR,
  DEFAULT_FANMEET_SKIRT_COLOR,
  DEFAULT_FESTIVAL_TOP_COLOR,
  DEFAULT_OUTFIT_MODEL_ID,
  OUTFIT_OPTIONS,
  getOutfitOption,
  type OutfitModelId,
} from "@/components/admin/character/characterOutfit";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";

interface BackgroundPreset {
  id: string;
  label: string;
  color: string;
}

interface OutfitColorCustomizerProps {
  idPrefix: string;
  title: string;
  customTitle: string;
  value: string;
  hexInput: string;
  hexError: string;
  onApplyColor: (value: string) => void;
  onHexChange: (value: string) => void;
  onHexBlur: () => void;
}

const DEFAULT_RETURN_TO = "/admin/concerts/new";

const HAIR_STYLES: {
  value: HairStyle;
  label: string;
  icon: string;
}[] = [
  { value: "short", label: "단발", icon: "👱" },
  { value: "long", label: "장발", icon: "👩" },
  { value: "ponytail", label: "포니테일", icon: "🎀" },
  { value: "twintails", label: "양갈래", icon: "👧" },
  { value: "wave", label: "웨이브", icon: "🌀" },
];

const EYE_STYLES: {
  value: EyeStyle;
  label: string;
  icon: string;
}[] = [
  { value: "default", label: "기본", icon: "👀" },
  { value: "happy", label: "웃는 눈", icon: "^^" },
  { value: "wink", label: "윙크", icon: "😉" },
  { value: "squeeze", label: "찡긋", icon: "><" },
  { value: "angry", label: "화난 눈", icon: "😠" },
  { value: "closed", label: "감은 눈", icon: "—" },
];

const MOUTH_OPTIONS: {
  value: MouthStyle;
  label: string;
  icon: string;
}[] = [
  {
    value: "DEFAULT",
    label: MOUTH_STYLE_LABELS.DEFAULT,
    icon: "—",
  },
  {
    value: "SMILE",
    label: MOUTH_STYLE_LABELS.SMILE,
    icon: "⌣",
  },
  {
    value: "OPEN_SMILE",
    label: MOUTH_STYLE_LABELS.OPEN_SMILE,
    icon: "◡",
  },
  {
    value: "PUCKER",
    label: MOUTH_STYLE_LABELS.PUCKER,
    icon: "3",
  },
  {
    value: "CAT",
    label: MOUTH_STYLE_LABELS.CAT,
    icon: "ㅅ",
  },
  {
    value: "ROUND",
    label: MOUTH_STYLE_LABELS.ROUND,
    icon: "○",
  },
];

const DEFAULT_HAIR_COLOR = "#151515";

const HAIR_COLORS = [
  DEFAULT_HAIR_COLOR,
  "#4b3a2b",
  "#bfc5c7",
  "#f07ac4",
  "#8e5aa6",
  "#4f7c5a",
  "#444889",
];

const DEFAULT_OUTFIT_COLOR = "#60A5FA";

const DEFAULT_BALLET_WEAR_COLOR = DEFAULT_OUTFIT_COLOR;
const DEFAULT_BALLET_SHORTS_COLOR = DEFAULT_OUTFIT_COLOR;

const DEFAULT_CONCERT_JACKET_COLOR = DEFAULT_OUTFIT_COLOR;
const DEFAULT_CONCERT_INNER_COLOR = DEFAULT_OUTFIT_COLOR;
const DEFAULT_CONCERT_BOTTOM_COLOR = DEFAULT_OUTFIT_COLOR;

const OUTFIT_COLORS = [
  "#ffd60a",
  "#ffafcc",
  "#7b61ff",
  "#76dbc8",
  "#f8fafc",
  "#7a6657",
  "#2f3338",
  DEFAULT_OUTFIT_COLOR,
  "#14213d",
  "#ff3333",
];

function createPartColorPresets(defaultColor: string) {
  return [
    defaultColor,
    ...OUTFIT_COLORS.filter(
      (color) => !isSameHexColor(color, defaultColor),
    ).slice(0, 9),
  ];
}

const MUSICAL_JACKET_COLORS = createPartColorPresets(
  DEFAULT_MUSICAL_JACKET_COLOR,
);

const MUSICAL_INNER_COLORS = createPartColorPresets(
  DEFAULT_MUSICAL_INNER_COLOR,
);

const MUSICAL_SHORTS_COLORS = createPartColorPresets(
  DEFAULT_MUSICAL_SHORTS_COLOR,
);

const FESTIVAL_TOP_COLORS = [
  DEFAULT_FESTIVAL_TOP_COLOR,
  ...OUTFIT_COLORS.filter(
    (color) =>
      color.toUpperCase() !== DEFAULT_FESTIVAL_TOP_COLOR.toUpperCase() &&
      color.toUpperCase() !== "#FFD60A",
  ),
];

const FESTIVAL_BOTTOM_COLORS = [
  DEFAULT_FESTIVAL_BOTTOM_COLOR,
  ...OUTFIT_COLORS.filter(
    (color) =>
      color.toUpperCase() !==
        DEFAULT_FESTIVAL_BOTTOM_COLOR.toUpperCase() &&
      color.toUpperCase() !== "#60A5FA",
  ),
];

const FANMEET_CARDIGAN_COLORS = createPartColorPresets(DEFAULT_FANMEET_CARDIGAN_COLOR);
const FANMEET_INNER_COLORS = createPartColorPresets(DEFAULT_FANMEET_INNER_COLOR);
const FANMEET_SHORTS_COLORS = createPartColorPresets(DEFAULT_FANMEET_SHORTS_COLOR);
const FANMEET_SKIRT_COLORS = createPartColorPresets(DEFAULT_FANMEET_SKIRT_COLOR);

const ACCESSORIES = [
  { value: "none", label: "제거", icon: "❌" },
  { value: "sunglasses", label: "선글라스", icon: "🕶️" },
  { value: "hat", label: "모자", icon: "🎩" },
  { value: "headset", label: "헤드셋", icon: "🎧" },
  { value: "mic", label: "마이크", icon: "🎙️" },
  { value: "guitar", label: "기타", icon: "🎸" },
  { value: "light", label: "응원봉", icon: "💡" },
];

const POSES: { value: Pose; label: string; icon: string }[] = [
  { value: "standing", label: "기본 자세", icon: "🧍" },
  { value: "wave", label: "손 흔들기", icon: "👋" },
  { value: "heart", label: "손가락 하트", icon: "🫰" },
  { value: "dance", label: "춤추기", icon: "💃" },
  { value: "sing", label: "노래하기", icon: "🎤" },
];

const BACKGROUNDS: BackgroundPreset[] = [
  { id: "lavender", label: "라벤더", color: "#E9DDFF" },
  { id: "pink", label: "핑크", color: "#FFD6E8" },
  { id: "sky-blue", label: "스카이블루", color: "#DBEAFE" },
  { id: "mint", label: "민트", color: "#D9F5EC" },
  { id: "cream", label: "크림", color: "#FFF3D6" },
  { id: "coral", label: "코랄", color: "#FFD2C8" },
  { id: "concert", label: "콘서트", color: "#4C3D91" },
  { id: "magic-show", label: "마술쇼", color: "#24123D" },
  { id: "opera", label: "오페라", color: "#6B1F2B" },
  { id: "festival", label: "페스티벌", color: "#10B981" },
  { id: "musical", label: "뮤지컬", color: "#8B5CF6" },
  { id: "fan-meeting", label: "팬미팅", color: "#F0ABFC" },
  { id: "classic", label: "클래식", color: "#D6C6A5" },
  { id: "dark-gray", label: "다크 그레이", color: "#343A40" },
];

const DEFAULT_CHARACTER: CharacterDraft = {
  skinTone: DEFAULT_SKIN_TONE,
  skinColor: DEFAULT_SKIN_COLOR,
  hairStyle: "ponytail",
  mouthStyle: "DEFAULT",
  eyeStyle: "default",
  hairColor: DEFAULT_HAIR_COLOR,
  outfitModelId: DEFAULT_OUTFIT_MODEL_ID,
  outfitName: getOutfitOption(DEFAULT_OUTFIT_MODEL_ID).name,
  outfitColor: DEFAULT_OUTFIT_COLOR,
  balletWearColor: DEFAULT_BALLET_WEAR_COLOR,
  balletShortsColor: DEFAULT_BALLET_SHORTS_COLOR,
  jacketColor: DEFAULT_CONCERT_JACKET_COLOR,
  innerColor: DEFAULT_CONCERT_INNER_COLOR,
  bottomColor: DEFAULT_CONCERT_BOTTOM_COLOR,
  musicalJacketColor: DEFAULT_MUSICAL_JACKET_COLOR,
  musicalInnerColor: DEFAULT_MUSICAL_INNER_COLOR,
  musicalShortsColor: DEFAULT_MUSICAL_SHORTS_COLOR,
  festivalTopColor: DEFAULT_FESTIVAL_TOP_COLOR,
  festivalBottomColor: DEFAULT_FESTIVAL_BOTTOM_COLOR,
  fanmeetCardiganColor: DEFAULT_FANMEET_CARDIGAN_COLOR,
  fanmeetInnerColor: DEFAULT_FANMEET_INNER_COLOR,
  fanmeetShortsColor: DEFAULT_FANMEET_SHORTS_COLOR,
  fanmeetSkirtColor: DEFAULT_FANMEET_SKIRT_COLOR,
  accessory: "none",
  pose: "standing",
  background: "#E9DDFF",
};

function isSameHexColor(first: string, second: string) {
  return first.toUpperCase() === second.toUpperCase();
}

function resolveAdminReturnTo(returnTo: string | null): string {
  if (!returnTo) {
    return DEFAULT_RETURN_TO;
  }

  const isAdminPath = /^\/admin(?:\/|$)/.test(returnTo);

  if (!isAdminPath) {
    return DEFAULT_RETURN_TO;
  }

  return returnTo;
}

export default function AdminCharacterCreatorPage() {
  useDocumentTitle("캐릭터 생성");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  const [character, setCharacter] = useState<CharacterDraft>(() =>
    loadSavedCharacter() ?? DEFAULT_CHARACTER,
  );

  const [skinHexInput, setSkinHexInput] = useState(
    () => character.skinColor,
  );
  const [skinHexError, setSkinHexError] = useState("");

  const [hairHexInput, setHairHexInput] = useState(
    () => character.hairColor,
  );
  const [hairHexError, setHairHexError] = useState("");

  const [outfitHexInput, setOutfitHexInput] = useState(
    () => character.outfitColor,
  );
  const [outfitHexError, setOutfitHexError] = useState("");

  const [balletWearHexInput, setBalletWearHexInput] = useState(
    () => character.balletWearColor,
  );
  const [balletWearHexError, setBalletWearHexError] =
    useState("");

  const [balletShortsHexInput, setBalletShortsHexInput] =
    useState(() => character.balletShortsColor);
  const [balletShortsHexError, setBalletShortsHexError] =
    useState("");

  const [jacketHexInput, setJacketHexInput] = useState(
    () => character.jacketColor,
  );
  const [jacketHexError, setJacketHexError] = useState("");

  const [innerHexInput, setInnerHexInput] = useState(
    () => character.innerColor,
  );
  const [innerHexError, setInnerHexError] = useState("");

  const [bottomHexInput, setBottomHexInput] = useState(
    () => character.bottomColor,
  );
  const [bottomHexError, setBottomHexError] = useState("");

  const [musicalJacketHexInput, setMusicalJacketHexInput] = useState(
    () => character.musicalJacketColor,
  );
  const [musicalJacketHexError, setMusicalJacketHexError] =
    useState("");

  const [musicalInnerHexInput, setMusicalInnerHexInput] = useState(
    () => character.musicalInnerColor,
  );
  const [musicalInnerHexError, setMusicalInnerHexError] = useState("");

  const [musicalShortsHexInput, setMusicalShortsHexInput] = useState(
    () => character.musicalShortsColor,
  );
  const [musicalShortsHexError, setMusicalShortsHexError] =
    useState("");

  const [festivalTopHexInput, setFestivalTopHexInput] = useState(
    () => character.festivalTopColor,
  );
  const [festivalTopHexError, setFestivalTopHexError] = useState("");

  const [festivalBottomHexInput, setFestivalBottomHexInput] = useState(
    () => character.festivalBottomColor,
  );
  const [festivalBottomHexError, setFestivalBottomHexError] =
    useState("");

  const [fanmeetCardiganHexInput, setFanmeetCardiganHexInput] = useState(() => character.fanmeetCardiganColor);
  const [fanmeetCardiganHexError, setFanmeetCardiganHexError] = useState("");

  const [fanmeetInnerHexInput, setFanmeetInnerHexInput] = useState(() => character.fanmeetInnerColor);
  const [fanmeetInnerHexError, setFanmeetInnerHexError] = useState("");

  const [fanmeetShortsHexInput, setFanmeetShortsHexInput] = useState(() => character.fanmeetShortsColor);
  const [fanmeetShortsHexError, setFanmeetShortsHexError] = useState("");

  const [fanmeetSkirtHexInput, setFanmeetSkirtHexInput] = useState(() => character.fanmeetSkirtColor);
  const [fanmeetSkirtHexError, setFanmeetSkirtHexError] = useState("");

  const [backgroundHexInput, setBackgroundHexInput] = useState(
    () => character.background,
  );
  const [backgroundHexError, setBackgroundHexError] = useState("");

  const isCustomSkinTone = character.skinTone === "custom";

  const selectedHairColorPreset = HAIR_COLORS.find((color) =>
    isSameHexColor(color, character.hairColor),
  );
  const isCustomHairColor = !selectedHairColorPreset;

  const selectedOutfitColorPreset = OUTFIT_COLORS.find((color) =>
    isSameHexColor(color, character.outfitColor),
  );
  const isCustomOutfitColor = !selectedOutfitColorPreset;

  const selectedBalletWearColorPreset = OUTFIT_COLORS.find((color) =>
    isSameHexColor(color, character.balletWearColor),
  );
  const isCustomBalletWearColor =
    !selectedBalletWearColorPreset;

  const selectedBalletShortsColorPreset = OUTFIT_COLORS.find(
    (color) =>
      isSameHexColor(color, character.balletShortsColor),
  );
  const isCustomBalletShortsColor =
    !selectedBalletShortsColorPreset;

  const selectedMusicalJacketPreset = MUSICAL_JACKET_COLORS.find(
    (color) => isSameHexColor(color, character.musicalJacketColor),
  );
  const isCustomMusicalJacketColor = !selectedMusicalJacketPreset;

  const selectedMusicalInnerPreset = MUSICAL_INNER_COLORS.find(
    (color) => isSameHexColor(color, character.musicalInnerColor),
  );
  const isCustomMusicalInnerColor = !selectedMusicalInnerPreset;

  const selectedMusicalShortsPreset = MUSICAL_SHORTS_COLORS.find(
    (color) => isSameHexColor(color, character.musicalShortsColor),
  );
  const isCustomMusicalShortsColor = !selectedMusicalShortsPreset;

  const selectedFestivalTopColorPreset = FESTIVAL_TOP_COLORS.find(
    (color) => isSameHexColor(color, character.festivalTopColor),
  );
  const isCustomFestivalTopColor = !selectedFestivalTopColorPreset;

  const selectedFestivalBottomColorPreset = FESTIVAL_BOTTOM_COLORS.find(
    (color) => isSameHexColor(color, character.festivalBottomColor),
  );
  const isCustomFestivalBottomColor =
    !selectedFestivalBottomColorPreset;

  const selectedBackgroundPreset = BACKGROUNDS.find((background) =>
    isSameHexColor(background.color, character.background),
  );

  const isCustomBackground = !selectedBackgroundPreset;
  const isBalletOutfit = character.outfitModelId === "ballet";
  const isConcertOutfit = character.outfitModelId === "concert";
  const isMusicalOutfit = character.outfitModelId === "musical";
  const isFanmeetOutfit = character.outfitModelId === "theater";
  const isFestivalOutfit = character.outfitModelId === "festival";

  function update<K extends keyof CharacterDraft>(
    key: K,
    value: CharacterDraft[K],
  ) {
    setCharacter((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function selectOutfit(outfitModelId: OutfitModelId) {
    const outfit = getOutfitOption(outfitModelId);

    setCharacter((prev) => ({
      ...prev,
      outfitModelId,
      outfitName: outfit.name,
    }));
  }

  function applySkinPreset(
    skinTone: Exclude<SkinToneSelection, "custom">,
    skinColor: string,
  ) {
    update("skinTone", skinTone);
    update("skinColor", skinColor);
    setSkinHexInput(skinColor);
    setSkinHexError("");
  }

  function applyCustomSkinColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    const matchedPreset = findSkinTonePresetByColor(normalized);

    update("skinTone", matchedPreset ?? "custom");
    update("skinColor", normalized);
    setSkinHexInput(normalized);
    setSkinHexError("");

    return true;
  }

  function handleSkinHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setSkinHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyCustomSkinColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setSkinHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setSkinHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setSkinHexError("");
  }

  function handleSkinHexBlur() {
    const normalized = normalizeHexColor(skinHexInput);

    if (normalized) {
      applyCustomSkinColor(normalized);
      return;
    }

    setSkinHexInput(character.skinColor);
    setSkinHexError("");
  }

  function applyHairColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("hairColor", normalized);
    setHairHexInput(normalized);
    setHairHexError("");

    return true;
  }

  function handleHairHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setHairHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyHairColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setHairHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setHairHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setHairHexError("");
  }

  function handleHairHexBlur() {
    const normalized = normalizeHexColor(hairHexInput);

    if (normalized) {
      applyHairColor(normalized);
      return;
    }

    setHairHexInput(character.hairColor);
    setHairHexError("");
  }

  function applyOutfitColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("outfitColor", normalized);
    setOutfitHexInput(normalized);
    setOutfitHexError("");

    return true;
  }

  function handleOutfitHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setOutfitHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyOutfitColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setOutfitHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setOutfitHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setOutfitHexError("");
  }

  function handleOutfitHexBlur() {
    const normalized = normalizeHexColor(outfitHexInput);

    if (normalized) {
      applyOutfitColor(normalized);
      return;
    }

    setOutfitHexInput(character.outfitColor);
    setOutfitHexError("");
  }

  function applyBalletWearColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("balletWearColor", normalized);
    setBalletWearHexInput(normalized);
    setBalletWearHexError("");

    return true;
  }

  function handleBalletWearHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setBalletWearHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyBalletWearColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setBalletWearHexError(
        "0-9와 A-F만 입력할 수 있습니다.",
      );
      return;
    }

    if (hexBody.length > 6) {
      setBalletWearHexError(
        "HEX 색상은 6자리로 입력해주세요.",
      );
      return;
    }

    setBalletWearHexError("");
  }

  function handleBalletWearHexBlur() {
    const normalized = normalizeHexColor(balletWearHexInput);

    if (normalized) {
      applyBalletWearColor(normalized);
      return;
    }

    setBalletWearHexInput(character.balletWearColor);
    setBalletWearHexError("");
  }

  function applyBalletShortsColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("balletShortsColor", normalized);
    setBalletShortsHexInput(normalized);
    setBalletShortsHexError("");

    return true;
  }

  function handleBalletShortsHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setBalletShortsHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyBalletShortsColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setBalletShortsHexError(
        "0-9와 A-F만 입력할 수 있습니다.",
      );
      return;
    }

    if (hexBody.length > 6) {
      setBalletShortsHexError(
        "HEX 색상은 6자리로 입력해주세요.",
      );
      return;
    }

    setBalletShortsHexError("");
  }

  function handleBalletShortsHexBlur() {
    const normalized = normalizeHexColor(balletShortsHexInput);

    if (normalized) {
      applyBalletShortsColor(normalized);
      return;
    }

    setBalletShortsHexInput(character.balletShortsColor);
    setBalletShortsHexError("");
  }

  function applyJacketColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("jacketColor", normalized);
    setJacketHexInput(normalized);
    setJacketHexError("");

    return true;
  }

  function handleJacketHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setJacketHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyJacketColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setJacketHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setJacketHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setJacketHexError("");
  }

  function handleJacketHexBlur() {
    const normalized = normalizeHexColor(jacketHexInput);

    if (normalized) {
      applyJacketColor(normalized);
      return;
    }

    setJacketHexInput(character.jacketColor);
    setJacketHexError("");
  }

  function applyInnerColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("innerColor", normalized);
    setInnerHexInput(normalized);
    setInnerHexError("");

    return true;
  }

  function handleInnerHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setInnerHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyInnerColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setInnerHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setInnerHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setInnerHexError("");
  }

  function handleInnerHexBlur() {
    const normalized = normalizeHexColor(innerHexInput);

    if (normalized) {
      applyInnerColor(normalized);
      return;
    }

    setInnerHexInput(character.innerColor);
    setInnerHexError("");
  }

  function applyBottomColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("bottomColor", normalized);
    setBottomHexInput(normalized);
    setBottomHexError("");

    return true;
  }

  function handleBottomHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setBottomHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyBottomColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setBottomHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setBottomHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setBottomHexError("");
  }

  function handleBottomHexBlur() {
    const normalized = normalizeHexColor(bottomHexInput);

    if (normalized) {
      applyBottomColor(normalized);
      return;
    }

    setBottomHexInput(character.bottomColor);
    setBottomHexError("");
  }

  function applyMusicalJacketColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("musicalJacketColor", normalized);
    setMusicalJacketHexInput(normalized);
    setMusicalJacketHexError("");

    return true;
  }

  function handleMusicalJacketHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setMusicalJacketHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyMusicalJacketColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setMusicalJacketHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setMusicalJacketHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setMusicalJacketHexError("");
  }

  function handleMusicalJacketHexBlur() {
    const normalized = normalizeHexColor(musicalJacketHexInput);

    if (normalized) {
      applyMusicalJacketColor(normalized);
      return;
    }

    setMusicalJacketHexInput(character.musicalJacketColor);
    setMusicalJacketHexError("");
  }

  function applyMusicalInnerColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("musicalInnerColor", normalized);
    setMusicalInnerHexInput(normalized);
    setMusicalInnerHexError("");

    return true;
  }

  function handleMusicalInnerHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setMusicalInnerHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyMusicalInnerColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setMusicalInnerHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setMusicalInnerHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setMusicalInnerHexError("");
  }

  function handleMusicalInnerHexBlur() {
    const normalized = normalizeHexColor(musicalInnerHexInput);

    if (normalized) {
      applyMusicalInnerColor(normalized);
      return;
    }

    setMusicalInnerHexInput(character.musicalInnerColor);
    setMusicalInnerHexError("");
  }

  function applyMusicalShortsColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("musicalShortsColor", normalized);
    setMusicalShortsHexInput(normalized);
    setMusicalShortsHexError("");

    return true;
  }

  function handleMusicalShortsHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setMusicalShortsHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyMusicalShortsColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setMusicalShortsHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setMusicalShortsHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setMusicalShortsHexError("");
  }

  function handleMusicalShortsHexBlur() {
    const normalized = normalizeHexColor(musicalShortsHexInput);

    if (normalized) {
      applyMusicalShortsColor(normalized);
      return;
    }

    setMusicalShortsHexInput(character.musicalShortsColor);
    setMusicalShortsHexError("");
  }

  function applyFestivalTopColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("festivalTopColor", normalized);
    setFestivalTopHexInput(normalized);
    setFestivalTopHexError("");

    return true;
  }

  function handleFestivalTopHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setFestivalTopHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyFestivalTopColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setFestivalTopHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setFestivalTopHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setFestivalTopHexError("");
  }

  function handleFestivalTopHexBlur() {
    const normalized = normalizeHexColor(festivalTopHexInput);

    if (normalized) {
      applyFestivalTopColor(normalized);
      return;
    }

    setFestivalTopHexInput(character.festivalTopColor);
    setFestivalTopHexError("");
  }

  function applyFestivalBottomColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("festivalBottomColor", normalized);
    setFestivalBottomHexInput(normalized);
    setFestivalBottomHexError("");

    return true;
  }

  function handleFestivalBottomHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setFestivalBottomHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyFestivalBottomColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setFestivalBottomHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setFestivalBottomHexError(
        "HEX 색상은 6자리로 입력해주세요.",
      );
      return;
    }

    setFestivalBottomHexError("");
  }

  function handleFestivalBottomHexBlur() {
    const normalized = normalizeHexColor(festivalBottomHexInput);

    if (normalized) {
      applyFestivalBottomColor(normalized);
      return;
    }

    setFestivalBottomHexInput(character.festivalBottomColor);
    setFestivalBottomHexError("");
  }

  function applyFanmeetCardiganColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("fanmeetCardiganColor", normalized);
    setFanmeetCardiganHexInput(normalized);
    setFanmeetCardiganHexError("");

    return true;
  }

  function handleFanmeetCardiganHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setFanmeetCardiganHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyFanmeetCardiganColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setFanmeetCardiganHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setFanmeetCardiganHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setFanmeetCardiganHexError("");
  }

  function handleFanmeetCardiganHexBlur() {
    const normalized = normalizeHexColor(fanmeetCardiganHexInput);

    if (normalized) {
      applyFanmeetCardiganColor(normalized);
      return;
    }

    setFanmeetCardiganHexInput(character.fanmeetCardiganColor);
    setFanmeetCardiganHexError("");
  }

  function applyFanmeetInnerColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("fanmeetInnerColor", normalized);
    setFanmeetInnerHexInput(normalized);
    setFanmeetInnerHexError("");

    return true;
  }

  function handleFanmeetInnerHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setFanmeetInnerHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyFanmeetInnerColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setFanmeetInnerHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setFanmeetInnerHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setFanmeetInnerHexError("");
  }

  function handleFanmeetInnerHexBlur() {
    const normalized = normalizeHexColor(fanmeetInnerHexInput);

    if (normalized) {
      applyFanmeetInnerColor(normalized);
      return;
    }

    setFanmeetInnerHexInput(character.fanmeetInnerColor);
    setFanmeetInnerHexError("");
  }

  function applyFanmeetShortsColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("fanmeetShortsColor", normalized);
    setFanmeetShortsHexInput(normalized);
    setFanmeetShortsHexError("");

    return true;
  }

  function handleFanmeetShortsHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setFanmeetShortsHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyFanmeetShortsColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setFanmeetShortsHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setFanmeetShortsHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setFanmeetShortsHexError("");
  }

  function handleFanmeetShortsHexBlur() {
    const normalized = normalizeHexColor(fanmeetShortsHexInput);

    if (normalized) {
      applyFanmeetShortsColor(normalized);
      return;
    }

    setFanmeetShortsHexInput(character.fanmeetShortsColor);
    setFanmeetShortsHexError("");
  }

  function applyFanmeetSkirtColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("fanmeetSkirtColor", normalized);
    setFanmeetSkirtHexInput(normalized);
    setFanmeetSkirtHexError("");

    return true;
  }

  function handleFanmeetSkirtHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setFanmeetSkirtHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyFanmeetSkirtColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setFanmeetSkirtHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setFanmeetSkirtHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setFanmeetSkirtHexError("");
  }

  function handleFanmeetSkirtHexBlur() {
    const normalized = normalizeHexColor(fanmeetSkirtHexInput);

    if (normalized) {
      applyFanmeetSkirtColor(normalized);
      return;
    }

    setFanmeetSkirtHexInput(character.fanmeetSkirtColor);
    setFanmeetSkirtHexError("");
  }

  function applyBackgroundColor(value: string) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return false;
    }

    update("background", normalized);
    setBackgroundHexInput(normalized);
    setBackgroundHexError("");

    return true;
  }

  function handleBackgroundHexChange(value: string) {
    const upperValue = value.toUpperCase();
    setBackgroundHexInput(upperValue);

    const normalized = normalizeHexColor(upperValue);

    if (normalized) {
      applyBackgroundColor(normalized);
      return;
    }

    const hexBody = upperValue.startsWith("#")
      ? upperValue.slice(1)
      : upperValue;

    if (!/^[0-9A-F]*$/.test(hexBody)) {
      setBackgroundHexError("0-9와 A-F만 입력할 수 있습니다.");
      return;
    }

    if (hexBody.length > 6) {
      setBackgroundHexError("HEX 색상은 6자리로 입력해주세요.");
      return;
    }

    setBackgroundHexError("");
  }

  function handleBackgroundHexBlur() {
    const normalized = normalizeHexColor(backgroundHexInput);

    if (normalized) {
      applyBackgroundColor(normalized);
      return;
    }

    setBackgroundHexInput(character.background);
    setBackgroundHexError("");
  }

  function handleReset() {
    setCharacter(DEFAULT_CHARACTER);

    setSkinHexInput(DEFAULT_CHARACTER.skinColor);
    setSkinHexError("");

    setHairHexInput(DEFAULT_CHARACTER.hairColor);
    setHairHexError("");

    setOutfitHexInput(DEFAULT_CHARACTER.outfitColor);
    setOutfitHexError("");

    setBalletWearHexInput(DEFAULT_CHARACTER.balletWearColor);
    setBalletWearHexError("");

    setBalletShortsHexInput(DEFAULT_CHARACTER.balletShortsColor);
    setBalletShortsHexError("");

    setJacketHexInput(DEFAULT_CHARACTER.jacketColor);
    setJacketHexError("");

    setInnerHexInput(DEFAULT_CHARACTER.innerColor);
    setInnerHexError("");

    setBottomHexInput(DEFAULT_CHARACTER.bottomColor);
    setBottomHexError("");

    setMusicalJacketHexInput(DEFAULT_CHARACTER.musicalJacketColor);
    setMusicalJacketHexError("");

    setMusicalInnerHexInput(DEFAULT_CHARACTER.musicalInnerColor);
    setMusicalInnerHexError("");

    setMusicalShortsHexInput(DEFAULT_CHARACTER.musicalShortsColor);
    setMusicalShortsHexError("");

    setFestivalTopHexInput(DEFAULT_CHARACTER.festivalTopColor);
    setFestivalTopHexError("");

    setFestivalBottomHexInput(DEFAULT_CHARACTER.festivalBottomColor);
    setFestivalBottomHexError("");

    setFanmeetCardiganHexInput(DEFAULT_CHARACTER.fanmeetCardiganColor);
    setFanmeetCardiganHexError("");

    setFanmeetInnerHexInput(DEFAULT_CHARACTER.fanmeetInnerColor);
    setFanmeetInnerHexError("");

    setFanmeetShortsHexInput(DEFAULT_CHARACTER.fanmeetShortsColor);
    setFanmeetShortsHexError("");

    setFanmeetSkirtHexInput(DEFAULT_CHARACTER.fanmeetSkirtColor);
    setFanmeetSkirtHexError("");

    setBackgroundHexInput(DEFAULT_CHARACTER.background);
    setBackgroundHexError("");
  }

  function handleApply() {
    if (!normalizeHexColor(skinHexInput)) {
      setSkinHexError(
        "피부색을 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    if (!normalizeHexColor(hairHexInput)) {
      setHairHexError(
        "헤어 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    if (isBalletOutfit) {
      if (!normalizeHexColor(balletWearHexInput)) {
        setBalletWearHexError(
          "발레 의상 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
        );
        return;
      }

      if (!normalizeHexColor(balletShortsHexInput)) {
        setBalletShortsHexError(
          "하의 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
        );
        return;
      }
    }

    if (isConcertOutfit) {
      if (!normalizeHexColor(jacketHexInput)) {
        setJacketHexError(
          "재킷 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
        );
        return;
      }

      if (!normalizeHexColor(innerHexInput)) {
        setInnerHexError(
          "이너 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
        );
        return;
      }

      if (!normalizeHexColor(bottomHexInput)) {
        setBottomHexError(
          "하의 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
        );
        return;
      }
    }

    if (
      !isBalletOutfit &&
      !isConcertOutfit &&
      !isMusicalOutfit &&
      !isFestivalOutfit &&
      !isFanmeetOutfit &&
      !normalizeHexColor(outfitHexInput)
    ) {
      setOutfitHexError(
        "의상 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    if (
      isMusicalOutfit &&
      !normalizeHexColor(musicalJacketHexInput)
    ) {
      setMusicalJacketHexError(
        "자켓 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    if (
      isMusicalOutfit &&
      !normalizeHexColor(musicalInnerHexInput)
    ) {
      setMusicalInnerHexError(
        "이너 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    if (
      isMusicalOutfit &&
      !normalizeHexColor(musicalShortsHexInput)
    ) {
      setMusicalShortsHexError(
        "반바지 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    if (
      isFestivalOutfit &&
      !normalizeHexColor(festivalTopHexInput)
    ) {
      setFestivalTopHexError(
        "상의 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    if (
      isFestivalOutfit &&
      !normalizeHexColor(festivalBottomHexInput)
    ) {
      setFestivalBottomHexError(
        "하의 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    if (isFanmeetOutfit && !normalizeHexColor(fanmeetCardiganHexInput)) {
      setFanmeetCardiganHexError("카디건 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.");
      return;
    }

    if (isFanmeetOutfit && !normalizeHexColor(fanmeetInnerHexInput)) {
      setFanmeetInnerHexError("이너 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.");
      return;
    }

    if (isFanmeetOutfit && !normalizeHexColor(fanmeetShortsHexInput)) {
      setFanmeetShortsHexError("속바지 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.");
      return;
    }

    if (isFanmeetOutfit && !normalizeHexColor(fanmeetSkirtHexInput)) {
      setFanmeetSkirtHexError("스커트 컬러를 적용하려면 올바른 6자리 HEX 값을 입력해주세요.");
      return;
    }

    if (!normalizeHexColor(backgroundHexInput)) {
      setBackgroundHexError(
        "배경색을 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    const config = createCharacterConfig(character);
    const error = validateCharacterConfig(config, true);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(config));
    } catch {
      toast.error("캐릭터 설정을 저장하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    const returnTo = resolveAdminReturnTo(searchParams.get("returnTo"));
    navigate(returnTo);
  }

  function handleBack() {
    const returnTo = searchParams.get("returnTo");

    if (returnTo) {
      navigate(resolveAdminReturnTo(returnTo));
      return;
    }

    navigate(-1);
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-[1180px] space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <span className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold tracking-wider text-slate-300">
              3D CHARACTER CREATOR
            </span>

            <h1 className="mt-3 text-3xl font-bold">
              3D 캐릭터 제작소
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              귀여운 치비 스타일 캐릭터를 만들어보세요.
            </p>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
          >
            ← 돌아가기
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <CreatorSection title="피부색 선택">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {SKIN_TONE_PRESETS.map((skinTone) => (
                  <OptionCard
                    key={skinTone.value}
                    selected={character.skinTone === skinTone.value}
                    onClick={() =>
                      applySkinPreset(
                        skinTone.value,
                        skinTone.color,
                      )
                    }
                    ariaLabel={`${skinTone.label} 피부색 선택`}
                  >
                    <div
                      className="mx-auto h-10 w-full max-w-32 rounded-full"
                      style={{
                        backgroundColor: skinTone.color,
                      }}
                    />

                    <p className="mt-2 text-xs font-bold text-slate-800">
                      {skinTone.label}
                    </p>
                  </OptionCard>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      사용자 지정 피부색
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      컬러 피커 또는 6자리 HEX 코드로 직접 지정할 수 있습니다.
                    </p>
                  </div>

                  {isCustomSkinTone && (
                    <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
                      CUSTOM 선택됨
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[72px_1fr_150px]">
                  <div>
                    <label
                      htmlFor="custom-skin-color-picker"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      컬러 피커
                    </label>

                    <input
                      id="custom-skin-color-picker"
                      type="color"
                      value={character.skinColor}
                      onChange={(event) =>
                        applyCustomSkinColor(
                          event.target.value,
                        )
                      }
                      className="h-12 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                      aria-label="사용자 지정 피부색 선택"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom-skin-hex"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      HEX 색상 코드
                    </label>

                    <input
                      id="custom-skin-hex"
                      type="text"
                      value={skinHexInput}
                      onChange={(event) =>
                        handleSkinHexChange(
                          event.target.value,
                        )
                      }
                      onBlur={handleSkinHexBlur}
                      placeholder="#F7C6A8"
                      maxLength={7}
                      spellCheck={false}
                      aria-invalid={Boolean(skinHexError)}
                      aria-describedby="custom-skin-hex-help custom-skin-hex-error"
                      className={`h-12 w-full rounded-lg border bg-white px-3 font-mono text-sm uppercase outline-none transition ${
                        skinHexError
                          ? "border-red-500 focus:border-red-500"
                          : "border-slate-300 focus:border-primary"
                      }`}
                    />

                    <p
                      id="custom-skin-hex-help"
                      className="mt-1 text-[11px] text-slate-500"
                    >
                      # 없이 6자리만 입력해도 자동으로 적용됩니다.
                    </p>

                    {skinHexError && (
                      <p
                        id="custom-skin-hex-error"
                        className="mt-1 text-xs font-medium text-red-600"
                      >
                        {skinHexError}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-slate-700">
                      현재 적용 색상
                    </p>

                    <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
                      <span
                        className="h-7 w-7 shrink-0 rounded border border-slate-200"
                        style={{
                          backgroundColor:
                            character.skinColor,
                        }}
                      />

                      <code className="text-xs font-bold text-slate-700">
                        {character.skinColor.toUpperCase()}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </CreatorSection>

            <CreatorSection title="헤어스타일">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {HAIR_STYLES.map((hairStyle) => (
                  <OptionCard
                    key={hairStyle.value}
                    selected={
                      character.hairStyle === hairStyle.value
                    }
                    onClick={() =>
                      update("hairStyle", hairStyle.value)
                    }
                  >
                    <div className="text-2xl">
                      {hairStyle.icon}
                    </div>

                    <p className="mt-2 text-xs font-bold text-slate-800">
                      {hairStyle.label}
                    </p>
                  </OptionCard>
                ))}
              </div>

              <p className="mt-5 text-sm font-bold text-slate-800">
                헤어 컬러
              </p>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {HAIR_COLORS.map((color) => (
                  <ColorButton
                    key={color}
                    color={color}
                    selected={isSameHexColor(
                      character.hairColor,
                      color,
                    )}
                    onClick={() => applyHairColor(color)}
                  />
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      사용자 지정 헤어 컬러
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      컬러 피커 또는 6자리 HEX 코드로 직접 지정할 수 있습니다.
                    </p>
                  </div>

                  {isCustomHairColor && (
                    <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
                      CUSTOM 선택됨
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[72px_1fr_150px]">
                  <div>
                    <label
                      htmlFor="custom-hair-color-picker"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      컬러 피커
                    </label>

                    <input
                      id="custom-hair-color-picker"
                      type="color"
                      value={character.hairColor}
                      onChange={(event) =>
                        applyHairColor(event.target.value)
                      }
                      className="h-12 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                      aria-label="사용자 지정 헤어 컬러 선택"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom-hair-hex"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      HEX 색상 코드
                    </label>

                    <input
                      id="custom-hair-hex"
                      type="text"
                      value={hairHexInput}
                      onChange={(event) =>
                        handleHairHexChange(
                          event.target.value,
                        )
                      }
                      onBlur={handleHairHexBlur}
                      placeholder="#151515"
                      maxLength={7}
                      spellCheck={false}
                      aria-invalid={Boolean(hairHexError)}
                      aria-describedby="custom-hair-hex-help custom-hair-hex-error"
                      className={`h-12 w-full rounded-lg border bg-white px-3 font-mono text-sm uppercase outline-none transition ${
                        hairHexError
                          ? "border-red-500 focus:border-red-500"
                          : "border-slate-300 focus:border-primary"
                      }`}
                    />

                    <p
                      id="custom-hair-hex-help"
                      className="mt-1 text-[11px] text-slate-500"
                    >
                      # 없이 6자리만 입력해도 자동으로 적용됩니다.
                    </p>

                    {hairHexError && (
                      <p
                        id="custom-hair-hex-error"
                        className="mt-1 text-xs font-medium text-red-600"
                      >
                        {hairHexError}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-slate-700">
                      현재 적용 색상
                    </p>

                    <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
                      <span
                        className="h-7 w-7 shrink-0 rounded border border-slate-200"
                        style={{
                          backgroundColor:
                            character.hairColor,
                        }}
                      />

                      <code className="text-xs font-bold text-slate-700">
                        {character.hairColor.toUpperCase()}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </CreatorSection>

            <CreatorSection title="눈 모양">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                {EYE_STYLES.map((eyeStyle) => (
                  <OptionCard
                    key={eyeStyle.value}
                    selected={character.eyeStyle === eyeStyle.value}
                    onClick={() => update("eyeStyle", eyeStyle.value)}
                  >
                    <div className="text-2xl font-bold text-slate-800">
                      {eyeStyle.icon}
                    </div>

                    <p className="mt-2 text-xs font-bold text-slate-800">
                      {eyeStyle.label}
                    </p>
                  </OptionCard>
                ))}
              </div>
            </CreatorSection>

            <CreatorSection title="입 모양">
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  {MOUTH_OPTIONS.map((mouth) => (
                    <OptionCard
                      key={mouth.value}
                      selected={character.mouthStyle === mouth.value}
                      onClick={() => update("mouthStyle", mouth.value)}
                    >
                      <div
                        className="text-2xl font-bold text-slate-800"
                        aria-hidden="true"
                      >
                        {mouth.icon}
                      </div>

                      <p className="mt-2 text-xs font-bold text-slate-800">
                        {mouth.label}
                      </p>
                    </OptionCard>
                  ))}
                </div>
            </CreatorSection>

            <CreatorSection title="의상 선택">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {OUTFIT_OPTIONS.map((outfit) => (
                  <OptionCard
                    key={outfit.id}
                    selected={
                      character.outfitModelId === outfit.id
                    }
                    onClick={() => selectOutfit(outfit.id)}
                  >
                    <div className="flex items-start gap-3 text-left">
                      <span className="text-2xl">
                        {outfit.icon}
                      </span>

                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {outfit.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {outfit.description}
                        </p>
                      </div>
                    </div>
                  </OptionCard>
                ))}
              </div>

              {isBalletOutfit ? (
                <div className="mt-5 space-y-6">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      발레 의상 컬러
                    </p>

                    <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
                      {OUTFIT_COLORS.map((color) => (
                        <ColorButton
                          key={color}
                          color={color}
                          selected={isSameHexColor(
                            character.balletWearColor,
                            color,
                          )}
                          onClick={() =>
                            applyBalletWearColor(
                              color,
                            )
                          }
                        />
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">
                            사용자 지정 발레 의상 컬러
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            컬러 피커 또는 6자리 HEX 코드로 직접 지정할 수 있습니다.
                          </p>
                        </div>

                        {isCustomBalletWearColor && (
                          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
                            CUSTOM 선택됨
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-[72px_1fr_150px]">
                        <div>
                          <label
                            htmlFor="custom-ballet-wear-color-picker"
                            className="mb-2 block text-xs font-bold text-slate-700"
                          >
                            컬러 피커
                          </label>

                          <input
                            id="custom-ballet-wear-color-picker"
                            type="color"
                            value={
                              character.balletWearColor
                            }
                            onChange={(event) =>
                              applyBalletWearColor(
                                event.target.value,
                              )
                            }
                            className="h-12 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                            aria-label="사용자 지정 발레 의상 컬러 선택"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="custom-ballet-wear-hex"
                            className="mb-2 block text-xs font-bold text-slate-700"
                          >
                            HEX 색상 코드
                          </label>

                          <input
                            id="custom-ballet-wear-hex"
                            type="text"
                            value={
                              balletWearHexInput
                            }
                            onChange={(event) =>
                              handleBalletWearHexChange(
                                event.target.value,
                              )
                            }
                            onBlur={
                              handleBalletWearHexBlur
                            }
                            placeholder="#60A5FA"
                            maxLength={7}
                            spellCheck={false}
                            aria-invalid={Boolean(
                              balletWearHexError,
                            )}
                            aria-describedby="custom-ballet-wear-hex-help custom-ballet-wear-hex-error"
                            className={`h-12 w-full rounded-lg border bg-white px-3 font-mono text-sm uppercase outline-none transition ${
                              balletWearHexError
                                ? "border-red-500 focus:border-red-500"
                                : "border-slate-300 focus:border-primary"
                            }`}
                          />

                          <p
                            id="custom-ballet-wear-hex-help"
                            className="mt-1 text-[11px] text-slate-500"
                          >
                            # 없이 6자리만 입력해도 자동으로 적용됩니다.
                          </p>

                          {balletWearHexError && (
                            <p
                              id="custom-ballet-wear-hex-error"
                              className="mt-1 text-xs font-medium text-red-600"
                            >
                              {
                                balletWearHexError
                              }
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-bold text-slate-700">
                            현재 적용 색상
                          </p>

                          <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
                            <span
                              className="h-7 w-7 shrink-0 rounded border border-slate-200"
                              style={{
                                backgroundColor:
                                  character.balletWearColor,
                              }}
                            />

                            <code className="text-xs font-bold text-slate-700">
                              {character.balletWearColor.toUpperCase()}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      하의 컬러
                    </p>

                    <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
                      {OUTFIT_COLORS.map((color) => (
                        <ColorButton
                          key={color}
                          color={color}
                          selected={isSameHexColor(
                            character.balletShortsColor,
                            color,
                          )}
                          onClick={() =>
                            applyBalletShortsColor(
                              color,
                            )
                          }
                        />
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">
                            사용자 지정 하의 컬러
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            컬러 피커 또는 6자리 HEX 코드로 직접 지정할 수 있습니다.
                          </p>
                        </div>

                        {isCustomBalletShortsColor && (
                          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
                            CUSTOM 선택됨
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-[72px_1fr_150px]">
                        <div>
                          <label
                            htmlFor="custom-ballet-shorts-color-picker"
                            className="mb-2 block text-xs font-bold text-slate-700"
                          >
                            컬러 피커
                          </label>

                          <input
                            id="custom-ballet-shorts-color-picker"
                            type="color"
                            value={
                              character.balletShortsColor
                            }
                            onChange={(event) =>
                              applyBalletShortsColor(
                                event.target.value,
                              )
                            }
                            className="h-12 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                            aria-label="사용자 지정 하의 컬러 선택"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="custom-ballet-shorts-hex"
                            className="mb-2 block text-xs font-bold text-slate-700"
                          >
                            HEX 색상 코드
                          </label>

                          <input
                            id="custom-ballet-shorts-hex"
                            type="text"
                            value={
                              balletShortsHexInput
                            }
                            onChange={(event) =>
                              handleBalletShortsHexChange(
                                event.target.value,
                              )
                            }
                            onBlur={
                              handleBalletShortsHexBlur
                            }
                            placeholder="#60A5FA"
                            maxLength={7}
                            spellCheck={false}
                            aria-invalid={Boolean(
                              balletShortsHexError,
                            )}
                            aria-describedby="custom-ballet-shorts-hex-help custom-ballet-shorts-hex-error"
                            className={`h-12 w-full rounded-lg border bg-white px-3 font-mono text-sm uppercase outline-none transition ${
                              balletShortsHexError
                                ? "border-red-500 focus:border-red-500"
                                : "border-slate-300 focus:border-primary"
                            }`}
                          />

                          <p
                            id="custom-ballet-shorts-hex-help"
                            className="mt-1 text-[11px] text-slate-500"
                          >
                            # 없이 6자리만 입력해도 자동으로 적용됩니다.
                          </p>

                          {balletShortsHexError && (
                            <p
                              id="custom-ballet-shorts-hex-error"
                              className="mt-1 text-xs font-medium text-red-600"
                            >
                              {
                                balletShortsHexError
                              }
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-bold text-slate-700">
                            현재 적용 색상
                          </p>

                          <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
                            <span
                              className="h-7 w-7 shrink-0 rounded border border-slate-200"
                              style={{
                                backgroundColor:
                                  character.balletShortsColor,
                              }}
                            />

                            <code className="text-xs font-bold text-slate-700">
                              {character.balletShortsColor.toUpperCase()}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isConcertOutfit ? (
                <div className="mt-5 space-y-5">
                  <OutfitColorCustomizer
                    idPrefix="concert-jacket"
                    title="재킷 컬러"
                    customTitle="사용자 지정 재킷 컬러"
                    value={character.jacketColor}
                    hexInput={jacketHexInput}
                    hexError={jacketHexError}
                    onApplyColor={applyJacketColor}
                    onHexChange={handleJacketHexChange}
                    onHexBlur={handleJacketHexBlur}
                  />

                  <OutfitColorCustomizer
                    idPrefix="concert-inner"
                    title="이너 컬러"
                    customTitle="사용자 지정 이너 컬러"
                    value={character.innerColor}
                    hexInput={innerHexInput}
                    hexError={innerHexError}
                    onApplyColor={applyInnerColor}
                    onHexChange={handleInnerHexChange}
                    onHexBlur={handleInnerHexBlur}
                  />

                  <OutfitColorCustomizer
                    idPrefix="concert-bottom"
                    title="하의 컬러"
                    customTitle="사용자 지정 하의 컬러"
                    value={character.bottomColor}
                    hexInput={bottomHexInput}
                    hexError={bottomHexError}
                    onApplyColor={applyBottomColor}
                    onHexChange={handleBottomHexChange}
                    onHexBlur={handleBottomHexBlur}
                  />
                </div>
              ) : isMusicalOutfit ? (
                <>
                  <OutfitColorControl
                    title="자켓 컬러"
                    customTitle="사용자 지정 자켓 컬러"
                    idPrefix="musical-jacket"
                    currentColor={character.musicalJacketColor}
                    hexInput={musicalJacketHexInput}
                    hexError={musicalJacketHexError}
                    presets={MUSICAL_JACKET_COLORS}
                    isCustom={isCustomMusicalJacketColor}
                    placeholder={DEFAULT_MUSICAL_JACKET_COLOR}
                    onPresetClick={applyMusicalJacketColor}
                    onColorPickerChange={applyMusicalJacketColor}
                    onHexChange={handleMusicalJacketHexChange}
                    onHexBlur={handleMusicalJacketHexBlur}
                  />

                  <OutfitColorControl
                    title="이너 컬러"
                    customTitle="사용자 지정 이너 컬러"
                    idPrefix="musical-inner"
                    currentColor={character.musicalInnerColor}
                    hexInput={musicalInnerHexInput}
                    hexError={musicalInnerHexError}
                    presets={MUSICAL_INNER_COLORS}
                    isCustom={isCustomMusicalInnerColor}
                    placeholder={DEFAULT_MUSICAL_INNER_COLOR}
                    onPresetClick={applyMusicalInnerColor}
                    onColorPickerChange={applyMusicalInnerColor}
                    onHexChange={handleMusicalInnerHexChange}
                    onHexBlur={handleMusicalInnerHexBlur}
                  />

                  <OutfitColorControl
                    title="반바지 컬러"
                    customTitle="사용자 지정 반바지 컬러"
                    idPrefix="musical-shorts"
                    currentColor={character.musicalShortsColor}
                    hexInput={musicalShortsHexInput}
                    hexError={musicalShortsHexError}
                    presets={MUSICAL_SHORTS_COLORS}
                    isCustom={isCustomMusicalShortsColor}
                    placeholder={DEFAULT_MUSICAL_SHORTS_COLOR}
                    onPresetClick={applyMusicalShortsColor}
                    onColorPickerChange={applyMusicalShortsColor}
                    onHexChange={handleMusicalShortsHexChange}
                    onHexBlur={handleMusicalShortsHexBlur}
                  />
                </>
              ) : isFanmeetOutfit ? (
                <>
                  <OutfitColorControl
                    title="카디건 컬러"
                    customTitle="사용자 지정 카디건 컬러"
                    idPrefix="fanmeet-cardigan"
                    currentColor={character.fanmeetCardiganColor}
                    hexInput={fanmeetCardiganHexInput}
                    hexError={fanmeetCardiganHexError}
                    presets={FANMEET_CARDIGAN_COLORS}
                    isCustom={!FANMEET_CARDIGAN_COLORS.some((color) => isSameHexColor(color, character.fanmeetCardiganColor))}
                    placeholder={DEFAULT_FANMEET_CARDIGAN_COLOR}
                    onPresetClick={applyFanmeetCardiganColor}
                    onColorPickerChange={applyFanmeetCardiganColor}
                    onHexChange={handleFanmeetCardiganHexChange}
                    onHexBlur={handleFanmeetCardiganHexBlur}
                  />
                  <OutfitColorControl
                    title="이너 컬러"
                    customTitle="사용자 지정 이너 컬러"
                    idPrefix="fanmeet-inner"
                    currentColor={character.fanmeetInnerColor}
                    hexInput={fanmeetInnerHexInput}
                    hexError={fanmeetInnerHexError}
                    presets={FANMEET_INNER_COLORS}
                    isCustom={!FANMEET_INNER_COLORS.some((color) => isSameHexColor(color, character.fanmeetInnerColor))}
                    placeholder={DEFAULT_FANMEET_INNER_COLOR}
                    onPresetClick={applyFanmeetInnerColor}
                    onColorPickerChange={applyFanmeetInnerColor}
                    onHexChange={handleFanmeetInnerHexChange}
                    onHexBlur={handleFanmeetInnerHexBlur}
                  />
                  <OutfitColorControl
                    title="속바지 컬러"
                    customTitle="사용자 지정 속바지 컬러"
                    idPrefix="fanmeet-shorts"
                    currentColor={character.fanmeetShortsColor}
                    hexInput={fanmeetShortsHexInput}
                    hexError={fanmeetShortsHexError}
                    presets={FANMEET_SHORTS_COLORS}
                    isCustom={!FANMEET_SHORTS_COLORS.some((color) => isSameHexColor(color, character.fanmeetShortsColor))}
                    placeholder={DEFAULT_FANMEET_SHORTS_COLOR}
                    onPresetClick={applyFanmeetShortsColor}
                    onColorPickerChange={applyFanmeetShortsColor}
                    onHexChange={handleFanmeetShortsHexChange}
                    onHexBlur={handleFanmeetShortsHexBlur}
                  />
                  <OutfitColorControl
                    title="스커트 컬러"
                    customTitle="사용자 지정 스커트 컬러"
                    idPrefix="fanmeet-skirt"
                    currentColor={character.fanmeetSkirtColor}
                    hexInput={fanmeetSkirtHexInput}
                    hexError={fanmeetSkirtHexError}
                    presets={FANMEET_SKIRT_COLORS}
                    isCustom={!FANMEET_SKIRT_COLORS.some((color) => isSameHexColor(color, character.fanmeetSkirtColor))}
                    placeholder={DEFAULT_FANMEET_SKIRT_COLOR}
                    onPresetClick={applyFanmeetSkirtColor}
                    onColorPickerChange={applyFanmeetSkirtColor}
                    onHexChange={handleFanmeetSkirtHexChange}
                    onHexBlur={handleFanmeetSkirtHexBlur}
                  />
                </>
              ) : isFestivalOutfit ? (
                <>
                  <OutfitColorControl
                    title="상의 컬러"
                    customTitle="사용자 지정 상의 컬러"
                    idPrefix="festival-top"
                    currentColor={character.festivalTopColor}
                    hexInput={festivalTopHexInput}
                    hexError={festivalTopHexError}
                    presets={FESTIVAL_TOP_COLORS}
                    isCustom={isCustomFestivalTopColor}
                    placeholder={DEFAULT_FESTIVAL_TOP_COLOR}
                    onPresetClick={applyFestivalTopColor}
                    onColorPickerChange={applyFestivalTopColor}
                    onHexChange={handleFestivalTopHexChange}
                    onHexBlur={handleFestivalTopHexBlur}
                  />

                  <OutfitColorControl
                    title="하의 컬러"
                    customTitle="사용자 지정 하의 컬러"
                    idPrefix="festival-bottom"
                    currentColor={
                      character.festivalBottomColor
                    }
                    hexInput={festivalBottomHexInput}
                    hexError={festivalBottomHexError}
                    presets={FESTIVAL_BOTTOM_COLORS}
                    isCustom={isCustomFestivalBottomColor}
                    placeholder={DEFAULT_FESTIVAL_BOTTOM_COLOR}
                    onPresetClick={applyFestivalBottomColor}
                    onColorPickerChange={
                      applyFestivalBottomColor
                    }
                    onHexChange={
                      handleFestivalBottomHexChange
                    }
                    onHexBlur={handleFestivalBottomHexBlur}
                  />
                </>
              ) : (
                <OutfitColorControl
                  title="의상 컬러"
                  customTitle="사용자 지정 의상 컬러"
                  idPrefix="outfit"
                  currentColor={character.outfitColor}
                  hexInput={outfitHexInput}
                  hexError={outfitHexError}
                  presets={OUTFIT_COLORS}
                  isCustom={isCustomOutfitColor}
                  placeholder="#60A5FA"
                  onPresetClick={applyOutfitColor}
                  onColorPickerChange={applyOutfitColor}
                  onHexChange={handleOutfitHexChange}
                  onHexBlur={handleOutfitHexBlur}
                />
              )}
            </CreatorSection>

            <CreatorSection title="액세서리">
              <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
                {ACCESSORIES.map((accessory) => (
                  <OptionCard
                    key={accessory.value}
                    selected={
                      character.accessory ===
                      accessory.value
                    }
                    onClick={() =>
                      update(
                        "accessory",
                        accessory.value,
                      )
                    }
                  >
                    <div className="text-2xl">
                      {accessory.icon}
                    </div>

                    <p className="mt-2 text-xs font-bold text-slate-800">
                      {accessory.label}
                    </p>
                  </OptionCard>
                ))}
              </div>
            </CreatorSection>

            <CreatorSection title="포즈">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {POSES.map((pose) => (
                  <OptionCard
                    key={pose.value}
                    selected={character.pose === pose.value}
                    onClick={() =>
                      update("pose", pose.value)
                    }
                  >
                    <div className="text-2xl">
                      {pose.icon}
                    </div>

                    <p className="mt-2 text-xs font-bold text-slate-800">
                      {pose.label}
                    </p>
                  </OptionCard>
                ))}
              </div>
            </CreatorSection>

            <CreatorSection title="배경 강조 색상">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
                {BACKGROUNDS.map((background) => (
                  <OptionCard
                    key={background.id}
                    selected={isSameHexColor(
                      character.background,
                      background.color,
                    )}
                    onClick={() =>
                      applyBackgroundColor(
                        background.color,
                      )
                    }
                    ariaLabel={`${background.label} 배경 선택`}
                  >
                    <div
                      className="mx-auto h-10 w-16 rounded border border-slate-200"
                      style={{
                        backgroundColor:
                          background.color,
                      }}
                    />

                    <p className="mt-2 text-xs font-bold text-slate-800">
                      {background.label}
                    </p>
                  </OptionCard>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      사용자 지정 배경색
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      컬러 피커 또는 6자리 HEX 코드로 직접 지정할 수 있습니다.
                    </p>
                  </div>

                  {isCustomBackground && (
                    <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
                      CUSTOM 선택됨
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[72px_1fr_150px]">
                  <div>
                    <label
                      htmlFor="custom-background-color-picker"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      컬러 피커
                    </label>

                    <input
                      id="custom-background-color-picker"
                      type="color"
                      value={character.background}
                      onChange={(event) =>
                        applyBackgroundColor(
                          event.target.value,
                        )
                      }
                      className="h-12 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                      aria-label="사용자 지정 배경색 선택"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom-background-hex"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      HEX 색상 코드
                    </label>

                    <input
                      id="custom-background-hex"
                      type="text"
                      value={backgroundHexInput}
                      onChange={(event) =>
                        handleBackgroundHexChange(
                          event.target.value,
                        )
                      }
                      onBlur={handleBackgroundHexBlur}
                      placeholder="#E9DDFF"
                      maxLength={7}
                      spellCheck={false}
                      aria-invalid={Boolean(
                        backgroundHexError,
                      )}
                      aria-describedby="custom-background-hex-help custom-background-hex-error"
                      className={`h-12 w-full rounded-lg border bg-white px-3 font-mono text-sm uppercase outline-none transition ${
                        backgroundHexError
                          ? "border-red-500 focus:border-red-500"
                          : "border-slate-300 focus:border-primary"
                      }`}
                    />

                    <p
                      id="custom-background-hex-help"
                      className="mt-1 text-[11px] text-slate-500"
                    >
                      # 없이 6자리만 입력해도 자동으로 적용됩니다.
                    </p>

                    {backgroundHexError && (
                      <p
                        id="custom-background-hex-error"
                        className="mt-1 text-xs font-medium text-red-600"
                      >
                        {backgroundHexError}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-slate-700">
                      현재 적용 색상
                    </p>

                    <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
                      <span
                        className="h-7 w-7 shrink-0 rounded border border-slate-200"
                        style={{
                          backgroundColor:
                            character.background,
                        }}
                      />

                      <code className="text-xs font-bold text-slate-700">
                        {character.background.toUpperCase()}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </CreatorSection>
          </div>

          <aside className="h-fit rounded-xl bg-white p-5 text-slate-900 lg:sticky lg:top-6">
            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
              PREVIEW
            </span>

            <h2 className="mt-4 text-sm font-bold">
              미리보기
            </h2>

            <div
              className="mt-4 h-72 overflow-hidden rounded-lg border border-slate-200"
              style={{
                backgroundColor: character.background,
              }}
            >
              <CharacterModelViewer
                modelUrl="/models/chibi-base.glb"
                skinColor={character.skinColor}
                hairColor={character.hairColor}
                outfitColor={character.outfitColor}
                balletWearColor={character.balletWearColor}
                balletShortsColor={character.balletShortsColor}
                jacketColor={character.jacketColor}
                innerColor={character.innerColor}
                bottomColor={character.bottomColor}
                musicalJacketColor={character.musicalJacketColor}
                musicalInnerColor={character.musicalInnerColor}
                musicalShortsColor={character.musicalShortsColor}
                festivalTopColor={
                  character.festivalTopColor
                }
                festivalBottomColor={
                  character.festivalBottomColor
                }
                fanmeetCardiganColor={character.fanmeetCardiganColor}
                fanmeetInnerColor={character.fanmeetInnerColor}
                fanmeetShortsColor={character.fanmeetShortsColor}
                fanmeetSkirtColor={character.fanmeetSkirtColor}
                outfitName={character.outfitName}
                outfitModelId={character.outfitModelId}
                hairStyle={character.hairStyle}
                eyeStyle={character.eyeStyle}
                mouthStyle={character.mouthStyle}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-4 text-xs text-slate-600">
              <p>피부: {character.skinTone}</p>
              <p>
                피부색:{" "}
                {character.skinColor.toUpperCase()}
              </p>
              <p>헤어: {character.hairStyle}</p>
              <p>입: {MOUTH_STYLE_LABELS[character.mouthStyle]}</p>
              <p>눈: {character.eyeStyle}</p>
              <p>
                헤어 컬러:{" "}
                {character.hairColor.toUpperCase()}
              </p>
              <p>의상: {character.outfitName}</p>

              {isBalletOutfit ? (
                <>
                  <p>
                    발레 의상:{" "}
                    {character.balletWearColor.toUpperCase()}
                  </p>

                  <p>
                    하의:{" "}
                    {character.balletShortsColor.toUpperCase()}
                  </p>
                </>
              ) : isConcertOutfit ? (
                <>
                  <p>
                    재킷: {character.jacketColor.toUpperCase()}
                  </p>
                  <p>
                    이너: {character.innerColor.toUpperCase()}
                  </p>
                  <p>
                    하의: {character.bottomColor.toUpperCase()}
                  </p>
                </>
              ) : isMusicalOutfit ? (
                <>
                  <p>
                    자켓: {character.musicalJacketColor.toUpperCase()}
                  </p>
                  <p>
                    이너: {character.musicalInnerColor.toUpperCase()}
                  </p>
                  <p>
                    반바지: {character.musicalShortsColor.toUpperCase()}
                  </p>
                </>
              ) : isFanmeetOutfit ? (
                <>
                  <p>카디건: {character.fanmeetCardiganColor.toUpperCase()}</p>
                  <p>이너: {character.fanmeetInnerColor.toUpperCase()}</p>
                  <p>속바지: {character.fanmeetShortsColor.toUpperCase()}</p>
                  <p>스커트: {character.fanmeetSkirtColor.toUpperCase()}</p>
                </>
              ) : isFestivalOutfit ? (
                <>
                  <p>
                    상의 컬러:{" "}
                    {character.festivalTopColor.toUpperCase()}
                  </p>
                  <p>
                    하의 컬러:{" "}
                    {character.festivalBottomColor.toUpperCase()}
                  </p>
                </>
              ) : (
                <p>
                  의상 컬러:{" "}
                  {character.outfitColor.toUpperCase()}
                </p>
              )}

              <p>액세서리: {character.accessory}</p>
              <p>포즈: {character.pose}</p>
              <p>
                배경:{" "}
                {character.background.toUpperCase()}
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mt-4 h-10 w-full rounded-lg border border-slate-300 text-sm font-bold"
            >
              초기화
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="mt-3 h-11 w-full rounded-lg bg-primary text-sm font-bold text-white"
            >
              ✓ 캐릭터 제작값 적용
            </button>

            <div className="mt-4 rounded-lg border border-blue-300 bg-blue-50 p-3 text-xs text-blue-700">
              적용 버튼을 누르면 공연 등록 화면으로 돌아가고, 선택한
              캐릭터 설정이 임시 저장됩니다.
            </div>
          </aside>
        </div>

        <p className="text-center text-xs text-slate-700">
          [3D Character Creator - Chibi style customization tool]
        </p>
      </div>
    </main>
  );
}

function CreatorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-5 text-slate-900">
      <h2 className="mb-4 text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

function OutfitColorCustomizer({
  idPrefix,
  title,
  customTitle,
  value,
  hexInput,
  hexError,
  onApplyColor,
  onHexChange,
  onHexBlur,
}: OutfitColorCustomizerProps) {
  const selectedPreset = OUTFIT_COLORS.find((color) =>
    isSameHexColor(color, value),
  );

  const isCustomColor = !selectedPreset;

  return (
    <div>
      <p className="text-sm font-bold text-slate-800">
        {title}
      </p>

      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {OUTFIT_COLORS.map((color) => (
          <ColorButton
            key={color}
            color={color}
            selected={isSameHexColor(value, color)}
            onClick={() => onApplyColor(color)}
          />
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {customTitle}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              컬러 피커 또는 6자리 HEX 코드로 직접 지정할 수
              있습니다.
            </p>
          </div>

          {isCustomColor && (
            <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
              CUSTOM 선택됨
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[72px_1fr_150px]">
          <div>
            <label
              htmlFor={`${idPrefix}-color-picker`}
              className="mb-2 block text-xs font-bold text-slate-700"
            >
              컬러 피커
            </label>

            <input
              id={`${idPrefix}-color-picker`}
              type="color"
              value={value}
              onChange={(event) =>
                onApplyColor(event.target.value)
              }
              className="h-12 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
              aria-label={`${title} 사용자 지정 색상 선택`}
            />
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-hex`}
              className="mb-2 block text-xs font-bold text-slate-700"
            >
              HEX 색상 코드
            </label>

            <input
              id={`${idPrefix}-hex`}
              type="text"
              value={hexInput}
              onChange={(event) =>
                onHexChange(event.target.value)
              }
              onBlur={onHexBlur}
              placeholder="#60A5FA"
              maxLength={7}
              spellCheck={false}
              aria-invalid={Boolean(hexError)}
              aria-describedby={`${idPrefix}-hex-help ${idPrefix}-hex-error`}
              className={`h-12 w-full rounded-lg border bg-white px-3 font-mono text-sm uppercase outline-none transition ${
                hexError
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-300 focus:border-primary"
              }`}
            />

            <p
              id={`${idPrefix}-hex-help`}
              className="mt-1 text-[11px] text-slate-500"
            >
              # 없이 6자리만 입력해도 자동으로 적용됩니다.
            </p>

            {hexError && (
              <p
                id={`${idPrefix}-hex-error`}
                className="mt-1 text-xs font-medium text-red-600"
              >
                {hexError}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-700">
              현재 적용 색상
            </p>

            <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
              <span
                className="h-7 w-7 shrink-0 rounded border border-slate-200"
                style={{
                  backgroundColor: value,
                }}
              />

              <code className="text-xs font-bold text-slate-700">
                {value.toUpperCase()}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutfitColorControl({
  title,
  customTitle,
  idPrefix,
  currentColor,
  hexInput,
  hexError,
  presets,
  isCustom,
  placeholder,
  onPresetClick,
  onColorPickerChange,
  onHexChange,
  onHexBlur,
}: {
  title: string;
  customTitle: string;
  idPrefix: string;
  currentColor: string;
  hexInput: string;
  hexError: string;
  presets: string[];
  isCustom: boolean;
  placeholder: string;
  onPresetClick: (color: string) => unknown;
  onColorPickerChange: (color: string) => unknown;
  onHexChange: (value: string) => void;
  onHexBlur: () => void;
}) {
  const pickerId = `${idPrefix}-color-picker`;
  const hexId = `${idPrefix}-hex`;
  const helpId = `${idPrefix}-hex-help`;
  const errorId = `${idPrefix}-hex-error`;

  return (
    <div className="mt-5">
      <p className="text-sm font-bold text-slate-800">
        {title}
      </p>

      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {presets.map((color) => (
          <ColorButton
            key={color}
            color={color}
            selected={isSameHexColor(
              currentColor,
              color,
            )}
            onClick={() => onPresetClick(color)}
          />
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {customTitle}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              컬러 피커 또는 6자리 HEX 코드로 직접 지정할 수 있습니다.
            </p>
          </div>

          {isCustom && (
            <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
              CUSTOM 선택됨
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[72px_1fr_150px]">
          <div>
            <label
              htmlFor={pickerId}
              className="mb-2 block text-xs font-bold text-slate-700"
            >
              컬러 피커
            </label>

            <input
              id={pickerId}
              type="color"
              value={currentColor}
              onChange={(event) =>
                onColorPickerChange(event.target.value)
              }
              className="h-12 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
              aria-label={`${title} 사용자 지정 컬러 선택`}
            />
          </div>

          <div>
            <label
              htmlFor={hexId}
              className="mb-2 block text-xs font-bold text-slate-700"
            >
              HEX 색상 코드
            </label>

            <input
              id={hexId}
              type="text"
              value={hexInput}
              onChange={(event) =>
                onHexChange(event.target.value)
              }
              onBlur={onHexBlur}
              placeholder={placeholder}
              maxLength={7}
              spellCheck={false}
              aria-invalid={Boolean(hexError)}
              aria-describedby={`${helpId} ${errorId}`}
              className={`h-12 w-full rounded-lg border bg-white px-3 font-mono text-sm uppercase outline-none transition ${
                hexError
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-300 focus:border-primary"
              }`}
            />

            <p
              id={helpId}
              className="mt-1 text-[11px] text-slate-500"
            >
              # 없이 6자리만 입력해도 자동으로 적용됩니다.
            </p>

            {hexError && (
              <p
                id={errorId}
                className="mt-1 text-xs font-medium text-red-600"
              >
                {hexError}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-700">
              현재 적용 색상
            </p>

            <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
              <span
                className="h-7 w-7 shrink-0 rounded border border-slate-200"
                style={{
                  backgroundColor: currentColor,
                }}
              />

              <code className="text-xs font-bold text-slate-700">
                {currentColor.toUpperCase()}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  children,
  ariaLabel,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={`rounded-lg border bg-white p-3 text-center transition ${
        selected
          ? "border-slate-900 shadow-sm ring-1 ring-slate-900"
          : "border-slate-200 hover:border-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

function ColorButton({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${color} 색상 선택`}
      aria-pressed={selected}
      onClick={onClick}
      className={`h-12 rounded-lg border transition ${
        selected
          ? "border-slate-900 ring-2 ring-slate-900"
          : "border-slate-200"
      }`}
      style={{
        backgroundColor: color,
      }}
    />
  );
}
