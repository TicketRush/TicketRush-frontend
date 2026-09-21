import * as THREE from "three";
import { cloneConcertMaterialWithColor } from "./concertOutfitColor";

const JAZZ_PART_NAMES = {
  shirt: "jazz_shirt",
  inner: "jazz_inner",
  pants: "jazz_pants",
} as const;

type JazzPartColors = Record<keyof typeof JAZZ_PART_NAMES, string>;

/** Match actual GLB nodes or their parents, including Blender suffixes. */
export function findJazzPartColor(object: THREE.Object3D, colors: JazzPartColors): string | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const name = current.name.toLowerCase();
    for (const part of Object.keys(JAZZ_PART_NAMES) as (keyof JazzPartColors)[]) {
      const partName = JAZZ_PART_NAMES[part];
      if (name === partName || name.startsWith(`${partName}.`) || name.startsWith(`${partName}_`)) {
        return colors[part];
      }
    }
    current = current.parent;
  }
  return null;
}

export function applyJazzPartColor(object: THREE.Mesh, colors: JazzPartColors) {
  const color = findJazzPartColor(object, colors);
  if (!color) return;
  // Like concert, jazz has tinted COLOR_0 data. Clone to isolate each part,
  // preserve maps/surface properties, and prevent vertex color multiplication.
  object.material = Array.isArray(object.material)
    ? object.material.map((material) => cloneConcertMaterialWithColor(material, color))
    : cloneConcertMaterialWithColor(object.material, color);
}
