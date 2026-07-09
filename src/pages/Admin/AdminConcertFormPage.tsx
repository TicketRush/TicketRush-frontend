// 공연 등록/수정 — 라우트로 mode 구분
// /admin/concerts/new → 등록
// /admin/concerts/:id/edit → 수정
//
// 백엔드 스펙 반영 변경 (admin ConcertFormData 정렬):
//   - artist → performer (라벨: 아티스트 → 출연진)
//   - duration → durationMinutes
//   - posterUrl → imageMainUrl (라벨: 포스터 URL → 메인 이미지 URL)
//   - date, time은 admin 도메인 관점 유지 (백엔드 미구현)

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "react-toastify";
import {
  useConcertForEdit,
  useCreateConcert,
  useUpdateConcert,
} from "@/hooks/admin/useAdmin";
import type { ConcertFormData } from "@/types/domain/admin";
import type { Genre } from "@/types/domain/concert";

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
  performer: "", // ← artist → performer
  genre: "CONCERT",
  venue: "",
  address: "",
  date: "", // admin 도메인은 date 유지
  time: "19:00", // admin 도메인은 time 유지
  price: 50000,
  durationMinutes: 120, // ← duration → durationMinutes
  description: "",
  imageMainUrl: "", // ← posterUrl → imageMainUrl
  facilities: [],
  notices: [],
};

interface Props {
  mode: "create" | "edit";
}

export default function AdminConcertFormPage({ mode }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const concertId = mode === "edit" && id ? Number(id) : undefined;

  const { data: existingData } = useConcertForEdit(concertId);
  const createMutation = useCreateConcert();
  const updateMutation = useUpdateConcert(concertId ?? 0);

  const [form, setForm] = useState<ConcertFormData>(INITIAL_FORM);

  // 수정 모드: 기존 데이터 로드 후 form에 채우기
  useEffect(() => {
    if (existingData) setForm(existingData);
  }, [existingData]);

  function update<K extends keyof ConcertFormData>(
    key: K,
    value: ConcertFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    // 간단 validation
    if (!form.title.trim() || !form.performer.trim() || !form.venue.trim()) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    if (!form.date) {
      toast.error("공연 날짜를 선택해주세요.");
      return;
    }

    try {
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
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-1 rounded">
            CONCERT FORM
          </span>
          <h1 className="text-3xl font-bold mt-2">
            {mode === "create" ? "공연 등록" : "공연 수정"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="px-4 py-2 rounded-lg bg-admin-card border border-admin-border flex items-center gap-2"
        >
          <ArrowLeft size={16} /> 취소
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 좌측: 기본 정보 */}
        <Section title="기본 정보">
          <Field label="공연명 *">
            <FormInput
              value={form.title}
              onChange={(v) => update("title", v)}
              placeholder="예: BTS World Tour"
            />
          </Field>
          <Field label="출연진 *">
            <FormInput
              value={form.performer}
              onChange={(v) => update("performer", v)}
              placeholder="예: BTS"
            />
          </Field>
          <Field label="장르 *">
            <select
              value={form.genre}
              onChange={(e) => update("genre", e.target.value as Genre)}
              className="w-full bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-sm"
            >
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="공연 날짜 *">
              <FormInput
                type="date"
                value={form.date}
                onChange={(v) => update("date", v)}
              />
            </Field>
            <Field label="공연 시간 *">
              <FormInput
                type="time"
                value={form.time}
                onChange={(v) => update("time", v)}
              />
            </Field>
          </div>
          <Field label="러닝 타임 (분)">
            <FormInput
              type="number"
              value={String(form.durationMinutes)}
              onChange={(v) => update("durationMinutes", Number(v))}
            />
          </Field>
          <Field label="가격 (원) *">
            <FormInput
              type="number"
              value={String(form)}
              onChange={(v) => update("price", Number(v))}
            />
          </Field>
        </Section>

        {/* 우측: 장소 / 설명 / 이미지 */}
        <Section title="장소 & 상세">
          <Field label="공연장 *">
            <FormInput
              value={form.venue}
              onChange={(v) => update("venue", v)}
              placeholder="예: 잠실 올림픽 주경기장"
            />
          </Field>
          <Field label="주소">
            <FormInput
              value={form.address}
              onChange={(v) => update("address", v)}
              placeholder="예: 서울특별시 송파구 ..."
            />
          </Field>
          <Field label="메인 이미지 URL">
            <FormInput
              value={form.imageMainUrl}
              onChange={(v) => update("imageMainUrl", v)}
              placeholder="https://..."
            />
          </Field>
          <Field label="공연 설명">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={6}
              placeholder="공연에 대한 자세한 설명을 입력하세요"
              className="w-full bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </Field>
        </Section>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="px-6 py-3 rounded-lg bg-admin-card border border-admin-border"
          disabled={isPending}
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="px-6 py-3 rounded-lg bg-primary text-white font-bold flex items-center gap-2"
        >
          <Save size={16} />
          {isPending
            ? "저장 중..."
            : mode === "create"
              ? "공연 등록"
              : "변경사항 저장"}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-6 space-y-3">
      <h2 className="font-bold mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-admin-text-secondary mb-1">{label}</p>
      {children}
    </div>
  );
}

function FormInput({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-sm"
    />
  );
}
