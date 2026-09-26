import { readdirSync } from "node:fs";
import { expect, it } from "vitest";
import { getOutfitModelUrl, getOutfitOption, OUTFIT_OPTIONS, resolveStoredOutfitModelId, type OutfitModelId } from "./characterOutfit";

it.each([
  ["classic", "classic_outfit.glb"], ["concert", "concert_outfit.glb"],
  ["musical", "musical_outfit.glb"], ["rainbow-blouse", "jazz_outfit.glb"],
  ["festival", "festival_outfit.glb"], ["theater", "fanmeet_outfit.glb"],
  ["ballet", "ballet_outfit.glb"],
] as const)("maps %s to an existing asset with exact filename casing", (id, file) => {
  expect(getOutfitModelUrl(id)).toBe(`/models/outfits/${file}`);
  expect(readdirSync("public/models/outfits")).toContain(file);
  expect(OUTFIT_OPTIONS.filter(option => option.id === id)).toHaveLength(1);
});

it("preserves classic legacy names and unknown fallback contracts", () => {
  expect(resolveStoredOutfitModelId("classic")).toBe("classic");
  for (const name of ["클래식", "클래식 공연"]) expect(resolveStoredOutfitModelId(undefined, name)).toBe("classic");
  expect(resolveStoredOutfitModelId("unknown")).toBe("rainbow-blouse");
  expect(getOutfitOption("unknown" as OutfitModelId).id).toBe("rainbow-blouse");
  expect(getOutfitModelUrl("unknown" as OutfitModelId)).toBeNull();
});
