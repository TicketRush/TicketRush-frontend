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
   * 콘서트 외 의상의 기존 단일 색상 값 및
   * 기존 호출부 호환을 위해 유지합니다.
   */
  outfitColor: string;

  /**
   * 콘서트 의상 파츠별 색상입니다.
   *
   * 기존 호출부에서는 전달하지 않아도 되며,
   * 값이 없으면 outfitColor를 fallback으로 사용합니다.
   */
  jacketColor?: string;
  innerColor?: string;
  bottomColor?: string;

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
  eyeStyle: EyeStyle;
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

const CONCERT_PART_NAMES = {
  jacket: "concert_jacket",
  inner: "concert_inner",
  bottom: "concert_shorts",
} as const;

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

function matchesPartName(objectName: string, partName: string) {
  const normalizedName = objectName.toLowerCase();
  const normalizedPartName = partName.toLowerCase();

  return (
    normalizedName === normalizedPartName ||
    normalizedName.startsWith(`${normalizedPartName}.`) ||
    normalizedName.startsWith(`${normalizedPartName}_`)
  );
}

/**
 * Blender의 Object 이름과 실제 Mesh 이름이 다를 수도 있으므로,
 * 현재 Mesh부터 부모 Object까지 올라가며 파츠 이름을 찾습니다.
 */
function findConcertPartColor(
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

function cloneMaterialWithColor(
  material: THREE.Material,
  color: string,
): THREE.Material {
  const clonedMaterial = material.clone() as THREE.Material & {
    color?: THREE.Color;
  };

  if (clonedMaterial.color instanceof THREE.Color) {
    clonedMaterial.color.set(color);
    clonedMaterial.needsUpdate = true;

    return clonedMaterial;
  }

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
  });
}

function OutfitModel({
  modelUrl,
  outfitModelId,
  outfitColor,
  jacketColor,
  innerColor,
  bottomColor,
}: {
  modelUrl: string;
  outfitModelId: OutfitModelId;
  outfitColor: string;
  jacketColor?: string;
  innerColor?: string;
  bottomColor?: string;
}) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    if (outfitModelId !== "concert") {
      return clonedScene;
    }

    const resolvedJacketColor = jacketColor ?? outfitColor;
    const resolvedInnerColor = innerColor ?? outfitColor;
    const resolvedBottomColor = bottomColor ?? outfitColor;

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      const partColor = findConcertPartColor(
        object,
        resolvedJacketColor,
        resolvedInnerColor,
        resolvedBottomColor,
      );

      if (!partColor) {
        return;
      }

      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) =>
          cloneMaterialWithColor(material, partColor),
        );
        return;
      }

      object.material = cloneMaterialWithColor(
        object.material,
        partColor,
      );
    });

    return clonedScene;
  }, [
    gltf.scene,
    outfitModelId,
    outfitColor,
    jacketColor,
    innerColor,
    bottomColor,
  ]);

  return <primitive object={scene} />;
}

function CharacterModel({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitColor,
  jacketColor,
  innerColor,
  bottomColor,
  outfitModelId,
  hairStyle,
  eyeStyle,
}: Pick<
  CharacterModelViewerProps,
  | "modelUrl"
  | "skinColor"
  | "hairColor"
  | "outfitColor"
  | "jacketColor"
  | "innerColor"
  | "bottomColor"
  | "outfitModelId"
  | "hairStyle"
  | "eyeStyle"
>) {
  const outfitModelUrl = getOutfitModelUrl(outfitModelId);

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
        />

        <HairModel
          hairStyle={hairStyle}
          hairColor={hairColor}
        />

        <EyeModel eyeStyle={eyeStyle} />

        {outfitModelUrl && (
          <Suspense fallback={null}>
            <OutfitModel
              modelUrl={outfitModelUrl}
              outfitModelId={outfitModelId}
              outfitColor={outfitColor}
              jacketColor={jacketColor}
              innerColor={innerColor}
              bottomColor={bottomColor}
            />
          </Suspense>
        )}
      </group>
    </Center>
  );
}

export default function CharacterModelViewer({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitColor,
  jacketColor,
  innerColor,
  bottomColor,
  outfitModelId,
  hairStyle,
  eyeStyle,
}: CharacterModelViewerProps) {
  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 1.2, 6], fov: 35 }}>
        <ambientLight intensity={1.7} />

        <directionalLight
          position={[3, 5, 5]}
          intensity={2.2}
        />

        <directionalLight
          position={[-3, 2, 2]}
          intensity={0.8}
        />

        <Suspense fallback={<CharacterModelLoadingFallback />}>
          <CharacterModel
            modelUrl={modelUrl}
            skinColor={skinColor}
            hairColor={hairColor}
            outfitColor={outfitColor}
            jacketColor={jacketColor}
            innerColor={innerColor}
            bottomColor={bottomColor}
            outfitModelId={outfitModelId}
            hairStyle={hairStyle}
            eyeStyle={eyeStyle}
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

Object.values(OUTFIT_MODEL_URLS).forEach((modelUrl) => {
  if (modelUrl) {
    useGLTF.preload(modelUrl);
  }
});