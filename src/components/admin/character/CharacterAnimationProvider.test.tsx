import * as React from "react";
import { AnimationClip, Group, VectorKeyframeTrack } from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CharacterAnimationProvider } from "./CharacterAnimationProvider";
import { CharacterAnimation, type CharacterAnimationRequest } from "./characterAnimation";

// A small effect driver for the existing Node-only test environment. Preserve
// dependencies across renders and run cleanup before replacement/unmount.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as { deps: unknown[]; value?: unknown; cleanup?: () => void }[],
  pending: [] as (() => void)[],
  clips: [] as AnimationClip[],
}));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  const changed = (a: unknown[], b: unknown[]) => a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  return { ...actual,
    useMemo: (factory: () => unknown, deps: unknown[]) => {
      const i = hooks.cursor++;
      if (!hooks.slots[i] || changed(hooks.slots[i].deps, deps)) hooks.slots[i] = { deps, value: factory() };
      return hooks.slots[i].value;
    },
    useLayoutEffect: (effect: () => void | (() => void), deps: unknown[]) => {
      const i = hooks.cursor++;
      if (!hooks.slots[i] || changed(hooks.slots[i].deps, deps)) {
        hooks.pending.push(() => {
          hooks.slots[i]?.cleanup?.();
          hooks.slots[i] = { deps, cleanup: effect() || undefined };
        });
      }
    },
  };
});
vi.mock("@react-three/fiber", () => ({ useFrame: () => {} }));
vi.mock("@react-three/drei", () => ({ useGLTF: () => ({ animations: hooks.clips }) }));

function unmount() {
  for (const slot of hooks.slots) slot.cleanup?.();
  hooks.slots = [];
}
function render(playbackMode?: "one-shot" | "repeat", animationId: "wave" | "cute" = "wave", request?: CharacterAnimationRequest) {
  hooks.cursor = 0;
  const element = CharacterAnimationProvider({ modelUrl: "/models/chibi-base.glb", playbackMode, animationId, request, children: null });
  for (const effect of hooks.pending.splice(0)) effect();
  return element.props.value as CharacterAnimation;
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  hooks.slots = [];
  hooks.pending = [];
  hooks.clips = ["wave", "cute"].map(name => new AnimationClip(name, 1, [new VectorKeyframeTrack(".position", [0, 1], [0, 0, 0, 1, 0, 0])]));
});
afterEach(() => { unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("autoplays once per configuration, survives rerenders, switches and cleans up on re-entry", () => {
  const play = vi.spyOn(CharacterAnimation.prototype, "play");
  const timeline = render("repeat");
  const root = new Group();
  timeline.register(root);
  timeline.update(2.4);
  expect(root.position.x).toBeCloseTo(0.4);
  expect(render("repeat")).toBe(timeline);
  expect(play).toHaveBeenCalledTimes(1);
  timeline.update(0.1);
  expect(root.position.x).toBeCloseTo(0.5);
  render("repeat", "cute");
  expect(play).toHaveBeenLastCalledWith("cute", "repeat");
  expect(root.position.x).toBe(0);
  timeline.update(3.4);
  expect(root.position.x).toBeCloseTo(0.4);
  unmount();
  timeline.update(2);
  expect(root.position.x).toBe(0);
  const next = render("repeat");
  expect(next).not.toBe(timeline);
  expect(play).toHaveBeenLastCalledWith("wave", "repeat");
});

it("keeps the creator idle until requested and restarts one-shot requests", () => {
  const play = vi.spyOn(CharacterAnimation.prototype, "play");
  const timeline = render();
  const root = new Group();
  timeline.register(root);
  expect(play).not.toHaveBeenCalled();
  render(undefined, "wave", { id: "wave", sequence: 1 });
  timeline.update(0.4);
  expect(root.position.x).toBeCloseTo(0.4);
  render(undefined, "wave", { id: "wave", sequence: 2 });
  expect(root.position.x).toBe(0);
  timeline.update(2);
  expect(root.position.x).toBe(0);
  render("repeat");
  timeline.update(0.5);
  render();
  timeline.update(2);
  expect(root.position.x).toBe(0);
});
