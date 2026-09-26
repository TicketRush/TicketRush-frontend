import { afterEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import AdminCharacterCreatorPage from "./AdminCharacterCreatorPage";
import { createCharacterConfig, loadSavedCharacter, restoreCharacterDraft } from "@/utils/character/characterConfig";

vi.mock("@/components/admin/character/CharacterModelViewer", () => ({
  default: () => <span>3D preview</span>,
}));
vi.mock("@/hooks/common/useDocumentTitle", () => ({ useDocumentTitle: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

it.each(["standing", "wave", "heart", "dance", "sing"])("shows exactly three animation actions with legacy pose %s", pose => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ outfitModelId: "classic", pose }) });
  const html = renderToStaticMarkup(<MemoryRouter><AdminCharacterCreatorPage /></MemoryRouter>);
  for (const label of ["인사", "큐트", "입 가리기"]) {
    expect(html.match(new RegExp(`aria-label="${label}"`, "g"))).toHaveLength(1);
  }
  for (const icon of ["👋", "🫰", "🤭"]) expect(html).toContain(icon);
  for (const label of ["손 흔들기", "손가락 하트", "춤추기", "노래하기", "포즈:"]) expect(html).not.toContain(label);
  expect(html.match(/role="group" aria-label="애니메이션"/g)).toHaveLength(1);
});

describe("character creator without accessory controls", () => {
  it.each(["rainbow-blouse", "concert", "theater", "classic", "ballet", "musical", "festival"])("shows jazz controls only for jazz (%s)", (outfitModelId) => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ outfitModelId, outfitColor: "#ABCDEF" }) });
    const html = renderToStaticMarkup(<MemoryRouter><AdminCharacterCreatorPage /></MemoryRouter>);
    for (const part of ["shirt", "inner", "pants"]) {
      expect(html.includes(`id="jazz-${part}-color-picker"`)).toBe(outfitModelId === "rainbow-blouse");
      expect(html.includes(`id="jazz-${part}-hex"`)).toBe(outfitModelId === "rainbow-blouse");
    }
    if (outfitModelId === "rainbow-blouse") {
      for (const label of ["셔츠 색상", "이너 색상", "바지 색상"]) expect(html).toContain(label);
      expect(html).not.toContain('id="outfit-color-picker"');
      expect(html).toContain('value="#ABCDEF"');
    }
  });

  it.each([undefined, "none", "sunglasses", "hat", "headset", "mic", "guitar", "light"])(
    "hides accessory options and summary while accepting stored value %s",
    (accessory) => {
      vi.stubGlobal("React", React);
      vi.stubGlobal("localStorage", {
        getItem: () => accessory === undefined ? null : JSON.stringify({ outfitModelId: "concert", accessory }),
      });
      const html = renderToStaticMarkup(<MemoryRouter><AdminCharacterCreatorPage /></MemoryRouter>);
      for (const label of ["액세서리", "제거", "선글라스", "모자", "헤드셋", "마이크", "기타", "응원봉"]) {
        expect(html).not.toContain(label);
      }
      for (const label of ["피부", "헤어", "눈", "입", "의상", "애니메이션", "배경", "3D preview"]) {
        expect(html).toContain(label);
      }
      const draft = accessory === undefined
        ? restoreCharacterDraft({ outfitModelId: "concert" })!
        : loadSavedCharacter()!;
      expect(draft.accessory).toBe(accessory ?? "none");
      const saved = createCharacterConfig(draft);
      expect(restoreCharacterDraft(JSON.parse(JSON.stringify(saved)))).toEqual(draft);
    },
  );
});
