import { createContext, useContext, useLayoutEffect } from "react";
import { Mesh, SkinnedMesh, type Material, type Object3D } from "three";
import type { CharacterAnimation } from "./characterAnimation";

export const AnimationContext = createContext<CharacterAnimation | null>(null);

export function useCharacterAnimationPart(
  scene: Object3D,
  source: Object3D,
  body = false,
) {
  const animation = useContext(AnimationContext);
  useLayoutEffect(() => {
    const unregister = animation?.register(scene, body);
    const sharedMaterials = new Set<Material>();
    source.traverse((object) => {
      if (object instanceof Mesh) {
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          sharedMaterials.add(material);
      }
    });
    return () => {
      unregister?.();
      const ownedMaterials = new Set<Material>();
      scene.traverse((object) => {
        if (object instanceof SkinnedMesh) object.skeleton.dispose();
        if (object instanceof Mesh) {
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            if (!sharedMaterials.has(material)) ownedMaterials.add(material);
          }
        }
      });
      for (const material of ownedMaterials) material.dispose();
    };
  }, [animation, scene, source, body]);
}
