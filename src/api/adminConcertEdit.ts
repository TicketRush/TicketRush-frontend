import type { ConcertFormData } from "@/types/domain/admin";
import type { ConcertDetail } from "@/types/domain/concert";
import { validateCharacterConfig } from "@/utils/character/characterConfig";
import { isValidDate } from "@/utils/admin/concertFormValidation";
import {
  appendConcertFiles,
  MAX_CHARACTER_MESSAGE_LENGTH,
} from "./adminConcertCreate";

export interface ConcertEditData {
  form: ConcertFormData;
  totalSeats: number;
}

export interface UpdateConcertInput {
  form: ConcertFormData;
  original: ConcertFormData;
  mainImage?: File | null;
  model3d?: File | null;
  gallery?: File[];
}

export function mapConcertForEdit(detail: ConcertDetail): ConcertEditData {
  return {
    totalSeats: detail.totalSeats,
    form: {
      title: detail.title,
      performer: detail.performer ?? "",
      genre: detail.genre,
      venue: detail.venue ?? detail.address,
      address: detail.address,
      date: detail.showDate,
      time: detail.showTime,
      durationMinutes: detail.durationMinutes,
      price: detail.price,
      description: detail.description ?? "",
      imageMainUrl: detail.imageMainUrl,
      image3dUrl: detail.image3dUrl,
      imageGalleryUrls: detail.imageGalleryUrls,
      facilities: detail.facilities,
      notices: detail.notices ?? [],
      bookingOpenAt: detail.bookingOpenAt?.replace(" ", "T") ?? "",
      characterConfig: detail.characterConfig,
      characterMessage: detail.characterMessage ?? "",
    },
  };
}

// PerformancePatchRequest: total_seats, facilities, venue and notices are not editable.
export function createPerformancePatch({ form, original }: UpdateConcertInput) {
  const error = validateCharacterConfig(form.characterConfig, false);
  if (error) throw new Error(error);
  const message = form.characterMessage?.trim();
  if (message && message.length > MAX_CHARACTER_MESSAGE_LENGTH) {
    throw new Error(
      `캐릭터 한마디는 ${MAX_CHARACTER_MESSAGE_LENGTH}자 이하여야 합니다.`,
    );
  }
  if (original.bookingOpenAt && !form.bookingOpenAt) {
    throw new Error("예매 오픈 시각 해제는 이 화면에서 지원하지 않습니다.");
  }
  if (
    form.bookingOpenAt &&
    form.bookingOpenAt !== original.bookingOpenAt &&
    (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(
      form.bookingOpenAt,
    ) ||
      !isValidDate(form.bookingOpenAt.slice(0, 10)))
  ) {
    throw new Error("올바른 예매 오픈 시각을 입력해주세요.");
  }
  const changed = <K extends keyof ConcertFormData>(key: K) =>
    form[key] !== original[key] ? form[key] : undefined;
  return {
    title: changed("title"),
    performer: changed("performer"),
    genre: changed("genre"),
    description: changed("description"),
    show_date: changed("date"),
    show_time:
      changed("time") === undefined
        ? undefined
        : form.time.length === 5
          ? `${form.time}:00`
          : form.time,
    duration_minutes: changed("durationMinutes"),
    price: changed("price"),
    address: changed("address"),
    booking_open_at:
      changed("bookingOpenAt") && form.bookingOpenAt
        ? `${form.bookingOpenAt.replace("T", " ")}${form.bookingOpenAt.length === 16 ? ":00" : ""}`
        : undefined,
    character_config:
      JSON.stringify(form.characterConfig) !==
      JSON.stringify(original.characterConfig)
        ? (form.characterConfig ?? undefined)
        : undefined,
    // Empty string explicitly deletes; null/undefined leaves the existing message alone.
    character_message:
      message !== original.characterMessage?.trim() ? message : undefined,
  };
}

export function createConcertReplacementFiles(input: UpdateConcertInput) {
  const files = [
    input.mainImage,
    input.model3d,
    ...(input.gallery ?? []),
  ].filter(Boolean);
  if (files.some((file) => !(file instanceof File) || file.size === 0)) {
    throw new Error("교체할 파일은 비어 있지 않은 파일이어야 합니다.");
  }
  if ((input.gallery?.length ?? 0) > 3)
    throw new Error("갤러리는 최대 3개까지 선택해주세요.");
  if (!files.length) return null;
  const data = new FormData();
  appendConcertFiles(data, input);
  return data;
}
