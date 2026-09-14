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
   * 기존 단일 의상 색상 값입니다.
   * 발레 파츠별 색상 값이 없는 기존 데이터의 fallback으로도 사용합니다.
   */
  outfitColor: string;

  /**
   * #277 발레 의상 파츠별 색상입니다.
   */
  balletWearColor?: string;
  balletShortsColor?: string;

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

const BALLET_PART_NAMES = {
  wear: "ballet_wear",
  shorts: "ballet_shorts",
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

function matchesPartName(
  objectName: string,
  partName: string,
) {
  const normalizedObjectName =
    objectName.toLowerCase();

  const normalizedPartName =
    partName.toLowerCase();

  return (
    normalizedObjectName === normalizedPartName ||
    normalizedObjectName.startsWith(
      `${normalizedPartName}.`,
    ) ||
    normalizedObjectName.startsWith(
      `${normalizedPartName}_`,
    )
  );
}

function findBalletPartColor(
  object: THREE.Object3D,
  balletWearColor: string,
  balletShortsColor: string,
) {
  let current: THREE.Object3D | null = object;

  while (current) {
    if (
      matchesPartName(
        current.name,
        BALLET_PART_NAMES.wear,
      )
    ) {
      return balletWearColor;
    }

    if (
      matchesPartName(
        current.name,
        BALLET_PART_NAMES.shorts,
      )
    ) {
      return balletShortsColor;
    }

    current = current.parent;
  }

  return null;
}

/**
 * 사용자가 선택한 HEX 색상이 기존 GLB의 Base Color나
 * Base Color Texture와 곱해지지 않도록 새 Material을 생성합니다.
 *
 * 기존 Material의 표면 특성 중 필요한 값만 유지하고
 * 기존 color/map은 사용하지 않습니다.
 */
function createMaterialWithColor(
  material: THREE.Material,
  color: string,
): THREE.Material {
  if (material instanceof THREE.MeshStandardMaterial) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: material.roughness,
      metalness: material.metalness,
      opacity: material.opacity,
      transparent: material.transparent,
      alphaTest: material.alphaTest,
      side: material.side,

      /**
       * Base Color Texture(map)는 일부러 복사하지 않습니다.
       * map을 유지하면 선택 색상과 원본 텍스처 색상이 곱해집니다.
       */
      map: null,

      /**
       * 색상과 직접 관계없는 표면 디테일은 유지할 수 있습니다.
       */
      normalMap: material.normalMap,
      normalScale: material.normalScale.clone(),
      roughnessMap: material.roughnessMap,
      metalnessMap: material.metalnessMap,

      depthTest: material.depthTest,
      depthWrite: material.depthWrite,
    });
  }

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0,
    side: material.side,
  });
}

function OutfitModel({
  modelUrl,
  outfitModelId,
  outfitColor,
  balletWearColor,
  balletShortsColor,
}: {
  modelUrl: string;
  outfitModelId: OutfitModelId;
  outfitColor: string;
  balletWearColor?: string;
  balletShortsColor?: string;
}) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    if (outfitModelId !== "ballet") {
      return clonedScene;
    }

    const resolvedBalletWearColor =
      balletWearColor ?? outfitColor;

    const resolvedBalletShortsColor =
      balletShortsColor ?? outfitColor;

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      const partColor = findBalletPartColor(
        object,
        resolvedBalletWearColor,
        resolvedBalletShortsColor,
      );

      if (!partColor) {
        return;
      }

      if (Array.isArray(object.material)) {
        object.material = object.material.map(
          (material) =>
            createMaterialWithColor(
              material,
              partColor,
            ),
        );

        return;
      }

      object.material = createMaterialWithColor(
        object.material,
        partColor,
      );
    });

    return clonedScene;
  }, [
    gltf.scene,
    outfitModelId,
    outfitColor,
    balletWearColor,
    balletShortsColor,
  ]);

  return <primitive object={scene} />;
}

function CharacterModel({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitColor,
  balletWearColor,
  balletShortsColor,
  outfitModelId,
  hairStyle,
  eyeStyle,
}: Pick<
  CharacterModelViewerProps,
  | "modelUrl"
  | "skinColor"
  | "hairColor"
  | "outfitColor"
  | "balletWearColor"
  | "balletShortsColor"
  | "outfitModelId"
  | "hairStyle"
  | "eyeStyle"
>) {
  const outfitModelUrl =
    getOutfitModelUrl(outfitModelId);

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
              balletWearColor={
                balletWearColor
              }
              balletShortsColor={
                balletShortsColor
              }
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
  balletWearColor,
  balletShortsColor,
  outfitModelId,
  hairStyle,
  eyeStyle,
}: CharacterModelViewerProps) {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{
          position: [0, 1.2, 6],
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
            outfitColor={outfitColor}
            balletWearColor={
              balletWearColor
            }
            balletShortsColor={
              balletShortsColor
            }
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

Object.values(OUTFIT_MODEL_URLS).forEach(
  (modelUrl) => {
    if (modelUrl) {
      useGLTF.preload(modelUrl);
    }
  },
);