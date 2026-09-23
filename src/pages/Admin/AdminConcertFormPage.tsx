import { formatTimeInput, timeInputClass } from "@/utils/admin/timeInput";
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
import BookingOpenAtInput from "@/components/admin/BookingOpenAtInput";
import ShowDateInput from "@/components/admin/ShowDateInput";
import { toast } from "react-toastify";
import {
  useConcertForEdit,
  useCreateConcert,
  useUpdateConcert,
} from "@/hooks/admin/useAdmin";
import type { ConcertEditData } from "@/api/adminConcertEdit";
import type { ConcertFormData } from "@/types/domain/admin";
import { MAX_CHARACTER_MESSAGE_LENGTH } from "@/api/adminConcertCreate";
import type { Genre } from "@/types/domain/concert";
import {
  MAX_TOTAL_SEATS,
  sanitizeConcertForm,
  validateConcertForm,
  validateConcertDate,
  validateConcertTime,
  validateBookingOpenAt,
} from "@/utils/admin/concertFormValidation";
import CharacterModelViewer from "@/components/admin/character/CharacterModelViewer";
import { MOUTH_STYLE_LABELS } from "@/components/admin/character/characterMouth";
import type { CharacterDraft } from "@/types/domain/character";
import {
  CHARACTER_STORAGE_KEY,
  restoreCharacterDraft,
  loadSavedCharacter,
  createCharacterConfig,
  validateCharacterConfig,
} from "@/utils/character/characterConfig";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";


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
const CONCERT_FORM_SCROLL_KEY = "ticketRush:admin-concert-form-scroll";

interface Props {
  mode: "create" | "edit";
}

interface ConcertDraft {
  form: ConcertFormData;
  totalSeats: number;
  mainImage?: File | null;
  model3d?: File | null;
  galleryImages?: File[];
}

export default function AdminConcertFormPage({ mode }: Props) {
  useDocumentTitle(mode === "edit" ? "공연 수정" : "공연 등록");
  const { id } = useParams<{ id: string }>();
  const concertId = mode === "edit" && id ? Number(id) : undefined;
  const query = useConcertForEdit(concertId);
  if (mode === "edit") {
    if (!concertId || !Number.isSafeInteger(concertId) || concertId <= 0) {
      return <p role="alert" className="p-6">올바른 공연 ID가 아닙니다.</p>;
    }
    if (query.isPending || (!query.isFetchedAfterMount && query.isFetching)) {
      return <p role="status" className="p-6">공연 정보를 불러오는 중입니다.</p>;
    }
    if (!query.data) return (
      <div role="alert" className="p-6">
        <p>{query.error?.message ?? "공연 정보를 불러올 수 없습니다."}</p>
        <button onClick={() => query.refetch()}>다시 시도</button>
      </div>
    );
  }
  return (
    <ConcertForm
      key={mode + (concertId ?? "new")}
      mode={mode}
      concertId={concertId}
      initialData={query.data}
    />
  );
}

function ConcertForm({ mode, concertId, initialData }: Props & {
  concertId?: number;
  initialData?: ConcertEditData;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateConcert();
  const updateMutation = useUpdateConcert(concertId ?? 0);
  // Snapshot once: background refetches must not overwrite an in-progress edit.
  const [original] = useState(() => initialData?.form);
  const [draft] = useState(() => {
    const returned = location.state?.concertDraft;
    if (returned?.pathname === location.pathname) return returned as ConcertDraft;
    if (mode === "edit") return null;
    try {
      return JSON.parse(sessionStorage.getItem(CONCERT_FORM_DRAFT_KEY) ?? "null") as ConcertDraft | null;
    } catch {
      return null;
    }
  });
  const [form, setForm] = useState<ConcertFormData>(() => ({
    ...(draft?.form ?? original ?? INITIAL_FORM),
    ...(draft && location.state?.concertDraft?.pathname === location.pathname && location.state?.characterConfig
      ? { characterConfig: location.state.characterConfig } : {}),
  }));
  const [interacted, setInteracted] = useState<Partial<Record<"date" | "time" | "bookingOpenAt", boolean>>>({});
  // UI draft only. Connect persistence/hydration after the banner contract is confirmed.
  // Keep these values outside ConcertFormData and all submit/draft payloads.
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const dateError = interacted.date ? validateConcertDate(form.date, original?.date) : null;
  const timeError = interacted.time ? validateConcertTime(form.time) : null;
  const bookingError = interacted.bookingOpenAt ? validateBookingOpenAt(form.bookingOpenAt, original?.bookingOpenAt) : null;
  const [totalSeats, setTotalSeats] = useState(draft?.totalSeats ?? initialData?.totalSeats ?? 0);
  const [mainImage, setMainImage] = useState<File | null>(draft?.mainImage ?? null);
  const [model3d, setModel3d] = useState<File | null>(draft?.model3d ?? null);
  const [galleryImages, setGalleryImages] = useState<File[]>(draft?.galleryImages ?? []);
  const [selectedCharacter] = useState<CharacterDraft | null>(() =>
    mode === "edit" ? restoreCharacterDraft(form.characterConfig) : loadSavedCharacter(),
  );

  useEffect(() => {
    const savedScroll = sessionStorage.getItem(CONCERT_FORM_SCROLL_KEY);

    if (!savedScroll) return;

    let firstFrameId: number | null = null;
    let secondFrameId: number | null = null;

    try {
      const parsed = JSON.parse(savedScroll) as {
        pathname?: unknown;
        scrollY?: unknown;
      };

      const isValidScroll =
        parsed.pathname === location.pathname &&
        typeof parsed.scrollY === "number" &&
        Number.isFinite(parsed.scrollY);

      if (!isValidScroll) {
        sessionStorage.removeItem(CONCERT_FORM_SCROLL_KEY);
        return;
      }

      const scrollY = parsed.scrollY as number;

      firstFrameId = window.requestAnimationFrame(() => {
        secondFrameId = window.requestAnimationFrame(() => {
          window.scrollTo({
            top: scrollY,
            left: 0,
            behavior: "auto",
          });

          sessionStorage.removeItem(CONCERT_FORM_SCROLL_KEY);
        });
      });

      return () => {
        if (firstFrameId !== null) {
          window.cancelAnimationFrame(firstFrameId);
        }

        if (secondFrameId !== null) {
          window.cancelAnimationFrame(secondFrameId);
        }
      };
    } catch {
      sessionStorage.removeItem(CONCERT_FORM_SCROLL_KEY);
    }
  }, [location.pathname]);


  function update<K extends keyof ConcertFormData>(
    key: K,
    value: ConcertFormData[K],
  ) {
    if (key === "date" || key === "time" || key === "bookingOpenAt") {
      setInteracted((prev) => ({ ...prev, [key]: true }));
    }
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
    if (mode === "edit") {
      try {
        if (form.characterConfig) localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(form.characterConfig));
        else localStorage.removeItem(CHARACTER_STORAGE_KEY);
      } catch {
        toast.error("캐릭터 설정을 불러오지 못했습니다.");
        return;
      }
    }
    if (mode === "create") sessionStorage.setItem(
      CONCERT_FORM_DRAFT_KEY,
      JSON.stringify({
        form,
        totalSeats,
      }),
    );

    sessionStorage.setItem(
      CONCERT_FORM_SCROLL_KEY,
      JSON.stringify({
        pathname: location.pathname,
        scrollY: window.scrollY,
      }),
    );

    navigate(
      `/admin/character-creator?returnTo=${encodeURIComponent(
        location.pathname,
      )}`,
      { state: { concertDraft: { pathname: location.pathname, form, totalSeats, mainImage, model3d, galleryImages } } },
    );
  }

  function handleEnterMoveNext(
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-form-focus='true']:not(:disabled)"),
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

  async function handleSubmit() {
    const sanitizedForm = sanitizeConcertForm(form);

    const errorMessage = validateConcertForm({
      form: sanitizedForm,
      totalSeats,
      original,
    });

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    const characterConfig = mode === "edit"
      ? form.characterConfig
      : selectedCharacter ? createCharacterConfig(selectedCharacter) : undefined;
    const characterError = validateCharacterConfig(characterConfig, mode === "create");
    if (characterError) {
      toast.error(characterError);
      return;
    }

    if (mode === "create" && !mainImage) {
      toast.error("대표 이미지를 업로드해주세요.");
      return;
    }

    try {
      if (mode === "create" && mainImage) {
        await createMutation.mutateAsync({
          form: {
            ...sanitizedForm,
            characterConfig,
            characterMessage: sanitizedForm.characterMessage?.trim() || undefined,
          },
          totalSeats,
          mainImage,
          gallery: galleryImages,
        });
        toast.success("공연이 등록되었습니다.");
      } else {
        await updateMutation.mutateAsync({
          form: sanitizedForm,
          original: original!,
          mainImage,
          model3d,
          gallery: galleryImages,
        });
        toast.success("공연이 수정되었습니다.");
      }

      if (mode === "create") {
        sessionStorage.removeItem(CONCERT_FORM_DRAFT_KEY);
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
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-[760px] space-y-5 sm:space-y-6 lg:max-w-[960px] xl:max-w-[1080px] 2xl:max-w-[1200px]">
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

          <h1 className="mt-3 text-2xl font-bold sm:text-3xl xl:text-4xl">
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
              className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary xl:px-4 xl:py-3 xl:text-base"
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
          {dateError && <p id="show-date-error" className="text-sm text-red-400">{dateError}</p>}
          {timeError && <p id="show-time-error" className="text-sm text-red-400">{timeError}</p>}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <ShowDateInput
                aria-invalid={dateError ? true : undefined}
                aria-describedby={dateError ? "show-date-error" : undefined}
                value={form.date}
                onChange={(v) => update("date", v)}
                onKeyDown={handleEnterMoveNext}
              />
            </div>

            <Field label="공연 시간" required schedule>
              <EditableTimeInput
                aria-invalid={timeError ? true : undefined}
                aria-describedby={timeError ? "show-time-error" : undefined}
                value={form.time}
                onChange={(v) => update("time", v)}
                onKeyDown={handleEnterMoveNext}
                placeholder="예: 19:00"
              />
            </Field>

            <Field label="러닝타임(분)" required schedule>
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

        <Section title="예매 일정">
          <Field label="예매 오픈 시각 (한국 시간)">
            {bookingError && <p id="booking-open-error" className="text-sm text-red-400">{bookingError}</p>}
            <BookingOpenAtInput aria-invalid={bookingError ? true : undefined}
              aria-describedby={bookingError ? "booking-open-error" : undefined} value={form.bookingOpenAt ?? ""} onChange={(v) => update("bookingOpenAt", v)} />
            {mode === "edit" && <p className="text-xs">기존 예매 오픈 시각 해제는 지원하지 않습니다.</p>}
          </Field>
        </Section>

        <Section title="장소 정보">
          <Field label="공연장명" required>
            <FormInput
              disabled={mode === "edit"}
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
                max={MAX_TOTAL_SEATS}
                disabled={mode === "edit"}
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
              className="w-full resize-none rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary xl:px-4 xl:py-3 xl:text-base"
            />
          </Field>

          {mode === "create" && <Field label="관람 안내">
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
          </Field>}
        </Section>

        <Section title="배너 설정">
          <p id="banner-settings-note" className="text-sm text-admin-text-secondary">
            배너 설정은 현재 저장되거나 메인 화면에 반영되지 않습니다. 기존 등록 상태도 표시되지 않습니다.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              id="banner-enabled"
              type="checkbox"
              checked={bannerEnabled}
              onChange={(e) => setBannerEnabled(e.target.checked)}
              aria-describedby="banner-settings-note"
              className="h-4 w-4 accent-primary"
            />
            메인 배너에 등록
          </label>
          {bannerEnabled && (
            <div>
              <label htmlFor="banner-subtitle" className="mb-2 block text-sm font-medium">
                배너 소제목
              </label>
              <input
                id="banner-subtitle"
                type="text"
                data-form-focus="true"
                value={bannerSubtitle}
                onChange={(e) => setBannerSubtitle(e.target.value)}
                onKeyDown={handleEnterMoveNext}
                aria-describedby="banner-settings-note"
                placeholder="공연을 소개하는 짧은 문구를 입력해주세요"
                className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary xl:px-4 xl:py-3 xl:text-base"
              />
            </div>
          )}
        </Section>

        <Section title="편의 시설">
          {mode === "edit" && <p className="text-xs">편의 시설은 수정할 수 없습니다.</p>}
          <fieldset disabled={mode === "edit"}>
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
          </fieldset>
        </Section>

        <Section title="이미지 업로드">
          <Field label="3D 캐릭터/오브젝트 모델" required={mode === "create"}>
            <CharacterCreatorLinkBox
              character={selectedCharacter}
              onClick={goToCharacterCreator}
            />
          </Field>

            <Field label="캐릭터 한마디 (선택, 최대 50자)">
              <FormInput
                value={form.characterMessage ?? ""}
                maxLength={MAX_CHARACTER_MESSAGE_LENGTH}
                onChange={(value) => update("characterMessage", value)}
                onKeyDown={handleEnterMoveNext}
                placeholder="공연장에서 만나요!"
              />
            </Field>

          {mode === "edit" && form.image3dUrl && <a href={form.image3dUrl} target="_blank" rel="noreferrer">현재 3D 모델 보기</a>}
          {mode === "edit" && <Field label="3D 모델 파일 교체 (선택)">
            <UploadBox text={model3d?.name ?? "새 3D 모델 선택"} description="선택하지 않으면 기존 모델이 유지됩니다." accept=".glb,.obj" onFilesSelected={(files) => setModel3d(files[0] ?? null)} />
            {model3d && <button type="button" onClick={() => setModel3d(null)}>파일 선택 취소</button>}
          </Field>}
          <Field label="대표 이미지" required>
            {mode === "edit" && form.imageMainUrl && <img src={form.imageMainUrl} alt="현재 대표 이미지" className="mb-2 h-32 object-contain" />}
            <UploadBox
              text={mainImage ? mainImage.name : "대표 이미지 업로드"}
              description="클릭하거나 파일을 끌어다 놓으세요."
              accept="image/*"
              onFilesSelected={handleMainImageFiles}
            />
            {mode === "edit" && mainImage && <button type="button" onClick={() => setMainImage(null)}>파일 선택 취소</button>}
          </Field>

          <Field label="갤러리 이미지 최대 3개">
            {mode === "edit" && <div className="flex gap-2">{form.imageGalleryUrls?.map((url) => <img key={url} src={url} alt="현재 갤러리 이미지" className="h-24 object-contain" />)}</div>}
            <UploadBox
              text={
                galleryImages.length > 0
                  ? `${galleryImages.length}개 선택됨`
                  : "갤러리 이미지 업로드"
              }
              description={mode === "edit" ? "새 파일을 선택하면 기존 갤러리 전체를 교체합니다. 선택하지 않으면 유지됩니다." : "최대 3개까지 업로드할 수 있습니다."}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
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
    <section className="rounded-xl border border-admin-border bg-admin-card p-4 shadow-sm sm:p-6 xl:p-7">
      <h2 className="mb-4 text-base font-bold xl:text-lg">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required = false,
  schedule = false,
  children,
}: {
  label: string;
  required?: boolean;
  schedule?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <p className={schedule ? "mb-1 text-sm" : "mb-1 text-xs font-medium text-admin-text-secondary"}>
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
  maxLength,
  max,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <input
      data-form-focus="true"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      max={max}
      className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary xl:px-4 xl:py-3 xl:text-base"
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

function EditableTimeInput({
  value,
  onChange,
  onKeyDown,
  placeholder = "예: 19:00",
  ...accessibilityProps
}: {
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {

  return (
    <input
      {...accessibilityProps}
      data-form-focus="true"
      type="text"
      value={value}
      onChange={(e) => onChange(formatTimeInput(e.target.value))}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      maxLength={5}
      inputMode="numeric"
      className={timeInputClass}
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

  const isBalletOutfit = character.outfitModelId === "ballet";
  const isConcertOutfit = character.outfitModelId === "concert";
  const isMusicalOutfit = character.outfitModelId === "musical";
  const isFestivalOutfit = character.outfitModelId === "festival";

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
          jazzShirtColor={character.jazzShirtColor}
          jazzInnerColor={character.jazzInnerColor}
          jazzPantsColor={character.jazzPantsColor}
          balletWearColor={character.balletWearColor}
          balletShortsColor={character.balletShortsColor}
          jacketColor={character.jacketColor}
          innerColor={character.innerColor}
          bottomColor={character.bottomColor}
          musicalJacketColor={character.musicalJacketColor}
          musicalInnerColor={character.musicalInnerColor}
          musicalShortsColor={character.musicalShortsColor}
          festivalTopColor={character.festivalTopColor}
          festivalBottomColor={character.festivalBottomColor}
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

      <div className="border-t border-admin-border px-4 py-4 text-center">
        <p className="text-sm font-bold text-admin-text">
          제작된 3D 캐릭터 선택됨
        </p>

        <p className="mt-1 text-xs text-admin-text-secondary">
          피부: {character.skinTone} ({character.skinColor.toUpperCase()}) /
          헤어: {character.hairStyle} / 눈: {character.eyeStyle}

        </p>

        <p className="mt-1 text-xs text-admin-text-secondary">
          의상: {character.outfitName} / 액세서리: {character.accessory} /
          포즈: {character.pose}
        </p>

        <p className="mt-1 text-xs text-admin-text-secondary">
          입: {MOUTH_STYLE_LABELS[character.mouthStyle]}
        </p>

        {isBalletOutfit && (
          <p className="mt-1 text-xs text-admin-text-secondary">
            발레 의상:{" "}
            {character.balletWearColor.toUpperCase()}{" "}
            / 하의:{" "}
            {character.balletShortsColor.toUpperCase()}
          </p>
        )}

        {isConcertOutfit && (
          <p className="mt-1 text-xs text-admin-text-secondary">
            재킷: {character.jacketColor.toUpperCase()} /
            이너: {character.innerColor.toUpperCase()} /
            하의: {character.bottomColor.toUpperCase()}
          </p>
        )}

        {isMusicalOutfit && (
          <p className="mt-1 text-xs text-admin-text-secondary">
            자켓: {character.musicalJacketColor.toUpperCase()} / 이너:{" "}
            {character.musicalInnerColor.toUpperCase()} / 반바지:{" "}
            {character.musicalShortsColor.toUpperCase()}
          </p>
        )}

        {isFestivalOutfit && (
          <p className="mt-1 text-xs text-admin-text-secondary">
            상의: {character.festivalTopColor.toUpperCase()} / 하의:{" "}
            {character.festivalBottomColor.toUpperCase()}
          </p>
        )}

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
