import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";
import type { HairStyle } from "@/components/admin/character/characterHair";
import {
  DEFAULT_FESTIVAL_BOTTOM_COLOR,
  DEFAULT_FESTIVAL_TOP_COLOR,
  FESTIVAL_OUTFIT_PART_NAMES,
  getOutfitModelUrl,
  OUTFIT_MODEL_URLS,
  type OutfitModelId,
} from "@/components/admin/character/characterOutfit";

export type { HairStyle } from "@/components/admin/character/characterHair";
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
}

const HAIR_MODEL_URLS: Record<HairStyle, string> = {
  short: "/models/hair/hair_short.glb",
  long: "/models/hair/hair_long.glb",
  ponytail: "/models/hair/hair_ponytail.glb",
  twintails: "/models/hair/hair_twintails.glb",
  wave: "/models/hair/hair_wave.glb",
};

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
  festivalTopColor,
  festivalBottomColor,
}: {
  modelUrl: string;
  outfitModelId: OutfitModelId;
  festivalTopColor: string;
  festivalBottomColor: string;
}) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    if (outfitModelId !== "festival") {
      return clonedScene;
    }

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
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
  hairStyle,
  festivalTopColor = DEFAULT_FESTIVAL_TOP_COLOR,
  festivalBottomColor = DEFAULT_FESTIVAL_BOTTOM_COLOR,
}: Pick<
  CharacterModelViewerProps,
  | "modelUrl"
  | "skinColor"
  | "hairColor"
  | "outfitModelId"
  | "hairStyle"
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

        {outfitModelUrl && (
          <Suspense fallback={null}>
            <OutfitModel
              modelUrl={outfitModelUrl}
              outfitModelId={outfitModelId}
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
  hairStyle,
  festivalTopColor = DEFAULT_FESTIVAL_TOP_COLOR,
  festivalBottomColor = DEFAULT_FESTIVAL_BOTTOM_COLOR,
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
            outfitModelId={outfitModelId}
            hairStyle={hairStyle}
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

Object.values(OUTFIT_MODEL_URLS).forEach((modelUrl) => {
  if (modelUrl) {
    useGLTF.preload(modelUrl);
  }
});