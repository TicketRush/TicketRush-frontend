import * as THREE from "three";

const CONCERT_PART_NAMES = {
  jacket: "concert_jacket",
  inner: "concert_inner",
  bottom: "concert_shorts",
} as const;

function matchesPartName(objectName: string, partName: string) {
  const normalizedName = objectName.toLowerCase();
  const normalizedPartName = partName.toLowerCase();

  return (
    normalizedName === normalizedPartName ||
    normalizedName.startsWith(`${normalizedPartName}.`) ||
    normalizedName.startsWith(`${normalizedPartName}_`)
  );
}


export function findConcertPartColor(
  object: THREE.Object3D,
  jacketColor: string,
  innerColor: string,
  bottomColor: string,
): string | null {
  let current: THREE.Object3D | null = object;

  while (current) {
    if (matchesPartName(current.name, CONCERT_PART_NAMES.jacket)) {
      return jacketColor;
    }

    if (matchesPartName(current.name, CONCERT_PART_NAMES.inner)) {
      return innerColor;
    }

    if (matchesPartName(current.name, CONCERT_PART_NAMES.bottom)) {
      return bottomColor;
    }

    current = current.parent;
  }

  return null;
}

export function cloneConcertMaterialWithColor(
  material: THREE.Material,
  color: string,
): THREE.Material {
  const clonedMaterial = material.clone() as THREE.Material & {
    color?: THREE.Color;
    vertexColors?: boolean;
  };

  if (clonedMaterial.color instanceof THREE.Color) {
    clonedMaterial.color.set(color);
    // concert_outfit.glb has tinted COLOR_0 data; do not multiply it into the selected color.
    clonedMaterial.vertexColors = false;
    clonedMaterial.needsUpdate = true;

    return clonedMaterial;
  }

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
  });
}

