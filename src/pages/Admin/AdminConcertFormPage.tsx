// 공연 등록/수정 — 라우트로 mode 구분
// /admin/concerts/new → 등록
// /admin/concerts/:id/edit → 수정

import {
  useEffect,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "react-toastify";
import {
  useConcertForEdit,
  useCreateConcert,
  useUpdateConcert,
} from "@/hooks/admin/useAdmin";
import type { ConcertFormData } from "@/types/domain/admin";
import type { Genre } from "@/types/domain/concert";
import CharacterModelViewer from "@/components/admin/character/CharacterModelViewer";
import {
  resolveStoredHairStyle,
  type HairStyle,
} from "@/components/admin/character/characterHair";
import {
  normalizeHexColor,
  resolveStoredSkinTone,
  type SkinToneSelection,
} from "@/components/admin/character/characterSkin";

const GENRES: { value: Genre; label: string }[] = [
  { value: "CONCERT", label: "콘서트" },
  { value: "MUSICAL", label: "뮤지컬" },
  { value: "CLASSIC", label: "클래식" },
  { value: "JAZZ", label: "재즈" },
  { value: "FESTIVAL", label: "페스티벌" },
  { value: "FANMEETING", label: "팬미팅" },
  { value: "BALLET", label: "발레" },
];

const INITIAL_FORM: ConcertFormData = {
  title: "",
  performer: "",
  genre: "CONCERT",
  venue: "",
  address: "",
  date: "",
  time: "",
  price: 0,
  durationMinutes: 0,
  description: "",
  imageMainUrl: "",
  facilities: [],
  notices: [],
};

const CONCERT_FORM_DRAFT_KEY = "ticketRush:admin-concert-form-draft";
const CHARACTER_STORAGE_KEY = "ticketRush:admin-character";
const DEFAULT_HAIR_COLOR = "#151515";
const DEFAULT_OUTFIT_COLOR = "#60A5FA";

interface Props {
  mode: "create" | "edit";
}

type CharacterPose = "standing" | "wave" | "heart" | "dance" | "sing";

interface CharacterDraft {
  skinTone: SkinToneSelection;
  skinColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  outfitName: string;
  outfitColor: string;
  accessory: string;
  pose: CharacterPose;
  background: string;
}

function loadSavedCharacter(): CharacterDraft | null {
  const savedCharacter = localStorage.getItem(CHARACTER_STORAGE_KEY);

  if (!savedCharacter) {
    return null;
  }

  try {
    const parsed = JSON.parse(savedCharacter) as Partial<
      Omit<
        CharacterDraft,
        | "skinTone"
        | "skinColor"
        | "hairStyle"
        | "hairColor"
        | "outfitColor"
      >
    > & {
      skinTone?: unknown;
      skinColor?: unknown;
      hairStyle?: unknown;
      hairColor?: unknown;
      outfitColor?: unknown;
    };

    const resolvedSkin = resolveStoredSkinTone(
      parsed.skinTone,
      parsed.skinColor,
    );

    const resolvedHairColor =
      typeof parsed.hairColor === "string"
        ? normalizeHexColor(parsed.hairColor)
        : null;

    const resolvedOutfitColor =
      typeof parsed.outfitColor === "string"
        ? normalizeHexColor(parsed.outfitColor)
        : null;

    return {
      ...parsed,
      ...resolvedSkin,
      hairStyle: resolveStoredHairStyle(parsed.hairStyle),
      hairColor: resolvedHairColor ?? DEFAULT_HAIR_COLOR,
      outfitColor: resolvedOutfitColor ?? DEFAULT_OUTFIT_COLOR,
    } as CharacterDraft;
  } catch {
    localStorage.removeItem(CHARACTER_STORAGE_KEY);
    return null;
  }
}

export default function AdminConcertFormPage({ mode }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const concertId = mode === "edit" && id ? Number(id) : undefined;

  const { data: existingData } = useConcertForEdit(concertId);
  const createMutation = useCreateConcert();
  const updateMutation = useUpdateConcert(concertId ?? 0);

  const [form, setForm] = useState<ConcertFormData>(INITIAL_FORM);

  // TODO: 백엔드 공연 등록/수정 API 스펙 확정 후 ConcertFormData에 반영 필요
  const [totalSeats, setTotalSeats] = useState(0);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterDraft | null>(() => loadSavedCharacter());

  useEffect(() => {
    if (existingData) {
      setForm(existingData);
    }
  }, [existingData]);

  useEffect(() => {
    const savedDraft = sessionStorage.getItem(CONCERT_FORM_DRAFT_KEY);

    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft) as {
        form?: ConcertFormData;
        totalSeats?: number;
      };

      if (parsed.form) {
        setForm(parsed.form);
      }

      if (typeof parsed.totalSeats === "number") {
        setTotalSeats(parsed.totalSeats);
      }
    } catch {
      sessionStorage.removeItem(CONCERT_FORM_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    setSelectedCharacter(loadSavedCharacter());
  }, [location.key]);

  function update<K extends keyof ConcertFormData>(
    key: K,
    value: ConcertFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addFacility() {
    update("facilities", [...form.facilities, { icon: "✨", label: "" }]);
  }

  function updateFacility(index: number, value: string) {
    const next = [...form.facilities];

    next[index] = {
      ...next[index],
      label: value,
    };

    update("facilities", next);
  }

  function removeFacility(index: number) {
    update(
      "facilities",
      form.facilities.filter((_, i) => i !== index),
    );
  }

  function addNotice() {
    update("notices", [...form.notices, ""]);
  }

  function updateNotice(index: number, value: string) {
    const next = [...form.notices];
    next[index] = value;

    update("notices", next);
  }

  function removeNotice(index: number) {
    update(
      "notices",
      form.notices.filter((_, i) => i !== index),
    );
  }

  function handleMainImageFiles(files: File[]) {
    const file = files[0];

    if (!file) return;

    setMainImage(file);
  }

  function handleGalleryImageFiles(files: File[]) {
    setGalleryImages((prev) => [...prev, ...files].slice(0, 3));
  }

  function removeGalleryImage(index: number) {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  }

  function goToCharacterCreator() {
    sessionStorage.setItem(
      CONCERT_FORM_DRAFT_KEY,
      JSON.stringify({
        form,
        totalSeats,
      }),
    );

    navigate(
      `/admin/character-creator?returnTo=${encodeURIComponent(
        window.location.pathname,
      )}`,
    );
  }

  function handleEnterMoveNext(
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-form-focus='true']"),
    );

    const currentIndex = focusableElements.indexOf(event.currentTarget);
    const nextElement = focusableElements[currentIndex + 1];

    if (!nextElement) return;

    nextElement.focus();
    nextElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function validateForm() {
    if (!form.title.trim()) return "공연명을 입력해주세요.";
    if (!form.performer.trim()) return "출연진을 입력해주세요.";
    if (!form.genre) return "장르를 선택해주세요.";
    if (!form.date) return "공연 날짜를 선택해주세요.";
    if (!form.time) return "공연 시간을 선택해주세요.";

    if (!form.durationMinutes || form.durationMinutes <= 0) {
      return "공연 러닝타임을 입력해주세요.";
    }

    if (!form.venue.trim()) return "공연장명을 입력해주세요.";
    if (!form.address.trim()) return "상세 주소를 입력해주세요.";
    if (!form.price || form.price <= 0) return "티켓 가격을 입력해주세요.";
    if (!totalSeats || totalSeats <= 0) return "총 좌석 수를 입력해주세요.";
    if (!form.description.trim()) return "공연 상세 설명을 입력해주세요.";

    if (mode === "create" && !selectedCharacter) {
      return "3D 캐릭터를 제작해주세요.";
    }

    if (mode === "create" && !mainImage) {
      return "대표 이미지를 업로드해주세요.";
    }

    return null;
  }

  async function handleSubmit() {
    const errorMessage = validateForm();

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    try {
      // TODO:
      // 현재 createConcertApi/updateConcertApi는 ConcertFormData만 받음.
      // totalSeats, mainImage, galleryImages, model3d는 백엔드 스펙 확정 후
      // FormData 또는 별도 업로드 API로 연결 필요.
      if (mode === "create") {
        await createMutation.mutateAsync(form);
        toast.success("공연이 등록되었습니다.");
      } else {
        await updateMutation.mutateAsync(form);
        toast.success("공연이 수정되었습니다.");
      }

      navigate("/admin");
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error("저장에 실패했습니다.");

      toast.error(err.message ?? "저장에 실패했습니다.");
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-[760px] space-y-6">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 rounded-lg border border-admin-border bg-admin-card px-4 py-2 text-sm"
        >
          <ArrowLeft size={16} />
          대시보드
        </button>

        <header className="text-center">
          <span className="rounded bg-admin-border px-2 py-1 text-[10px] font-bold tracking-wider">
            CONCERT FORM
          </span>

          <h1 className="mt-3 text-3xl font-bold">
            {mode === "create" ? "공연 등록" : "공연 수정"}
          </h1>

          <p className="mt-2 text-sm text-admin-text-secondary">
            새로운 공연 정보를 입력하세요.
          </p>
        </header>

        <Section title="기본 정보">
          <Field label="공연명" required>
            <FormInput
              value={form.title}
              onChange={(v) => update("title", v)}
              onKeyDown={handleEnterMoveNext}
              placeholder="예: Neon Dreams Concert"
            />
          </Field>

          <Field label="출연진" required>
            <FormInput
              value={form.performer}
              onChange={(v) => update("performer", v)}
              onKeyDown={handleEnterMoveNext}
              placeholder="예: BTS"
            />
          </Field>

          <Field label="장르" required>
            <select
              data-form-focus="true"
              value={form.genre}
              onChange={(e) => update("genre", e.target.value as Genre)}
              onKeyDown={handleEnterMoveNext}
              className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {GENRES.map((genre) => (
                <option key={genre.value} value={genre.value}>
                  {genre.label}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="일정 정보">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="공연 날짜" required>
              <EditableDateInput
                value={form.date}
                onChange={(v) => update("date", v)}
                onKeyDown={handleEnterMoveNext}
                placeholder="예: 2026-07-20"
              />
            </Field>

            <Field label="공연 시간" required>
              <EditableTimeInput
                value={form.time}
                onChange={(v) => update("time", v)}
                onKeyDown={handleEnterMoveNext}
                placeholder="예: 19:00"
              />
            </Field>

            <Field label="러닝타임(분)" required>
              <FormInput
                type="number"
                value={
                  form.durationMinutes === 0
                    ? ""
                    : String(form.durationMinutes)
                }
                onChange={(v) => update("durationMinutes", Number(v || 0))}
                onKeyDown={handleEnterMoveNext}
                placeholder="예: 120"
              />
            </Field>
          </div>
        </Section>

        <Section title="장소 정보">
          <Field label="공연장명" required>
            <FormInput
              value={form.venue}
              onChange={(v) => update("venue", v)}
              onKeyDown={handleEnterMoveNext}
              placeholder="예: Main Concert Hall"
            />
          </Field>

          <Field label="상세 주소" required>
            <FormInput
              value={form.address}
              onChange={(v) => update("address", v)}
              onKeyDown={handleEnterMoveNext}
              placeholder="예: 서울특별시 송파구 ..."
            />
          </Field>
        </Section>

        <Section title="티켓 정보">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="티켓 가격" required>
              <FormInput
                type="number"
                value={form.price === 0 ? "" : String(form.price)}
                onChange={(v) => update("price", Number(v || 0))}
                onKeyDown={handleEnterMoveNext}
                placeholder="예: 88000"
              />
            </Field>

            <Field label="총 좌석 수" required>
              <FormInput
                type="number"
                value={totalSeats === 0 ? "" : String(totalSeats)}
                onChange={(v) => setTotalSeats(Number(v || 0))}
                onKeyDown={handleEnterMoveNext}
                placeholder="예: 120"
              />
            </Field>
          </div>
        </Section>

        <Section title="공연 소개">
          <Field label="공연 상세 설명" required>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={8}
              placeholder="공연 소개, 공연 특징, 관람 안내를 입력하세요."
              className="w-full resize-none rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>

          <Field label="관람 안내">
            <div className="space-y-2">
              {form.notices.map((notice, index) => (
                <div key={index} className="flex gap-2">
                  <FormInput
                    value={notice}
                    onChange={(v) => updateNotice(index, v)}
                    onKeyDown={handleEnterMoveNext}
                    placeholder="예: 공연 시작 10분 전까지 입장해주세요."
                  />

                  <button
                    type="button"
                    onClick={() => removeNotice(index)}
                    className="shrink-0 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                  >
                    삭제
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addNotice}
                className="rounded-lg border border-dashed border-admin-border bg-admin-bg px-4 py-2 text-sm text-admin-text-secondary"
              >
                + 관람 안내 추가
              </button>
            </div>
          </Field>
        </Section>

        <Section title="편의 시설">
          <div className="space-y-2">
            {form.facilities.map((facility, index) => (
              <div key={index} className="flex gap-2">
                <FormInput
                  value={facility.label}
                  onChange={(v) => updateFacility(index, v)}
                  onKeyDown={handleEnterMoveNext}
                  placeholder="예: 최신 음향 시스템"
                />

                <button
                  type="button"
                  onClick={() => removeFacility(index)}
                  className="shrink-0 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                >
                  삭제
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addFacility}
              className="rounded-lg border border-dashed border-admin-border bg-admin-bg px-4 py-2 text-sm text-admin-text-secondary"
            >
              + 편의 시설 추가
            </button>
          </div>
        </Section>

        <Section title="이미지 업로드">
          <Field label="3D 캐릭터/오브젝트 모델" required>
            <CharacterCreatorLinkBox
              character={selectedCharacter}
              onClick={goToCharacterCreator}
            />
          </Field>

          <Field label="대표 이미지" required>
            <UploadBox
              text={mainImage ? mainImage.name : "대표 이미지 업로드"}
              description="클릭하거나 파일을 끌어다 놓으세요."
              accept="image/*"
              onFilesSelected={handleMainImageFiles}
            />
          </Field>

          <Field label="갤러리 이미지 최대 3개">
            <UploadBox
              text={
                galleryImages.length > 0
                  ? `${galleryImages.length}개 선택됨`
                  : "갤러리 이미지 업로드"
              }
              description="최대 3개까지 업로드할 수 있습니다."
              accept="image/*"
              multiple
              onFilesSelected={handleGalleryImageFiles}
            />

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-admin-border bg-admin-bg px-3 text-center text-xs text-admin-text-secondary"
                >
                  {galleryImages[index] ? (
                    <>
                      <span className="line-clamp-2">
                        {galleryImages[index].name}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="mt-2 text-xs text-red-400"
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <span>이미지 {index + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </Field>
        </Section>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />

            {isPending
              ? "저장 중..."
              : mode === "create"
                ? "공연 등록하기"
                : "변경사항 저장"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="h-12 rounded-lg border border-admin-border bg-admin-card px-6 font-bold"
            disabled={isPending}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-admin-border bg-admin-card p-6 shadow-sm">
      <h2 className="mb-4 text-base font-bold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-admin-text-secondary">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </p>

      {children}
    </div>
  );
}

function FormInput({
  value,
  onChange,
  onKeyDown,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      data-form-focus="true"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary"
    />
  );
}

function UploadBox({
  text,
  description,
  accept,
  multiple = false,
  onFilesSelected,
}: {
  text: string;
  description: string;
  accept: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
}) {
  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    onFilesSelected(files);
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    const files = Array.from(event.dataTransfer.files ?? []);

    if (!multiple) {
      onFilesSelected(files.slice(0, 1));
      return;
    }

    onFilesSelected(files);
  }

  return (
    <label
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-admin-border bg-admin-bg px-4 py-6 text-center text-sm text-admin-text-secondary transition hover:border-primary"
    >
      <span className="font-medium text-admin-text">{text}</span>
      <span className="mt-1 text-xs">{description}</span>
      <span className="mt-2 text-xs">클릭하여 업로드</span>

      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />
    </label>
  );
}

function EditableDateInput({
  value,
  onChange,
  onKeyDown,
  placeholder = "예: 2026-07-20",
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  function formatDateInput(input: string) {
    const digits = input.replace(/\D/g, "").slice(0, 8);

    if (digits.length <= 4) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  }

  return (
    <input
      data-form-focus="true"
      type="text"
      value={value}
      onChange={(e) => onChange(formatDateInput(e.target.value))}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      maxLength={10}
      inputMode="numeric"
      className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary"
    />
  );
}

function EditableTimeInput({
  value,
  onChange,
  onKeyDown,
  placeholder = "예: 19:00",
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  function formatTimeInput(input: string) {
    const digits = input.replace(/\D/g, "").slice(0, 4);

    if (digits.length <= 2) {
      return digits;
    }

    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  return (
    <input
      data-form-focus="true"
      type="text"
      value={value}
      onChange={(e) => onChange(formatTimeInput(e.target.value))}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      maxLength={5}
      inputMode="numeric"
      className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary"
    />
  );
}

function CharacterCreatorLinkBox({
  character,
  onClick,
}: {
  character: CharacterDraft | null;
  onClick: () => void;
}) {
  if (!character) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-52 w-full flex-col items-center justify-center rounded-lg border border-dashed border-admin-border bg-admin-bg px-4 py-6 text-center text-sm text-admin-text-secondary transition hover:border-primary"
      >
        <span className="font-medium text-admin-text">
          3D 캐릭터 제작소로 이동
        </span>

        <span className="mt-1 text-xs">
          클릭하면 3D 캐릭터 제작 페이지로 이동합니다.
        </span>

        <span className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white">
          3D 캐릭터 만들러 가기
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-bg">
      <div
        className="h-80 w-full overflow-hidden"
        style={{ backgroundColor: character.background }}
      >
        <CharacterModelViewer
          modelUrl="/models/chibi-base.glb"
          skinColor={character.skinColor}
          hairColor={character.hairColor}
          outfitColor={character.outfitColor}
          outfitName={character.outfitName}
          hairStyle={character.hairStyle}
        />
      </div>

      <div className="border-t border-admin-border px-4 py-4 text-center">
        <p className="text-sm font-bold text-admin-text">
          제작된 3D 캐릭터 선택됨
        </p>

        <p className="mt-1 text-xs text-admin-text-secondary">
          피부: {character.skinTone} ({character.skinColor.toUpperCase()}) /
          헤어: {character.hairStyle} / 포즈: {character.pose}
        </p>

        <p className="mt-1 text-xs text-admin-text-secondary">
          의상: {character.outfitName} / 액세서리: {character.accessory}
        </p>

        <button
          type="button"
          onClick={onClick}
          className="mt-4 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white transition hover:opacity-90"
        >
          캐릭터 다시 수정하기
        </button>
      </div>
    </div>
  );
}