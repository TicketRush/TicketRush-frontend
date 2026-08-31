import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CharacterModelViewer from "@/components/admin/character/CharacterModelViewer";
import {
  DEFAULT_SKIN_COLOR,
  DEFAULT_SKIN_TONE,
  SKIN_TONE_PRESETS,
  findSkinTonePresetByColor,
  normalizeHexColor,
  resolveStoredSkinTone,
  type SkinToneSelection,
} from "@/components/admin/character/characterSkin";

type HairStyle = "short" | "long" | "bun" | "ponytail" | "wave" | "rainbow";
type Pose = "standing" | "wave" | "heart" | "dance" | "sing";

interface CharacterConfig {
  skinTone: SkinToneSelection;
  skinColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  outfitName: string;
  outfitColor: string;
  accessory: string;
  pose: Pose;
  background: string;
}

interface BackgroundPreset {
  id: string;
  label: string;
  color: string;
}

const CHARACTER_STORAGE_KEY = "ticketRush:admin-character";
const DEFAULT_RETURN_TO = "/admin/concerts/new";

const HAIR_STYLES: { value: HairStyle; label: string; icon: string }[] = [
  { value: "short", label: "숏컷", icon: "👱" },
  { value: "long", label: "단발", icon: "👩" },
  { value: "bun", label: "양갈래", icon: "👧" },
  { value: "ponytail", label: "포니테일", icon: "🎀" },
  { value: "wave", label: "웨이브", icon: "🌀" },
  { value: "rainbow", label: "무지개", icon: "🌈" },
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

const OUTFITS = [
  { name: "무지개 블라우스", description: "가벼운 공연 의상", icon: "👗" },
  {
    name: "마이크 콘서트",
    description: "K-POP 콘서트 대표룩",
    icon: "🎤",
  },
  { name: "클래식 공연", description: "포멀한 공연 의상", icon: "🎻" },
  { name: "DJ / 페스티벌", description: "EDM 페스티벌룩", icon: "🎸" },
  { name: "발레 / 무용 공연", description: "무용 공연 의상", icon: "🩰" },
  { name: "연극 / 극장", description: "무대 의상", icon: "🎩" },
];

const OUTFIT_COLORS = [
  "#ffd60a",
  "#ffafcc",
  "#7b61ff",
  "#76dbc8",
  "#f8fafc",
  "#7a6657",
  "#2f3338",
  "#60a5fa",
  "#14213d",
  "#ff3333",
];

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

const DEFAULT_CHARACTER: CharacterConfig = {
  skinTone: DEFAULT_SKIN_TONE,
  skinColor: DEFAULT_SKIN_COLOR,
  hairStyle: "ponytail",
  hairColor: DEFAULT_HAIR_COLOR,
  outfitName: "무지개 블라우스",
  outfitColor: "#60a5fa",
  accessory: "none",
  pose: "standing",
  background: "#E9DDFF",
};

function isSameHexColor(first: string, second: string) {
  return first.toUpperCase() === second.toUpperCase();
}

function loadSavedCharacter(): CharacterConfig {
  const savedCharacter = localStorage.getItem(CHARACTER_STORAGE_KEY);

  if (!savedCharacter) {
    return DEFAULT_CHARACTER;
  }

  try {
    const parsed = JSON.parse(savedCharacter) as Partial<CharacterConfig> & {
      skinTone?: unknown;
      skinColor?: unknown;
      hairColor?: unknown;
    };

    const resolvedSkin = resolveStoredSkinTone(
      parsed.skinTone,
      parsed.skinColor,
    );

    const resolvedHairColor =
      typeof parsed.hairColor === "string"
        ? normalizeHexColor(parsed.hairColor)
        : null;

    return {
      ...DEFAULT_CHARACTER,
      ...parsed,
      ...resolvedSkin,
      hairColor: resolvedHairColor ?? DEFAULT_HAIR_COLOR,
    } as CharacterConfig;
  } catch {
    localStorage.removeItem(CHARACTER_STORAGE_KEY);
    return DEFAULT_CHARACTER;
  }
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [character, setCharacter] = useState<CharacterConfig>(() =>
    loadSavedCharacter(),
  );

  const [skinHexInput, setSkinHexInput] = useState(
    () => character.skinColor,
  );
  const [skinHexError, setSkinHexError] = useState("");

  const [hairHexInput, setHairHexInput] = useState(
    () => character.hairColor,
  );
  const [hairHexError, setHairHexError] = useState("");

  const [backgroundHexInput, setBackgroundHexInput] = useState(
    () => character.background,
  );
  const [backgroundHexError, setBackgroundHexError] = useState("");

  const isCustomSkinTone = character.skinTone === "custom";

  const selectedHairColorPreset = HAIR_COLORS.find((color) =>
    isSameHexColor(color, character.hairColor),
  );
  const isCustomHairColor = !selectedHairColorPreset;

  const selectedBackgroundPreset = BACKGROUNDS.find((background) =>
    isSameHexColor(background.color, character.background),
  );

  const isCustomBackground = !selectedBackgroundPreset;

  function update<K extends keyof CharacterConfig>(
    key: K,
    value: CharacterConfig[K],
  ) {
    setCharacter((prev) => ({
      ...prev,
      [key]: value,
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
      update("background", normalized);
      setBackgroundHexError("");
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

    if (!normalizeHexColor(backgroundHexInput)) {
      setBackgroundHexError(
        "배경색을 적용하려면 올바른 6자리 HEX 값을 입력해주세요.",
      );
      return;
    }

    localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(character));

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

            <h1 className="mt-3 text-3xl font-bold">3D 캐릭터 제작소</h1>

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
                      applySkinPreset(skinTone.value, skinTone.color)
                    }
                    ariaLabel={`${skinTone.label} 피부색 선택`}
                  >
                    <div
                      className="mx-auto h-10 w-full max-w-32 rounded-full"
                      style={{ backgroundColor: skinTone.color }}
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
                        applyCustomSkinColor(event.target.value)
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
                        handleSkinHexChange(event.target.value)
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
                        style={{ backgroundColor: character.skinColor }}
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
              <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                {HAIR_STYLES.map((hairStyle) => (
                  <OptionCard
                    key={hairStyle.value}
                    selected={character.hairStyle === hairStyle.value}
                    onClick={() => update("hairStyle", hairStyle.value)}
                  >
                    <div className="text-2xl">{hairStyle.icon}</div>

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
                    selected={isSameHexColor(character.hairColor, color)}
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
                        handleHairHexChange(event.target.value)
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
                        style={{ backgroundColor: character.hairColor }}
                      />

                      <code className="text-xs font-bold text-slate-700">
                        {character.hairColor.toUpperCase()}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </CreatorSection>

            <CreatorSection title="의상 선택">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {OUTFITS.map((outfit) => (
                  <OptionCard
                    key={outfit.name}
                    selected={character.outfitName === outfit.name}
                    onClick={() => update("outfitName", outfit.name)}
                  >
                    <div className="flex items-start gap-3 text-left">
                      <span className="text-2xl">{outfit.icon}</span>

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

              <p className="mt-5 text-sm font-bold text-slate-800">
                의상 컬러
              </p>

              <div className="mt-3 grid grid-cols-10 gap-2">
                {OUTFIT_COLORS.map((color) => (
                  <ColorButton
                    key={color}
                    color={color}
                    selected={character.outfitColor === color}
                    onClick={() => update("outfitColor", color)}
                  />
                ))}
              </div>
            </CreatorSection>

            <CreatorSection title="액세서리">
              <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
                {ACCESSORIES.map((accessory) => (
                  <OptionCard
                    key={accessory.value}
                    selected={character.accessory === accessory.value}
                    onClick={() => update("accessory", accessory.value)}
                  >
                    <div className="text-2xl">{accessory.icon}</div>

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
                    onClick={() => update("pose", pose.value)}
                  >
                    <div className="text-2xl">{pose.icon}</div>

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
                    onClick={() => applyBackgroundColor(background.color)}
                    ariaLabel={`${background.label} 배경 선택`}
                  >
                    <div
                      className="mx-auto h-10 w-16 rounded border border-slate-200"
                      style={{ backgroundColor: background.color }}
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
                        applyBackgroundColor(event.target.value)
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
                        handleBackgroundHexChange(event.target.value)
                      }
                      onBlur={handleBackgroundHexBlur}
                      placeholder="#E9DDFF"
                      maxLength={7}
                      spellCheck={false}
                      aria-invalid={Boolean(backgroundHexError)}
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
                        style={{ backgroundColor: character.background }}
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

            <h2 className="mt-4 text-sm font-bold">미리보기</h2>

            <div
              className="mt-4 h-72 overflow-hidden rounded-lg border border-slate-200"
              style={{ backgroundColor: character.background }}
            >
              <CharacterModelViewer
                modelUrl="/models/chibi-base.glb"
                skinColor={character.skinColor}
                hairColor={character.hairColor}
                outfitColor={character.outfitColor}
                hairStyle={character.hairStyle}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-4 text-xs text-slate-600">
              <p>피부: {character.skinTone}</p>
              <p>피부색: {character.skinColor.toUpperCase()}</p>
              <p>헤어: {character.hairStyle}</p>
              <p>헤어 컬러: {character.hairColor.toUpperCase()}</p>
              <p>의상: {character.outfitName}</p>
              <p>액세서리: {character.accessory}</p>
              <p>포즈: {character.pose}</p>
              <p>배경: {character.background.toUpperCase()}</p>
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
              적용 버튼을 누르면 공연 등록 화면으로 돌아가고, 선택한 캐릭터
              설정이 임시 저장됩니다.
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
      style={{ backgroundColor: color }}
    />
  );
}