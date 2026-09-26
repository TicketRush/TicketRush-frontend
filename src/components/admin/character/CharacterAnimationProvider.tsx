import { useContext, useLayoutEffect, useMemo, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group } from "three";
import {
  CharacterAnimation,
  type CharacterAnimationRequest,
} from "./characterAnimation";

import { AnimationContext } from "./useCharacterAnimationPart";

export function CharacterAnimationProvider({
  modelUrl,
  request,
  children,
}: {
  modelUrl: string;
  request?: CharacterAnimationRequest;
  children: ReactNode;
}) {
  const { animations } = useGLTF(modelUrl);
  const animation = useMemo(
    () => new CharacterAnimation(animations),
    [animations],
  );
  useLayoutEffect(() => () => animation.dispose(), [animation]);
  useLayoutEffect(() => {
    if (request) animation.play(request.id);
  }, [animation, request]);
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
