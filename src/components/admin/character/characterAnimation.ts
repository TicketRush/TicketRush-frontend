import {
  AnimationMixer,
  LoopOnce,
  Matrix4,
  type AnimationAction,
  type AnimationClip,
  type Object3D,
} from "three";

export const CHARACTER_ANIMATIONS = [
  { id: "wave", label: "인사", icon: "👋" },
  { id: "cute", label: "큐트", icon: "🫰" },
  { id: "cover_mouth", label: "입 가리기", icon: "🤭" },
] as const;
export type CharacterAnimationId = (typeof CHARACTER_ANIMATIONS)[number]["id"];
export interface CharacterAnimationRequest {
  id: CharacterAnimationId;
  sequence: number;
}

interface Part {
  root: Object3D;
  mixer: AnimationMixer;
  action?: AnimationAction;
  head?: Object3D;
  inverseRestHead?: Matrix4;
}

/** One timeline for all independently cloned rigs, including parts loaded mid-playback. */
export class CharacterAnimation {
  private parts = new Set<Part>();
  private faces = new Set<Object3D>();
  private clip?: AnimationClip;
  private elapsed = 0;
  private inverseRoot = new Matrix4();
  private headDelta = new Matrix4();

  private clips: AnimationClip[];

  constructor(clips: AnimationClip[]) {
    this.clips = clips;
  }

  register(root: Object3D, body = false) {
    const part: Part = { root, mixer: new AnimationMixer(root) };
    if (body) {
      part.head = root.getObjectByName("Head");
      if (part.head) {
        root.updateWorldMatrix(true, true);
        part.inverseRestHead = new Matrix4()
          .copy(root.matrixWorld)
          .invert()
          .multiply(part.head.matrixWorld)
          .invert();
      }
    }
    this.parts.add(part);
    this.start(part);
    this.updateFaces();
    return () => {
      part.mixer.stopAllAction();
      part.mixer.uncacheRoot(root);
      this.parts.delete(part);
    };
  }

  registerFace(root: Object3D) {
    root.matrixAutoUpdate = false;
    this.faces.add(root);
    this.updateFaces();
    return () => {
      this.faces.delete(root);
    };
  }

  play(id: CharacterAnimationId) {
    this.clip = this.clips.find((clip) => clip.name === id);
    this.elapsed = 0;
    for (const part of this.parts) {
      part.mixer.stopAllAction();
      part.action = undefined;
      this.start(part);
    }
    this.updateFaces();
  }

  private weight() {
    if (!this.clip) return 0;
    return Math.max(
      0,
      Math.min(
        1,
        this.elapsed / 0.15,
        (this.clip.duration - this.elapsed) / 0.15,
      ),
    );
  }

  private start(part: Part) {
    if (!this.clip || this.elapsed >= this.clip.duration) return;
    const action = part.mixer.clipAction(this.clip);
    action
      .reset()
      .setLoop(LoopOnce, 1)
      .setEffectiveWeight(this.weight())
      .play();
    action.time = this.elapsed;
    part.action = action;
    part.mixer.update(0);
  }

  update(delta: number) {
    if (this.clip) {
      this.elapsed += delta;
      for (const part of this.parts) {
        if (this.elapsed >= this.clip.duration) {
          part.mixer.stopAllAction();
          part.action = undefined;
        } else {
          part.action?.setEffectiveWeight(this.weight());
          part.mixer.update(delta);
        }
      }
      if (this.elapsed >= this.clip.duration) this.clip = undefined;
    }
    this.updateFaces();
  }

  private updateFaces() {
    for (const part of this.parts) {
      if (!part.head || !part.inverseRestHead) continue;
      part.root.updateWorldMatrix(true, true);
      this.inverseRoot.copy(part.root.matrixWorld).invert();
      this.headDelta
        .copy(this.inverseRoot)
        .multiply(part.head.matrixWorld)
        .multiply(part.inverseRestHead);
      for (const face of this.faces) {
        face.matrix.copy(this.headDelta);
        face.matrixWorldNeedsUpdate = true;
      }
      break;
    }
  }

  dispose() {
    for (const part of this.parts) {
      part.mixer.stopAllAction();
      part.mixer.uncacheRoot(part.root);
    }
    this.parts.clear();
    this.faces.clear();
    this.clip = undefined;
  }
}
