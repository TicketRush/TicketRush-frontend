import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Center, Html, OrbitControls, useGLTF } from "@react-three/drei";
import type { HairStyle } from "@/components/admin/character/characterHair";
import type { EyeStyle } from "@/components/admin/character/characterEye";
import {
  DEFAULT_MUSICAL_INNER_COLOR,
  DEFAULT_MUSICAL_JACKET_COLOR,
  DEFAULT_MUSICAL_SHORTS_COLOR,
  DEFAULT_FESTIVAL_BOTTOM_COLOR,
  DEFAULT_FESTIVAL_TOP_COLOR,
  MUSICAL_OUTFIT_PART_NAMES,
  FESTIVAL_OUTFIT_PART_NAMES,
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
   * 다른 의상 및 기존 호출부 호환을 위해 유지합니다.
   */
  outfitColor: string;

  /** Ballet part colors fall back to outfitColor when omitted. */
  balletWearColor?: string;
  balletShortsColor?: string;

  /** Concert part colors fall back to outfitColor when omitted. */
  jacketColor?: string;
  innerColor?: string;
  bottomColor?: string;

  musicalJacketColor?: string;
  musicalInnerColor?: string;
  musicalShortsColor?: string;

  /**
   * 페스티벌 의상 상의 색상입니다.
   */
  festivalTopColor?: string;

  /**
   * 페스티벌 의상 하의 색상입니다.
   */
  festivalBottomColor?: string;

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

function isSameHexColor(first: string, second: string) {
  return first.toUpperCase() === second.toUpperCase();
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

function cloneConcertMaterialWithColor(
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

function cloneMaterialWithColor(
  material: THREE.Material,
  color: string,
): THREE.Material {
  const clonedMaterial = material.clone();

  if (clonedMaterial instanceof THREE.MeshStandardMaterial) {
    clonedMaterial.color.set(color);

    /**
     * festival_outfit.glb에는 vertex color가 포함되어 있습니다.
     * 사용자 지정 색상 적용 시 vertex color와 선택 색상이 곱해지는 것을
     * 방지하기 위해 해당 파츠의 vertex color 사용을 해제합니다.
     */
    clonedMaterial.vertexColors = false;
    clonedMaterial.needsUpdate = true;
  }

  return clonedMaterial;
}

function applyMeshColor(object: THREE.Mesh, color: string) {
  if (Array.isArray(object.material)) {
    object.material = object.material.map((material) =>
      cloneMaterialWithColor(material, color),
    );
    return;
  }

  object.material = cloneMaterialWithColor(object.material, color);
}

function OutfitModel({
  modelUrl,
  outfitModelId,
  outfitColor,
  balletWearColor,
  balletShortsColor,
  jacketColor,
  innerColor,
  bottomColor,
  musicalJacketColor,
  musicalInnerColor,
  musicalShortsColor,
  festivalTopColor,
  festivalBottomColor,
}: {
  modelUrl: string;
  outfitModelId: OutfitModelId;
  outfitColor: string;
  balletWearColor?: string;
  balletShortsColor?: string;
  jacketColor?: string;
  innerColor?: string;
  bottomColor?: string;
  musicalJacketColor: string;
  musicalInnerColor: string;
  musicalShortsColor: string;
  festivalTopColor: string;
  festivalBottomColor: string;
}) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    if (
      outfitModelId !== "festival" &&
      outfitModelId !== "musical" &&
      outfitModelId !== "concert" &&
      outfitModelId !== "ballet"
    ) {
      return clonedScene;
    }

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      if (outfitModelId === "ballet") {
        const partColor = findBalletPartColor(
          object,
          balletWearColor ?? outfitColor,
          balletShortsColor ?? outfitColor,
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
        return;
      }

      if (outfitModelId === "concert") {
        const partColor = findConcertPartColor(
          object,
          jacketColor ?? outfitColor,
          innerColor ?? outfitColor,
          bottomColor ?? outfitColor,
        );

        if (!partColor) {
          return;
        }

        if (Array.isArray(object.material)) {
          object.material = object.material.map((material) =>
            cloneConcertMaterialWithColor(material, partColor),
          );
          return;
        }

        object.material = cloneConcertMaterialWithColor(
          object.material,
          partColor,
        );
        return;
      }

      if (outfitModelId === "musical") {
        if (object.name === MUSICAL_OUTFIT_PART_NAMES.jacket) {
          applyMeshColor(object, musicalJacketColor);
          return;
        }

        if (object.name === MUSICAL_OUTFIT_PART_NAMES.inner) {
          applyMeshColor(object, musicalInnerColor);
          return;
        }

        if (object.name === MUSICAL_OUTFIT_PART_NAMES.shorts) {
          applyMeshColor(object, musicalShortsColor);
        }
        return;
      }

      if (
        object.name === FESTIVAL_OUTFIT_PART_NAMES.top &&
        !isSameHexColor(
          festivalTopColor,
          DEFAULT_FESTIVAL_TOP_COLOR,
        )
      ) {
        applyMeshColor(object, festivalTopColor);
      }

      if (
        object.name === FESTIVAL_OUTFIT_PART_NAMES.bottom &&
        !isSameHexColor(
          festivalBottomColor,
          DEFAULT_FESTIVAL_BOTTOM_COLOR,
        )
      ) {
        applyMeshColor(object, festivalBottomColor);
      }
    });

    return clonedScene;
  }, [
    gltf.scene,
    outfitModelId,
    outfitColor,
    balletWearColor,
    balletShortsColor,
    jacketColor,
    innerColor,
    bottomColor,
    musicalJacketColor,
    musicalInnerColor,
    musicalShortsColor,
    festivalTopColor,
    festivalBottomColor,
  ]);

  return <primitive object={scene} />;
}

function CharacterModel({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitModelId,
  outfitColor,
  balletWearColor,
  balletShortsColor,
  jacketColor,
  innerColor,
  bottomColor,
  hairStyle,
  eyeStyle,
  musicalJacketColor = DEFAULT_MUSICAL_JACKET_COLOR,
  musicalInnerColor = DEFAULT_MUSICAL_INNER_COLOR,
  musicalShortsColor = DEFAULT_MUSICAL_SHORTS_COLOR,
  festivalTopColor = DEFAULT_FESTIVAL_TOP_COLOR,
  festivalBottomColor = DEFAULT_FESTIVAL_BOTTOM_COLOR,
}: Pick<
  CharacterModelViewerProps,
  | "modelUrl"
  | "skinColor"
  | "hairColor"
  | "outfitColor"
  | "balletWearColor"
  | "balletShortsColor"
  | "jacketColor"
  | "innerColor"
  | "bottomColor"
  | "outfitModelId"
  | "hairStyle"
  | "eyeStyle"
  | "musicalJacketColor"
  | "musicalInnerColor"
  | "musicalShortsColor"
  | "festivalTopColor"
  | "festivalBottomColor"
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
              balletWearColor={balletWearColor}
              balletShortsColor={balletShortsColor}
              jacketColor={jacketColor}
              innerColor={innerColor}
              bottomColor={bottomColor}
              musicalJacketColor={musicalJacketColor}
              musicalInnerColor={musicalInnerColor}
              musicalShortsColor={musicalShortsColor}
              festivalTopColor={festivalTopColor}
              festivalBottomColor={festivalBottomColor}
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
  outfitModelId,
  outfitColor,
  balletWearColor,
  balletShortsColor,
  jacketColor,
  innerColor,
  bottomColor,
  hairStyle,
  eyeStyle,
  musicalJacketColor = DEFAULT_MUSICAL_JACKET_COLOR,
  musicalInnerColor = DEFAULT_MUSICAL_INNER_COLOR,
  musicalShortsColor = DEFAULT_MUSICAL_SHORTS_COLOR,
  festivalTopColor = DEFAULT_FESTIVAL_TOP_COLOR,
  festivalBottomColor = DEFAULT_FESTIVAL_BOTTOM_COLOR,
}: CharacterModelViewerProps) {
  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 1.2, 6], fov: 35 }}>
        <ambientLight intensity={1.7} />
        <directionalLight position={[3, 5, 5]} intensity={2.2} />
        <directionalLight position={[-3, 2, 2]} intensity={0.8} />

        <Suspense fallback={<CharacterModelLoadingFallback />}>
          <CharacterModel
            modelUrl={modelUrl}
            skinColor={skinColor}
            hairColor={hairColor}
            outfitModelId={outfitModelId}
            outfitColor={outfitColor}
            balletWearColor={balletWearColor}
            balletShortsColor={balletShortsColor}
            jacketColor={jacketColor}
            innerColor={innerColor}
            bottomColor={bottomColor}
            hairStyle={hairStyle}
            eyeStyle={eyeStyle}
            musicalJacketColor={musicalJacketColor}
            musicalInnerColor={musicalInnerColor}
            musicalShortsColor={musicalShortsColor}
            festivalTopColor={festivalTopColor}
            festivalBottomColor={festivalBottomColor}
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
