import { afterEach, describe, expect, it, vi } from "vitest";
import { Buffer } from "node:buffer";
import { restoreCharacterForDisplay } from "./characterConfig";
import {
  CHARACTER_CONFIG_SCHEMA_VERSION,
  MAX_CHARACTER_CONFIG_BYTES,
} from "@/types/domain/character";
import {
  CHARACTER_STORAGE_KEY,
  createCharacterConfig,
  getCharacterConfigByteSize,
  loadSavedCharacter,
  restoreCharacterDraft,
  validateCharacterConfig,
} from "./characterConfig";

const draft = restoreCharacterDraft({
  skinTone: "custom",
  skinColor: "#ABCDEF",
  hairStyle: "wave",
  hairColor: "#123456",
  eyeStyle: "wink",
  mouthStyle: "CAT",
  outfitModelId: "festival",
  outfitColor: "#010101",
  balletWearColor: "#020202",
  balletShortsColor: "#030303",
  jacketColor: "#040404",
  innerColor: "#050505",
  bottomColor: "#060606",
  musicalJacketColor: "#070707",
  musicalInnerColor: "#080808",
  musicalShortsColor: "#090909",
  festivalTopColor: "#101010",
  festivalBottomColor: "#111111",
  fanmeetCardiganColor: "#131313",
  fanmeetInnerColor: "#141414",
  fanmeetShortsColor: "#151515",
  fanmeetSkirtColor: "#161616",
  background: "#121212",
  pose: "dance",
  accessory: "mic",
})!;
const config = createCharacterConfig(draft);

afterEach(() => vi.unstubAllGlobals());

describe("character config and legacy restoration", () => {
  it("restores fanmeet parts from legacy and versioned localStorage", () => {
    const fanmeet = { ...draft, outfitModelId: "theater" };
    const restored = restoreCharacterDraft(fanmeet)!;
    expect(restored).toMatchObject({
      outfitModelId: "theater",
      outfitName: "팬미팅",
      fanmeetCardiganColor: "#131313",
      fanmeetInnerColor: "#141414",
      fanmeetShortsColor: "#151515",
      fanmeetSkirtColor: "#161616",
    });
    const saved = createCharacterConfig(restored);
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify(saved),
    });
    expect(loadSavedCharacter()).toEqual(restored);
    expect(createCharacterConfig(loadSavedCharacter()!)).toEqual(saved);
  });

  it("defaults missing or invalid fanmeet colors and normalizes valid HEX", () => {
    const defaults = {
      fanmeetCardiganColor: "#FFF51C",
      fanmeetInnerColor: "#DFE068",
      fanmeetShortsColor: "#FFBC42",
      fanmeetSkirtColor: "#9700FF",
    };
    expect(restoreCharacterDraft({ outfitModelId: "theater" })).toMatchObject(defaults);
    expect(restoreCharacterDraft({
      outfitModelId: "theater",
      fanmeetCardiganColor: "invalid",
      fanmeetInnerColor: null,
      fanmeetShortsColor: 123,
      fanmeetSkirtColor: {},
    })).toMatchObject(defaults);
    expect(restoreCharacterDraft({
      outfitModelId: "theater",
      fanmeetCardiganColor: "abcdef",
      fanmeetInnerColor: "#abcdef",
      fanmeetShortsColor: "123abc",
      fanmeetSkirtColor: "#123abc",
    })).toMatchObject({
      fanmeetCardiganColor: "#ABCDEF",
      fanmeetInnerColor: "#ABCDEF",
      fanmeetShortsColor: "#123ABC",
      fanmeetSkirtColor: "#123ABC",
    });
  });

  it("preserves every selected setting through JSON storage without display names", () => {
    const { outfitName, ...settings } = draft;
    expect(outfitName).toBe("페스티벌");
    expect(config).toEqual({
      schemaVersion: CHARACTER_CONFIG_SCHEMA_VERSION,
      ...settings,
    });
    expect(restoreCharacterDraft(JSON.parse(JSON.stringify(config)))).toEqual(
      draft,
    );
    expect(
      createCharacterConfig({ ...draft, debug: true } as typeof draft),
    ).not.toHaveProperty("debug");
  });

  it("retains legacy outfit names and single-color fallback for ballet/concert", () => {
    const restored = restoreCharacterDraft({
      outfitName: "마이크 콘서트",
      outfitColor: "abcdef",
    })!;
    expect(restored.outfitModelId).toBe("concert");
    expect(restored.outfitName).toBe("콘서트");
    for (const key of [
      "balletWearColor",
      "balletShortsColor",
      "jacketColor",
      "innerColor",
      "bottomColor",
    ] as const) {
      expect(restored[key]).toBe("#ABCDEF");
    }
    expect(restored).toMatchObject({
      hairStyle: "ponytail",
      eyeStyle: "default",
      mouthStyle: "DEFAULT",
      pose: "standing",
      accessory: "none",
    });
    expect(restored.musicalJacketColor).toBe("#7B61FF");
    expect(restored.festivalTopColor).toBe("#FFF526");
    expect(restored.festivalBottomColor).toBe("#53CBFF");
  });

  it("normalizes invalid legacy values without forwarding unexpected fields", () => {
    expect(
      restoreCharacterDraft({
        outfitName: "재즈",
        hairStyle: [],
        hairColor: 10,
        pose: {},
        accessory: {},
        extra: true,
      }),
    ).toMatchObject({
      hairStyle: "ponytail",
      hairColor: "#151515",
      pose: "standing",
      accessory: "none",
    });
    expect(
      restoreCharacterDraft({ ...config, extra: true }),
    ).not.toHaveProperty("extra");
  });

  it.each([
    null,
    [],
    "invalid",
    1,
    {},
    { schemaVersion: 2, outfitModelId: "concert" },
  ])("rejects unusable stored data: %j", (value) => {
    expect(restoreCharacterDraft(value)).toBeNull();
  });

  it("reads the existing key and safely handles corrupt or unavailable localStorage", () => {
    const getItem = vi.fn().mockReturnValue(JSON.stringify(config));
    vi.stubGlobal("localStorage", { getItem });
    expect(loadSavedCharacter()).toEqual(draft);
    expect(getItem).toHaveBeenCalledWith(CHARACTER_STORAGE_KEY);
    getItem.mockReturnValue("{");
    expect(loadSavedCharacter()).toBeNull();
    getItem.mockReturnValue(null);
    expect(loadSavedCharacter()).toBeNull();
    getItem.mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(loadSavedCharacter()).toBeNull();
  });
});

describe("jazz config compatibility", () => {
  it("preserves independent colors in JSON, localStorage and public display", () => {
    const colors = { jazzShirtColor: "#FF0000", jazzInnerColor: "#00FF00", jazzPantsColor: "#0000FF" };
    const saved = createCharacterConfig(restoreCharacterDraft({ outfitModelId: "rainbow-blouse", ...colors })!);
    const json = JSON.stringify(saved);
    vi.stubGlobal("localStorage", { getItem: () => json });
    expect(saved.schemaVersion).toBe(1);
    expect(loadSavedCharacter()).toMatchObject(colors);
    expect(restoreCharacterForDisplay(JSON.parse(json))).toMatchObject(colors);
    expect(createCharacterConfig(loadSavedCharacter()!)).toEqual(saved);
  });

  it.each([undefined, 1])("restores legacy jazz outfitColor with schema %s", (schemaVersion) => {
    const legacy = { ...config, schemaVersion, outfitModelId: "rainbow-blouse", outfitColor: "#ABCDEF" } as Record<string, unknown>;
    for (const key of ["jazzShirtColor", "jazzInnerColor", "jazzPantsColor"]) delete legacy[key];
    const expected = { jazzShirtColor: "#ABCDEF", jazzInnerColor: "#ABCDEF", jazzPantsColor: "#ABCDEF" };
    expect(restoreCharacterDraft(legacy)).toMatchObject(expected);
    expect(restoreCharacterForDisplay(legacy)).toMatchObject(expected);
  });

  it("normalizes valid fields, falls back per missing/invalid field and rejects invalid public colors", () => {
    const value = { ...config, outfitModelId: "rainbow-blouse", outfitColor: "#ABCDEF", jazzShirtColor: "123abc", jazzInnerColor: null, jazzPantsColor: "bad" };
    expect(restoreCharacterDraft(value)).toMatchObject({ jazzShirtColor: "#123ABC", jazzInnerColor: "#ABCDEF", jazzPantsColor: "#ABCDEF" });
    expect(restoreCharacterForDisplay(value)).toBeNull();
    expect(restoreCharacterDraft({ outfitName: "재즈" })).toMatchObject({ outfitModelId: "rainbow-blouse", jazzShirtColor: "#60A5FA", jazzInnerColor: "#60A5FA", jazzPantsColor: "#60A5FA" });
  });
});

describe("compact UTF-8 byte validation", () => {
  it("accepts a normal config including schemaVersion", () => {
    expect(config.schemaVersion).toBe(1);
    expect(getCharacterConfigByteSize(config)).toBe(
      Buffer.byteLength(JSON.stringify(config), "utf8"),
    );
    expect(getCharacterConfigByteSize(config)).toBeLessThan(
      MAX_CHARACTER_CONFIG_BYTES,
    );
    expect(validateCharacterConfig(config, true)).toBeNull();
  });

  it.each([4095, 4096, 4097])(
    "checks the exact %i-byte boundary including schemaVersion",
    (bytes) => {
      const empty = { ...config, accessory: "" };
      const sized = {
        ...empty,
        accessory: "a".repeat(bytes - getCharacterConfigByteSize(empty)),
      };
      expect(getCharacterConfigByteSize(sized)).toBe(bytes);
      expect(validateCharacterConfig(sized, true) === null).toBe(
        bytes <= MAX_CHARACTER_CONFIG_BYTES,
      );
    },
  );

  it("counts Korean, emoji and JSON escaping as bytes rather than JS characters", () => {
    const multibyte = { ...config, accessory: '한글🎵"\n'.repeat(400) };
    expect(getCharacterConfigByteSize(multibyte)).toBe(
      Buffer.byteLength(JSON.stringify(multibyte), "utf8"),
    );
    expect(JSON.stringify(multibyte).length).toBeLessThan(
      MAX_CHARACTER_CONFIG_BYTES,
    );
    expect(validateCharacterConfig(multibyte, true)).not.toBeNull();
  });

  it("requires a config only when requested (legacy edit remains supported)", () => {
    expect(validateCharacterConfig(undefined, true)).not.toBeNull();
    expect(validateCharacterConfig(null, true)).not.toBeNull();
    expect(validateCharacterConfig(undefined, false)).toBeNull();
  });
});
