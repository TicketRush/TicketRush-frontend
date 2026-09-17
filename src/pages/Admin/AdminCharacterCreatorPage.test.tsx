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

describe("character creator without accessory controls", () => {
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
      for (const label of ["피부", "헤어", "눈", "입", "의상", "포즈", "배경", "3D preview"]) {
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
