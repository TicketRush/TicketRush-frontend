import { useContext, useLayoutEffect, useMemo, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group } from "three";
import {
  CharacterAnimation,
  type CharacterAnimationRequest,
  type CharacterAnimationId,
  type CharacterPlaybackMode,
} from "./characterAnimation";

import { AnimationContext } from "./useCharacterAnimationPart";

export function CharacterAnimationProvider({
  modelUrl,
  request,
  playbackMode = "one-shot",
  animationId = "wave",
  children,
}: {
  modelUrl: string;
  request?: CharacterAnimationRequest;
  playbackMode?: CharacterPlaybackMode;
  animationId?: CharacterAnimationId;
  children: ReactNode;
}) {
  const { animations } = useGLTF(modelUrl);
  const animation = useMemo(
    () => new CharacterAnimation(animations),
    [animations],
  );
  useLayoutEffect(() => () => animation.dispose(), [animation]);
  useLayoutEffect(() => {
    if (playbackMode === "repeat") animation.play(animationId, "repeat");
    else if (request) animation.play(request.id);
    else animation.stop();
  }, [animation, request, playbackMode, animationId]);
  useFrame((_, delta) => animation.update(delta));
  return (
    <AnimationContext.Provider value={animation}>
      {children}
    </AnimationContext.Provider>
  );
}

export function CharacterFace({ children }: { children: ReactNode }) {
  const animation = useContext(AnimationContext);
  const group = useMemo(() => new Group(), []);
  useLayoutEffect(() => animation?.registerFace(group), [animation, group]);
  return <primitive object={group}>{children}</primitive>;
}
