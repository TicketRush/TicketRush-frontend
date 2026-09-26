import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { AnimationMixer, Group, Matrix4, SkinnedMesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CHARACTER_ANIMATIONS, CharacterAnimation } from "./characterAnimation";
import { getOutfitModelUrl } from "./characterOutfit";

async function load(path: string) {
  const bytes = readFileSync(`public/models/${path}.glb`);
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
}

describe("shared character animation with real GLBs", () => {
  it.each(CHARACTER_ANIMATIONS)(
    "synchronizes $id, restarts, follows the head and returns to rest",
    async ({ id }) => {
      const base = await load("chibi-base");
      const body = clone(base.scene);
      const hair = clone((await load("hair/hair_short")).scene);
      const outfit = clone((await load("outfits/jazz_outfit")).scene);
      const timeline = new CharacterAnimation(base.animations);
      const rest = body.getObjectByName("Head")!.quaternion.clone();
      const face = new Group();
      timeline.register(body, true);
      timeline.register(hair);
      timeline.register(outfit);
      timeline.registerFace(face);
      timeline.play(id);
      timeline.update(0.8);
      for (const name of ["Root", "Head", "UpperArmL"]) {
        const bone = body.getObjectByName(name);
        if (!bone) continue;
        for (const part of [hair, outfit]) {
          expect(part.getObjectByName(name)!.position.toArray()).toEqual(
            bone.position.toArray(),
          );
          expect(part.getObjectByName(name)!.quaternion.toArray()).toEqual(
            bone.quaternion.toArray(),
          );
        }
      }
      expect(face.matrix.equals(new Matrix4())).toBe(false);
      timeline.play(id);
      timeline.update(0.8);
      expect(hair.getObjectByName("Head")!.quaternion.toArray()).toEqual(
        body.getObjectByName("Head")!.quaternion.toArray(),
      );
      timeline.update(5);
      expect(body.getObjectByName("Head")!.quaternion.toArray()).toEqual(
        rest.toArray(),
      );
      face.matrix.elements.forEach((value, i) =>
        expect(value).toBeCloseTo(new Matrix4().elements[i]),
      );
      expect(base.scene.getObjectByName("Head")!.quaternion.toArray()).toEqual(
        rest.toArray(),
      );
      timeline.dispose();
    },
  );

  it("joins replacement hair/outfits at the current time and releases old actions", async () => {
    const base = await load("chibi-base");
    const timeline = new CharacterAnimation(base.animations);
    const body = clone(base.scene);
    timeline.register(body, true);
    timeline.play("wave");
    timeline.update(0.7);
    const uncache = vi.spyOn(AnimationMixer.prototype, "uncacheRoot");
    for (const file of [
      "hair/hair_long",
      "hair/hair_wave",
      "outfits/festival_outfit",
      "outfits/musical_outfit",
    ]) {
      const scene = clone((await load(file)).scene);
      const remove = timeline.register(scene);
      expect(scene.getObjectByName("Head")!.quaternion.toArray()).toEqual(
        body.getObjectByName("Head")!.quaternion.toArray(),
      );
      timeline.update(0.1);
      expect(scene.getObjectByName("Head")!.quaternion.toArray()).toEqual(
        body.getObjectByName("Head")!.quaternion.toArray(),
      );
      remove();
      expect(uncache).toHaveBeenCalledWith(scene);
      const stopped = scene.getObjectByName("Head")!.quaternion.clone();
      timeline.update(0.1);
      expect(scene.getObjectByName("Head")!.quaternion.toArray()).toEqual(
        stopped.toArray(),
      );
    }
    timeline.dispose();
    expect(uncache).toHaveBeenCalledWith(body);
    uncache.mockRestore();
  });

  it.each([
    "ballet_outfit",
    "classic_outfit",
    "concert_outfit",
    "fanmeet_outfit",
  ])("preserves static mesh transforms in %s", async (file) => {
    const base = await load("chibi-base");
    const scene = clone((await load(`outfits/${file}`)).scene);
    const staticNodes: { object: Group; matrix: Matrix4 }[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse((object) => {
      if (object.type === "Mesh" && !(object instanceof SkinnedMesh))
        staticNodes.push({
          object: object as Group,
          matrix: object.matrixWorld.clone(),
        });
    });
    const timeline = new CharacterAnimation(base.animations);
    timeline.register(scene);
    timeline.play("cute");
    timeline.update(1);
    scene.updateMatrixWorld(true);
    for (const { object, matrix } of staticNodes)
      expect(object.matrixWorld.equals(matrix)).toBe(true);
    timeline.dispose();
  });

  it("connects the stable classic ID", () => {
    expect(getOutfitModelUrl("classic")).toBe(
      "/models/outfits/classic_outfit.glb",
    );
  });
});
