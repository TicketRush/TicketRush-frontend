import type { ConcertFormData } from "@/types/domain/admin";
import type { CharacterConfig } from "@/types/domain/character";
import { validateCharacterConfig } from "@/utils/character/characterConfig";

export const MAX_CHARACTER_MESSAGE_LENGTH = 50;

export interface CreateConcertInput {
  form: ConcertFormData;
  totalSeats: number;
  mainImage: File;
  model3d?: File;
  gallery: File[];
}

/**
 * Wire DTO: BE Jackson uses snake_case; the opaque character object keeps its own keys.
 * Source: TicketRush-backend/develop PerformanceCreateRequest + common JacksonConfig.
 * venue, notices and facility icons have no corresponding fields in the create DTO.
 */
export interface PerformanceCreateRequest {
  title: string;
  performer: string;
  genre: ConcertFormData["genre"];
  description: string;
  show_date: string;
  show_time: string;
  duration_minutes: number;
  price: number;
  total_seats: number;
  address: string;
  facilities: string[];
  character_config?: CharacterConfig | null;
  character_message?: string;
}

export function createPerformanceRequest({
  form,
  totalSeats,
}: CreateConcertInput): PerformanceCreateRequest {
  const error = validateCharacterConfig(form.characterConfig, true);
  if (error) throw new Error(error);
  const message = form.characterMessage?.trim() || undefined;
  if (message && message.length > MAX_CHARACTER_MESSAGE_LENGTH) {
    throw new Error(
      `캐릭터 한마디는 ${MAX_CHARACTER_MESSAGE_LENGTH}자 이하여야 합니다.`,
    );
  }
  return {
    title: form.title,
    performer: form.performer,
    genre: form.genre,
    description: form.description,
    show_date: form.date,
    show_time: form.time.length === 5 ? `${form.time}:00` : form.time,
    duration_minutes: form.durationMinutes,
    price: form.price,
    total_seats: totalSeats,
    address: form.address,
    facilities: form.facilities.map(({ label }) => label),
    character_config: form.characterConfig,
    character_message: message,
  };
}

export function createConcertFormData(input: CreateConcertInput): FormData {
  const data = new FormData();
  data.append(
    "request",
    new Blob([JSON.stringify(createPerformanceRequest(input))], {
      type: "application/json",
    }),
  );
  appendConcertFiles(data, input);
  return data;
}

export function appendConcertFiles(
  data: FormData,
  files: { mainImage?: File | null; model3d?: File | null; gallery?: File[] },
) {
  if (files.mainImage) data.append("mainImage", files.mainImage);
  if (files.model3d) data.append("model3d", files.model3d);
  files.gallery?.forEach((file) => data.append("gallery", file));
}
