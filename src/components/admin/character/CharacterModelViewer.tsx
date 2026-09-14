import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import {
  Center,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import type { HairStyle } from "@/components/admin/character/characterHair";
import type { EyeStyle } from "@/components/admin/character/characterEye";
import {
  getOutfitModelUrl,
  OUTFIT_MODEL_URLS,
  type OutfitModelId,
} from "@/components/admin/character/characterOutfit";

export type { HairStyle } from "@/components/admin/character/characterHair";
export type { EyeStyle } from "@/components/admin/character/characterEye";
export type { OutfitModelId } from "@/components/admin/character/characterOutfit";

interface CharacterModelViewerProps {
  modelUrl?: string;
  skinColor: string;
  hairColor: string;

  /**
   * 파츠별 의상 색상 커스터마이징 및 기존 호출부 호환을 위해 유지합니다.
   */
  outfitColor: string;

  /**
   * 화면 표시용 의상 이름입니다.
   * 3D 모델 분기에는 사용하지 않습니다.
   */
  outfitName?: string;

  /**
   * 3D 의상 모델을 선택하기 위한 stable id입니다.
   */
  outfitModelId: OutfitModelId;

  hairStyle: HairStyle;

  /**
   * 전달되지 않으면 default 눈 모양을 사용합니다.
   */
  eyeStyle?: EyeStyle;

  /**
   * 기존 화면 호환용 위치값입니다.
   * centered가 true일 때는 사용하지 않습니다.
   */
  modelPosition?: [number, number, number];

  /**
   * 모델 크기만 조정합니다.
   * 중앙 정렬에는 영향을 주지 않습니다.
   */
  modelScale?: number;

  /**
   * true면 전체 캐릭터의 실제 bounding box를 기준으로
   * Canvas 정중앙에 배치합니다.
   */
  centered?: boolean;
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

function CharacterModelLoadingFallback() {
  return (
    <Html fullscreen pointerEvents="none">
      <div className="flex h-full w-full items-center justify-center">
        <div className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm">
          3D 모델 불러오는 중...
        </div>
      </div>
    </Html>
  );
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

function CharacterBody({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
}: Pick<CharacterModelViewerProps, "modelUrl" | "skinColor">) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      if (isBaseEyeObject(object.name)) {
        object.visible = false;
        return;
      }

      object.material = new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.8,
      });
    });

    return clonedScene;
  }, [gltf.scene, skinColor]);

  return <primitive object={scene} />;
}

function HairModel({
  hairStyle,
  hairColor,
}: Pick<CharacterModelViewerProps, "hairStyle" | "hairColor">) {
  const hairModelUrl =
    HAIR_MODEL_URLS[hairStyle] ?? HAIR_MODEL_URLS.short;

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
  eyeStyle = "default",
}: Pick<CharacterModelViewerProps, "eyeStyle">) {
  const eyeModelUrl =
    EYE_MODEL_URLS[eyeStyle] ?? EYE_MODEL_URLS.default;

  const gltf = useGLTF(eyeModelUrl);

  const scene = useMemo(() => {
    return gltf.scene.clone(true);
  }, [gltf.scene]);

  return <primitive object={scene} />;
}

function OutfitModel({
  modelUrl,
}: {
  modelUrl: string;
}) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    return gltf.scene.clone(true);
  }, [gltf.scene]);

  return <primitive object={scene} />;
}

function CharacterParts({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitModelId,
  hairStyle,
  eyeStyle = "default",
  modelScale = 0.8,
  position,
}: Pick<
  CharacterModelViewerProps,
  | "modelUrl"
  | "skinColor"
  | "hairColor"
  | "outfitModelId"
  | "hairStyle"
  | "eyeStyle"
  | "modelScale"
> & {
  position: [number, number, number];
}) {
  const outfitModelUrl =
    getOutfitModelUrl(outfitModelId);

  return (
    <group
      scale={modelScale}
      position={position}
      rotation={[0, 0, 0]}
    >
      <CharacterBody
        modelUrl={modelUrl}
        skinColor={skinColor}
      />

      <HairModel
        hairStyle={hairStyle}
        hairColor={hairColor}
      />

      <EyeModel eyeStyle={eyeStyle} />

      {/*
        OutfitModel도 별도 Suspense로 감싸지 않습니다.

        body / hair / eyes / outfit 전체가 준비된 뒤에
        바깥 Suspense가 한 번에 렌더링하게 해서
        Center가 완성된 캐릭터 전체의 bounds를 계산하도록 합니다.
      */}
      {outfitModelUrl && (
        <OutfitModel
          modelUrl={outfitModelUrl}
        />
      )}
    </group>
  );
}

function CharacterModel({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitModelId,
  hairStyle,
  eyeStyle = "default",
  modelPosition = [0, -0.4, 0],
  modelScale = 0.8,
  centered = false,
}: Pick<
  CharacterModelViewerProps,
  | "modelUrl"
  | "skinColor"
  | "hairColor"
  | "outfitModelId"
  | "hairStyle"
  | "eyeStyle"
  | "modelPosition"
  | "modelScale"
  | "centered"
>) {
  if (centered) {
    return (
      <Center precise>
        <CharacterParts
          modelUrl={modelUrl}
          skinColor={skinColor}
          hairColor={hairColor}
          outfitModelId={outfitModelId}
          hairStyle={hairStyle}
          eyeStyle={eyeStyle}
          modelScale={modelScale}
          position={[0, 0, 0]}
        />
      </Center>
    );
  }

  return (
    <Center>
      <CharacterParts
        modelUrl={modelUrl}
        skinColor={skinColor}
        hairColor={hairColor}
        outfitModelId={outfitModelId}
        hairStyle={hairStyle}
        eyeStyle={eyeStyle}
        modelScale={modelScale}
        position={modelPosition}
      />
    </Center>
  );
}

export default function CharacterModelViewer({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitModelId,
  hairStyle,
  eyeStyle = "default",
  modelPosition = [0, -0.4, 0],
  modelScale = 0.8,
  centered = false,
}: CharacterModelViewerProps) {
  const cameraPosition: [number, number, number] =
    centered
      ? [0, 0, 6]
      : [0, 1.2, 6];

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{
          position: cameraPosition,
          fov: 35,
        }}
      >
        <ambientLight intensity={1.7} />

        <directionalLight
          position={[3, 5, 5]}
          intensity={2.2}
        />

        <directionalLight
          position={[-3, 2, 2]}
          intensity={0.8}
        />

        <Suspense
          fallback={
            <CharacterModelLoadingFallback />
          }
        >
          <CharacterModel
            modelUrl={modelUrl}
            skinColor={skinColor}
            hairColor={hairColor}
            outfitModelId={outfitModelId}
            hairStyle={hairStyle}
            eyeStyle={eyeStyle}
            modelPosition={modelPosition}
            modelScale={modelScale}
            centered={centered}
          />
        </Suspense>

        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enablePan={false}
          enableZoom
          minDistance={2.5}
          maxDistance={7}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(
  "/models/chibi-base.glb",
);

useGLTF.preload(
  "/models/hair/hair_short.glb",
);
useGLTF.preload(
  "/models/hair/hair_long.glb",
);
useGLTF.preload(
  "/models/hair/hair_ponytail.glb",
);
useGLTF.preload(
  "/models/hair/hair_twintails.glb",
);
useGLTF.preload(
  "/models/hair/hair_wave.glb",
);

useGLTF.preload(
  "/models/eyes/eye_default.glb",
);
useGLTF.preload(
  "/models/eyes/eye_happy.glb",
);
useGLTF.preload(
  "/models/eyes/eye_wink.glb",
);
useGLTF.preload(
  "/models/eyes/eye_squeeze.glb",
);
useGLTF.preload(
  "/models/eyes/eye_angry.glb",
);
useGLTF.preload(
  "/models/eyes/eye_closed.glb",
);

Object.values(
  OUTFIT_MODEL_URLS,
).forEach((modelUrl) => {
  if (modelUrl) {
    useGLTF.preload(modelUrl);
  }
});