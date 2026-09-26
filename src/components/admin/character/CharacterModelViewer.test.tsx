import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { Mesh, MeshStandardMaterial, Texture, type Object3D } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import CharacterModelViewer from "./CharacterModelViewer";

const harness = vi.hoisted(() => ({ assets: new Map<string, GLTF>(), roots: [] as Object3D[] }));
// Keep the real GLBs, cloning and material code; replace only WebGL rendering/asset transport.
vi.mock("@react-three/fiber", () => ({ Canvas: ({ children }: { children: React.ReactNode }) => children, useFrame: () => {} }));
vi.mock("@react-three/drei", () => ({
  Center: ({ children }: { children: React.ReactNode }) => children,
  Html: () => null, OrbitControls: () => null,
  useGLTF: Object.assign((url: string) => {
    const asset = harness.assets.get(url);
    if (!asset) throw new Error(`Unexpected asset ${url}`);
    return asset;
  }, { preload: () => {} }),
}));
vi.mock("react/jsx-dev-runtime", async original => {
  const actual = await original<typeof import("react/jsx-dev-runtime")>();
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    const [type, props] = args;
    if (type === "primitive") {
      harness.roots.push(props.object);
      return actual.jsxDEV(React.Fragment, { children: props.children }, args[2], args[3]);
    }
    if (typeof type === "string") return actual.jsxDEV(React.Fragment, { children: props.children }, args[2], args[3]);
    return actual.jsxDEV(...args);
  } };
});

beforeAll(async () => {
  for (const path of ["chibi-base", "hair/hair_short", "eyes/eye_default", "mouths/mouth_default", "outfits/classic_outfit", "outfits/jazz_outfit"]) {
    const bytes = readFileSync(`public/models/${path}.glb`);
    const loader = new GLTFLoader();
    // Node cannot decode face textures; keep geometry/rig/material parsing real.
    // Classic and jazz have no image textures and do not use this adapter.
    loader.register(() => ({ name: "test_face_texture", loadTexture: () => Promise.resolve(new Texture()) }));
    harness.assets.set(`/models/${path}.glb`, await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ""));
  }
});
afterEach(() => vi.unstubAllGlobals());

function render(outfitModelId: "classic" | "rainbow-blouse", color: string) {
  vi.stubGlobal("React", React);
  harness.roots = [];
  renderToStaticMarkup(<CharacterModelViewer outfitModelId={outfitModelId} outfitColor={color} skinColor="#DDAA88" hairColor="#123456" hairStyle="short" eyeStyle="default" />);
  return [...harness.roots];
}
function mesh(roots: Object3D[], name: string) {
  const found = roots.map(root => root.getObjectByName(name)).find(Boolean);
  expect(found).toBeInstanceOf(Mesh);
  return found as Mesh;
}

it("renders classic through the existing viewer and isolates changed colors from cached assets and other parts", () => {
  const cached = mesh([harness.assets.get("/models/outfits/classic_outfit.glb")!.scene], "classic_dress");
  const original = cached.material as MeshStandardMaterial;
  const originalColor = original.color.clone();
  const first = render("classic", "#FF0000");
  const red = mesh(first, "classic_dress").material as MeshStandardMaterial;
  const second = render("classic", "#00FF00");
  const green = mesh(second, "classic_dress").material as MeshStandardMaterial;
  expect(red.color.getHexString()).toBe("ff0000");
  expect(green.color.getHexString()).toBe("00ff00");
  expect(green).not.toBe(red);
  expect(red).not.toBe(original);
  expect(green.vertexColors).toBe(false);
  expect(green.map).toBeNull();
  expect(original.color.equals(originalColor)).toBe(true);
  expect((mesh(second, "hair_short").material as MeshStandardMaterial).color.getHexString()).toBe("123456");
  expect((mesh(second, "body_base").material as MeshStandardMaterial).color.getHexString()).toBe("ddaa88");
  const jazz = render("rainbow-blouse", "#0000FF");
  expect(jazz.some(root => root.getObjectByName("classic_dress"))).toBe(false);
  expect((mesh(jazz, "jazz_shirt").material as MeshStandardMaterial).color.getHexString()).toBe("0000ff");
});
