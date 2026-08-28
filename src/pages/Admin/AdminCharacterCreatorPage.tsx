import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CharacterModelViewer from "@/components/admin/character/CharacterModelViewer";
import {
  resolveStoredHairStyle,
  type HairStyle,
} from "@/components/admin/character/characterHair";

type SkinTone = "light" | "medium" | "tan" | "dark";
type Pose = "standing" | "wave" | "heart" | "dance" | "sing";

interface CharacterConfig {
  skinTone: SkinTone;
  hairStyle: HairStyle;
  hairColor: string;
  outfitName: string;
  outfitColor: string;
  accessory: string;
  pose: Pose;
  background: string;
}

const CHARACTER_STORAGE_KEY = "ticketRush:admin-character";
const DEFAULT_RETURN_TO = "/admin/concerts/new";

const SKIN_TONES: { value: SkinTone; label: string; color: string }[] = [
  { value: "light", label: "Light", color: "#f7c6a8" },
  { value: "medium", label: "Medium", color: "#d9a78c" },
  { value: "tan", label: "Tan", color: "#bf7f54" },
  { value: "dark", label: "Dark", color: "#8b5a2b" },
];

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

const HAIR_COLORS = [
  "#151515",
  "#4b3a2b",
  "#bfc5c7",
  "#f07ac4",
  "#8e5aa6",
  "#4f7c5a",
  "#444889",
];

const OUTFITS = [
  {
    name: "무지개 블라우스",
    description: "가벼운 공연 의상",
    icon: "👗",
  },
  {
    name: "마이크 콘서트",
    description: "K-POP 콘서트 대표룩",
    icon: "🎤",
  },
  {
    name: "클래식 공연",
    description: "포멀한 공연 의상",
    icon: "🎻",
  },
  {
    name: "DJ / 페스티벌",
    description: "EDM 페스티벌룩",
    icon: "🎸",
  },
  {
    name: "발레 / 무용 공연",
    description: "무용 공연 의상",
    icon: "🩰",
  },
  {
    name: "연극 / 극장",
    description: "무대 의상",
    icon: "🎩",
  },
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

const BACKGROUNDS = [
  { label: "라벤더", color: "#e9ddff" },
  { label: "핑크톤", color: "#ffd6e8" },
  { label: "블루빛", color: "#dbeafe" },
  { label: "재즈", color: "#f59e0b" },
  { label: "페스티벌", color: "#10b981" },
  { label: "뮤지컬", color: "#ddd6fe" },
  { label: "팬미팅", color: "#f0abfc" },
];

const DEFAULT_CHARACTER: CharacterConfig = {
  skinTone: "light",
  hairStyle: "ponytail",
  hairColor: "#151515",
  outfitName: "무지개 블라우스",
  outfitColor: "#60a5fa",
  accessory: "none",
  pose: "standing",
  background: "#e9ddff",
};

function loadSavedCharacter(): CharacterConfig {
  const savedCharacter = localStorage.getItem(CHARACTER_STORAGE_KEY);

  if (!savedCharacter) {
    return DEFAULT_CHARACTER;
  }

  try {
    const parsed = JSON.parse(savedCharacter) as Omit<
      CharacterConfig,
      "hairStyle"
    > & {
      hairStyle?: unknown;
    };

    return {
      ...parsed,
      hairStyle: resolveStoredHairStyle(parsed.hairStyle),
    };
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

  useEffect(() => {
    document.body.classList.add("admin-layout");

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    return () => {
      document.body.classList.remove("admin-layout");
    };
  }, []);

  const [character, setCharacter] = useState<CharacterConfig>(() =>
    loadSavedCharacter(),
  );

  const selectedSkinTone = SKIN_TONES.find(
    (skinTone) => skinTone.value === character.skinTone,
  );

  function update<K extends keyof CharacterConfig>(
    key: K,
    value: CharacterConfig[K],
  ) {
    setCharacter((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleReset() {
    setCharacter(DEFAULT_CHARACTER);
  }

  function handleApply() {
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {SKIN_TONES.map((skinTone) => (
                  <OptionCard
                    key={skinTone.value}
                    selected={character.skinTone === skinTone.value}
                    onClick={() => update("skinTone", skinTone.value)}
                  >
                    <div
                      className="mx-auto h-10 w-32 rounded-full"
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
            </CreatorSection>

            <CreatorSection title="헤어스타일">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
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
                    selected={character.hairColor === color}
                    onClick={() => update("hairColor", color)}
                  />
                ))}
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
              <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
                {BACKGROUNDS.map((background) => (
                  <OptionCard
                    key={background.label}
                    selected={character.background === background.color}
                    onClick={() => update("background", background.color)}
                  >
                    <div
                      className="mx-auto h-10 w-16 rounded"
                      style={{
                        backgroundColor: background.color,
                      }}
                    />

                    <p className="mt-2 text-xs font-bold text-slate-800">
                      {background.label}
                    </p>
                  </OptionCard>
                ))}
              </div>
            </CreatorSection>
          </div>

          <aside className="h-fit rounded-xl bg-white p-5 text-slate-900">
            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
              PREVIEW
            </span>

            <h2 className="mt-4 text-sm font-bold">미리보기</h2>

            <div
              className="mt-4 h-72 overflow-hidden rounded-lg"
              style={{ backgroundColor: character.background }}
            >
              <CharacterModelViewer
                modelUrl="/models/chibi-base.glb"
                skinColor={selectedSkinTone?.color ?? "#f7c6a8"}
                hairColor={character.hairColor}
                outfitColor={character.outfitColor}
                hairStyle={character.hairStyle}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-4 text-xs text-slate-600">
              <p>피부: {character.skinTone}</p>
              <p>헤어: {character.hairStyle}</p>
              <p>의상: {character.outfitName}</p>
              <p>액세서리: {character.accessory}</p>
              <p>포즈: {character.pose}</p>
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
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border bg-white p-3 text-center transition ${
        selected
          ? "border-slate-900 shadow-sm"
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
      aria-label={color}
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