import {
  Component,
  Suspense,
  useMemo,
  type ErrorInfo,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";
import type { HairStyle } from "@/components/admin/character/characterHair";
import type { EyeStyle } from "@/components/admin/character/characterEye";
import type { MouthStyle } from "@/components/admin/character/characterMouth";

export type { HairStyle } from "@/components/admin/character/characterHair";
export type { EyeStyle } from "@/components/admin/character/characterEye";
export type { MouthStyle } from "@/components/admin/character/characterMouth";

interface CharacterModelViewerProps {
  modelUrl?: string;
  skinColor: string;
  hairColor: string;
  outfitColor: string;
  hairStyle: HairStyle;
  eyeStyle: EyeStyle;
  mouthStyle: MouthStyle;
}

const HAIR_MODEL_URLS: Record<HairStyle, string> = {
  short: "/models/hair/hair_short.glb",
  long: "/models/hair/hair_long.glb",
  ponytail: "/models/hair/hair_ponytail.glb",
  twintails: "/models/hair/hair_twintails.glb",
  wave: "/models/hair/hair_wave.glb",
};

const EYE_MODEL_URLS: Record<EyeStyle, string> = {
  default: "/models/eyes/eye_default.glb",
  happy: "/models/eyes/eye_happy.glb",
  wink: "/models/eyes/eye_wink.glb",
  squeeze: "/models/eyes/eye_squeeze.glb",
  angry: "/models/eyes/eye_angry.glb",
  closed: "/models/eyes/eye_closed.glb",
};

const MOUTH_MODEL_URLS: Record<MouthStyle, string> = {
  DEFAULT: "/models/mouths/mouth_default.glb",
  SMILE: "/models/mouths/mouth_smile.glb",
  OPEN_SMILE: "/models/mouths/mouth_open_smile.glb",
  PUCKER: "/models/mouths/mouth_pucker.glb",
  CAT: "/models/mouths/mouth_cat.glb",
  ROUND: "/models/mouths/mouth_round.glb",
};

function getPartType(objectName: string) {
  const name = objectName.toLowerCase();

  if (name.startsWith("body_")) {
    return "body";
  }

  if (name.startsWith("clothes_")) {
    return "clothes";
  }

  return "other";
}

function isBaseEyeObject(objectName: string) {
  const name = objectName.toLowerCase();

  return (
    name === "eye" ||
    name === "eyes" ||
    name.startsWith("eye_") ||
    name.startsWith("eyes_") ||
    name.endsWith("_eye") ||
    name.endsWith("_eyes")
  );
}

function isBaseMouthObject(objectName: string) {
  const name = objectName.toLowerCase();

  return (
    name === "mouth" ||
    name === "mouths" ||
    name.startsWith("mouth_") ||
    name.startsWith("mouths_") ||
    name.endsWith("_mouth") ||
    name.endsWith("_mouths")
  );
}

function CharacterBody({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  outfitColor,
}: Pick<
  CharacterModelViewerProps,
  "modelUrl" | "skinColor" | "outfitColor"
>) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      if (isBaseEyeObject(object.name) || isBaseMouthObject(object.name)) {
        object.visible = false;
        return;
      }

      const partType = getPartType(object.name);

      if (partType === "body") {
        object.material = new THREE.MeshStandardMaterial({
          color: skinColor,
          roughness: 0.8,
        });
      }

      if (partType === "clothes") {
        object.material = new THREE.MeshStandardMaterial({
          color: outfitColor,
          roughness: 0.75,
        });
      }
    });

    return clonedScene;
  }, [gltf.scene, skinColor, outfitColor]);

  return <primitive object={scene} />;
}

function HairModel({
  hairStyle,
  hairColor,
}: Pick<CharacterModelViewerProps, "hairStyle" | "hairColor">) {
  const hairModelUrl = HAIR_MODEL_URLS[hairStyle];
  const gltf = useGLTF(hairModelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      object.material = new THREE.MeshStandardMaterial({
        color: hairColor,
        roughness: 0.85,
      });
    });

    return clonedScene;
  }, [gltf.scene, hairColor]);

  return <primitive object={scene} />;
}

function EyeModel({
  eyeStyle,
}: Pick<CharacterModelViewerProps, "eyeStyle">) {
  const eyeModelUrl = EYE_MODEL_URLS[eyeStyle];
  const gltf = useGLTF(eyeModelUrl);

  const scene = useMemo(() => {
    return gltf.scene.clone(true);
  }, [gltf.scene]);

  return <primitive object={scene} />;
}

function MouthAsset({ mouthStyle }: { mouthStyle: MouthStyle }) {
  const mouthModelUrl = MOUTH_MODEL_URLS[mouthStyle];
  const gltf = useGLTF(mouthModelUrl);

  const scene = useMemo(() => {
    return gltf.scene.clone(true);
  }, [gltf.scene]);

  return <primitive object={scene} />;
}

interface MouthErrorBoundaryProps {
  children: ReactNode;
  mouthStyle: MouthStyle;
}

interface MouthErrorBoundaryState {
  hasError: boolean;
}

class MouthErrorBoundary extends Component<
  MouthErrorBoundaryProps,
  MouthErrorBoundaryState
> {
  state: MouthErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): MouthErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("입 모델을 불러오지 못했습니다.", error, errorInfo);
  }

  componentDidUpdate(prevProps: MouthErrorBoundaryProps) {
    if (
      prevProps.mouthStyle !== this.props.mouthStyle &&
      this.state.hasError
    ) {
      this.setState({
        hasError: false,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.mouthStyle === "DEFAULT") {
        return null;
      }

      return <MouthAsset mouthStyle="DEFAULT" />;
    }

    return this.props.children;
  }
}

function MouthModel({
  mouthStyle,
}: Pick<CharacterModelViewerProps, "mouthStyle">) {
  return (
    <MouthErrorBoundary
      key={mouthStyle}
      mouthStyle={mouthStyle}
    >
      <MouthAsset mouthStyle={mouthStyle} />
    </MouthErrorBoundary>
  );
}

function CharacterModel({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitColor,
  hairStyle,
  eyeStyle,
  mouthStyle,
}: CharacterModelViewerProps) {
  return (
    <Center>
      <group
        scale={0.8}
        position={[0, -0.4, 0]}
        rotation={[0, 0, 0]}
      >
        <CharacterBody
          modelUrl={modelUrl}
          skinColor={skinColor}
          outfitColor={outfitColor}
        />

        <HairModel
          hairStyle={hairStyle}
          hairColor={hairColor}
        />

        <EyeModel eyeStyle={eyeStyle} />

        <MouthModel mouthStyle={mouthStyle} />
      </group>
    </Center>
  );
}

export default function CharacterModelViewer({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitColor,
  hairStyle,
  eyeStyle,
  mouthStyle,
}: CharacterModelViewerProps) {
  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 1.2, 6], fov: 35 }}>
        <ambientLight intensity={1.7} />
        <directionalLight position={[3, 5, 5]} intensity={2.2} />
        <directionalLight position={[-3, 2, 2]} intensity={0.8} />

        <Suspense fallback={null}>
          <CharacterModel
            modelUrl={modelUrl}
            skinColor={skinColor}
            hairColor={hairColor}
            outfitColor={outfitColor}
            hairStyle={hairStyle}
            eyeStyle={eyeStyle}
            mouthStyle={mouthStyle}
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={2.5}
          maxDistance={7}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/chibi-base.glb");

useGLTF.preload("/models/hair/hair_short.glb");
useGLTF.preload("/models/hair/hair_long.glb");
useGLTF.preload("/models/hair/hair_ponytail.glb");
useGLTF.preload("/models/hair/hair_twintails.glb");
useGLTF.preload("/models/hair/hair_wave.glb");

useGLTF.preload("/models/eyes/eye_default.glb");
useGLTF.preload("/models/eyes/eye_happy.glb");
useGLTF.preload("/models/eyes/eye_wink.glb");
useGLTF.preload("/models/eyes/eye_squeeze.glb");
useGLTF.preload("/models/eyes/eye_angry.glb");
useGLTF.preload("/models/eyes/eye_closed.glb");

useGLTF.preload("/models/mouths/mouth_default.glb");
useGLTF.preload("/models/mouths/mouth_smile.glb");
useGLTF.preload("/models/mouths/mouth_open_smile.glb");
useGLTF.preload("/models/mouths/mouth_pucker.glb");
useGLTF.preload("/models/mouths/mouth_cat.glb");
useGLTF.preload("/models/mouths/mouth_round.glb");