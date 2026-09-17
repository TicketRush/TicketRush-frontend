import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { cloneConcertMaterialWithColor, findConcertPartColor } from "./concertOutfitColor";
import { createCharacterConfig, restoreCharacterDraft } from "@/utils/character/characterConfig";

const colors = ["#FF0000", "#00FF00", "#0000FF"] as const;
async function loadOutfit(name: string) {
  const bytes = readFileSync(`public/models/outfits/${name}_outfit.glb`);
  return (await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "",
  )).scene;
}

describe("concert GLB part colors", () => {
  it("matches actual GLB nodes and neutralizes their tinted vertex colors", async () => {
    const scene = await loadOutfit("concert");
    const expected: Record<string, string> = {
      concert_jacket: "#FF0000", concert_inner: "#00FF00", concert_shorts: "#0000FF",
    };
    const seen: string[] = [];
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      seen.push(object.name);
      const original = object.material as THREE.MeshStandardMaterial;
      expect(original.vertexColors).toBe(true);
      const attribute = object.geometry.getAttribute("color");
      expect(attribute).toBeDefined();
      expect(attribute.getX(0)).toBeLessThan(1);
      const color = findConcertPartColor(object, ...colors);
      expect(color).toBe(expected[object.name]);
      const material = cloneConcertMaterialWithColor(original, color!) as THREE.MeshStandardMaterial;
      expect(material.color.getHexString()).toBe(color!.slice(1).toLowerCase());
      expect(material.vertexColors).toBe(false);
      expect(material.type).toBe(original.type);
      expect(material.roughness).toBe(original.roughness);
      expect(material.metalness).toBe(original.metalness);
      expect(original.map).toBeNull();
      expect(original.emissive.getHex()).toBe(0);
      expect(original.vertexColors).toBe(true);
      expect(material).not.toBe(original);
    });
    expect(seen.sort()).toEqual(Object.keys(expected).sort());
  });

  it("keeps independently cloned parts independent even when the source material is shared", () => {
    const source = new THREE.MeshStandardMaterial({ color: "#AAAAAA", vertexColors: true });
    const jacket = cloneConcertMaterialWithColor(source, colors[0]) as THREE.MeshStandardMaterial;
    const inner = cloneConcertMaterialWithColor(source, colors[1]) as THREE.MeshStandardMaterial;
    const bottom = cloneConcertMaterialWithColor(source, colors[2]) as THREE.MeshStandardMaterial;
    jacket.color.set("#123456");
    expect(inner.color.getHexString()).toBe("00ff00");
    expect(bottom.color.getHexString()).toBe("0000ff");
    expect(source.color.getHexString()).toBe("aaaaaa");
    expect(source.vertexColors).toBe(true);
  });

  it("preserves material type, maps and surface detail without a second color conversion", () => {
    const map = new THREE.Texture();
    const source = new THREE.MeshPhysicalMaterial({ map, normalMap: map, roughness: 0.3, clearcoat: 0.7 });
    const result = cloneConcertMaterialWithColor(source, "#4A83BC") as THREE.MeshPhysicalMaterial;
    expect(result).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(result.color.getHexString()).toBe("4a83bc");
    expect(result.map).toBe(map);
    expect(result.normalMap).toBe(map);
    expect(result.clearcoat).toBe(0.7);
  });

  it("matches parent objects and Blender suffixes but not unrelated prefixes", () => {
    const parent = new THREE.Group(); parent.name = "concert_inner.001";
    const child = new THREE.Mesh(); child.name = "Mesh_3.002"; parent.add(child);
    expect(findConcertPartColor(child, ...colors)).toBe(colors[1]);
    parent.name = "concert_innerwear";
    expect(findConcertPartColor(child, ...colors)).toBeNull();
  });

  it.each(["ballet", "musical", "festival", "fanmeet"])("does not match %s outfit meshes", async (name) => {
    const scene = await loadOutfit(name);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) expect(findConcertPartColor(object, ...colors)).toBeNull();
    });
  });

  it("keeps three colors through storage/API JSON and restoration without outfitColor overriding them", async () => {
    const config = createCharacterConfig(restoreCharacterDraft({ outfitModelId: "concert",
      outfitColor: "#FFFFFF", jacketColor: colors[0], innerColor: colors[1], bottomColor: colors[2],
    })!);
    const restored = restoreCharacterDraft(JSON.parse(JSON.stringify(config)))!;
    expect([restored.jacketColor, restored.innerColor, restored.bottomColor]).toEqual(colors);
    const scene = await loadOutfit("concert");
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const color = findConcertPartColor(object, restored.jacketColor, restored.innerColor, restored.bottomColor)!;
      const material = cloneConcertMaterialWithColor(object.material as THREE.Material, color) as THREE.MeshStandardMaterial;
      expect(material.color.getHexString()).toBe(color.slice(1).toLowerCase());
    });
  });
});
