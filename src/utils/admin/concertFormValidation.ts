import type { ConcertFormData } from "@/types/domain/admin";

export const MAX_CONCERT_FUTURE_YEARS = 5;
export const MAX_DURATION_MINUTES = 1440;

// TODO: BE 계약 또는 서비스 정책 확정 시 값 조정
export const MAX_TICKET_PRICE = 10_000_000;
export const MAX_TOTAL_SEATS = 100_000;

interface ValidateConcertFormParams {
  form: ConcertFormData;
  totalSeats: number;
  today?: Date;
}

export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMaxConcertDate(today: Date): Date {
  return new Date(
    today.getFullYear() + MAX_CONCERT_FUTURE_YEARS,
    today.getMonth(),
    today.getDate(),
  );
}

export function validateConcertForm({
  form,
  totalSeats,
  today = new Date(),
}: ValidateConcertFormParams): string | null {
  if (!form.title.trim()) {
    return "공연명을 입력해주세요.";
  }

  if (!form.performer.trim()) {
    return "출연진을 입력해주세요.";
  }

  if (!form.genre) {
    return "장르를 선택해주세요.";
  }

  if (!form.date) {
    return "공연 날짜를 선택해주세요.";
  }

  if (!isValidDate(form.date)) {
    return "올바른 공연 날짜를 입력해주세요.";
  }

  const [year, month, day] = form.date.split("-").map(Number);
  const concertDate = new Date(year, month - 1, day);
  const todayStart = toStartOfDay(today);
  const maxConcertDate = getMaxConcertDate(todayStart);

  if (concertDate < todayStart) {
    return "과거 날짜는 공연 날짜로 선택할 수 없습니다.";
  }

  if (concertDate > maxConcertDate) {
    return `공연 날짜는 오늘부터 최대 ${MAX_CONCERT_FUTURE_YEARS}년 후까지 입력할 수 있습니다.`;
  }

  if (!form.time) {
    return "공연 시간을 선택해주세요.";
  }

  if (!isValidTime(form.time)) {
    return "공연 시간은 00:00부터 23:59 사이로 입력해주세요.";
  }

  if (!isPositiveInteger(form.durationMinutes)) {
    return "공연 러닝타임은 1분 이상의 정수로 입력해주세요.";
  }

  if (form.durationMinutes > MAX_DURATION_MINUTES) {
    return `공연 러닝타임은 최대 ${MAX_DURATION_MINUTES}분까지 입력할 수 있습니다.`;
  }

  if (!form.venue.trim()) {
    return "공연장명을 입력해주세요.";
  }

  if (!form.address.trim()) {
    return "상세 주소를 입력해주세요.";
  }

  if (!isPositiveInteger(form.price)) {
    return "티켓 가격은 1원 이상의 정수로 입력해주세요.";
  }

  if (form.price > MAX_TICKET_PRICE) {
    return `티켓 가격은 최대 ${MAX_TICKET_PRICE.toLocaleString()}원까지 입력할 수 있습니다.`;
  }

  if (!isPositiveInteger(totalSeats)) {
    return "총 좌석 수는 1석 이상의 정수로 입력해주세요.";
  }

  if (totalSeats > MAX_TOTAL_SEATS) {
    return `총 좌석 수는 최대 ${MAX_TOTAL_SEATS.toLocaleString()}석까지 입력할 수 있습니다.`;
  }

  if (!form.description.trim()) {
    return "공연 상세 설명을 입력해주세요.";
  }

  return null;
}

export function sanitizeConcertForm(
  form: ConcertFormData,
): ConcertFormData {
  return {
    ...form,
    title: form.title.trim(),
    performer: form.performer.trim(),
    venue: form.venue.trim(),
    address: form.address.trim(),
    description: form.description.trim(),

    notices: form.notices
      .map((notice) => notice.trim())
      .filter(Boolean),

    facilities: form.facilities
      .map((facility) => ({
        ...facility,
        label: facility.label.trim(),
      }))
      .filter((facility) => facility.label.length > 0),
  };
}