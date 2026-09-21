import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { applyJazzPartColor, findJazzPartColor } from "./jazzOutfitColor";

const colors = { shirt: "#FF0000", inner: "#00FF00", pants: "#0000FF" };

describe("jazz GLB part colors", () => {
  it("maps real nodes independently, neutralizes tinted vertices and preserves materials", async () => {
    const bytes = readFileSync("public/models/outfits/jazz_outfit.glb");
    const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
    const seen: string[] = [];
    const originals = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      seen.push(object.name);
      const original = object.material as THREE.MeshStandardMaterial;
      originals.add(original);
      const vertices = object.geometry.getAttribute("color");
      expect(vertices).toBeDefined();
      expect(Array.from(vertices.array).some((value) => value !== 1)).toBe(true);
      const expected = colors[object.name.replace("jazz_", "") as keyof typeof colors];
      applyJazzPartColor(object, colors);
      const material = object.material as THREE.MeshStandardMaterial;
      expect(material).not.toBe(original);
      expect(material.color.getHexString()).toBe(expected.slice(1).toLowerCase());
      expect(material.vertexColors).toBe(false);
      expect(original.vertexColors).toBe(true);
      expect(material.roughness).toBe(original.roughness);
      expect(material.metalness).toBe(original.metalness);
      expect(material.map).toBe(original.map);
    });
    expect(seen.sort()).toEqual(["jazz_inner", "jazz_pants", "jazz_shirt"]);
    expect(originals.size).toBe(3);
  });

  it.each(["shirt", "inner", "pants"] as const)("isolates changes to %s even with shared source materials", (part) => {
    const map = new THREE.Texture();
    const source = new THREE.MeshStandardMaterial({ map, normalMap: map, roughness: 0.3 });
    const meshes = Object.keys(colors).map((name) => {
      const mesh = new THREE.Mesh(undefined, [source, source]);
      mesh.name = `jazz_${name}`;
      applyJazzPartColor(mesh, colors);
      return mesh;
    });
    const changed = meshes.find((mesh) => mesh.name === `jazz_${part}`)!;
    applyJazzPartColor(changed, { ...colors, [part]: "#123456" });
    for (const mesh of meshes) {
      for (const material of mesh.material) {
        const key = mesh.name.replace("jazz_", "") as keyof typeof colors;
        expect(material.color.getHexString()).toBe(key === part ? "123456" : colors[key].slice(1).toLowerCase());
        expect(material.map).toBe(map);
        expect(material.normalMap).toBe(map);
        expect(material.roughness).toBe(0.3);
      }
    }
    expect(source.color.getHexString()).toBe("ffffff");
  });

  it("matches parents and Blender suffixes without matching other outfits", () => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh();
    group.add(mesh);
    for (const name of ["jazz_inner", "jazz_inner.001", "jazz_inner_1"]) {
      group.name = name;
      expect(findJazzPartColor(mesh, colors)).toBe(colors.inner);
    }
    for (const name of ["jazz_innerwear", "concert_inner", "fanmeet_inner", "ballet_wear", "musical_inner", "festival_pants"]) {
      group.name = name;
      const original = mesh.material;
      applyJazzPartColor(mesh, colors);
      expect(findJazzPartColor(mesh, colors)).toBeNull();
      expect(mesh.material).toBe(original);
    }
  });
});
