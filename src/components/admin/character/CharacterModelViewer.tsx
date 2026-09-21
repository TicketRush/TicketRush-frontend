import { applyJazzPartColor } from "./jazzOutfitColor";
import { findConcertPartColor, cloneConcertMaterialWithColor } from "./concertOutfitColor";
import {
  Component,
  Suspense,
  useMemo,
  type ErrorInfo,
  type ReactNode,
} from "react";

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
  DEFAULT_FANMEET_CARDIGAN_COLOR,
  DEFAULT_FANMEET_INNER_COLOR,
  DEFAULT_FANMEET_SHORTS_COLOR,
  DEFAULT_FANMEET_SKIRT_COLOR,
  DEFAULT_FESTIVAL_TOP_COLOR,
  MUSICAL_OUTFIT_PART_NAMES,
  FESTIVAL_OUTFIT_PART_NAMES,
  FANMEET_OUTFIT_PART_NAMES,
  getOutfitModelUrl,
  OUTFIT_MODEL_URLS,
  type OutfitModelId,
} from "@/components/admin/character/characterOutfit";

import type { MouthStyle } from "@/components/admin/character/characterMouth";

export type { HairStyle } from "@/components/admin/character/characterHair";
export type { MouthStyle } from "@/components/admin/character/characterMouth";
export type { EyeStyle } from "@/components/admin/character/characterEye";
export type { OutfitModelId } from "@/components/admin/character/characterOutfit";

interface CharacterModelViewerProps {
  modelUrl?: string;
  /** Used when centered is false. */
  modelPosition?: [number, number, number];
  modelScale?: number;
  /** Center all loaded parts, including the outfit, using their bounds. */
  centered?: boolean;
  skinColor: string;
  hairColor: string;

  /**
   * 기존 단일 의상 색상 값입니다.
   * 다른 의상 및 기존 호출부 호환을 위해 유지합니다.
   *
   * 팬미팅 의상에서는 카디건과 스커트에 적용합니다.
   */
  outfitColor: string;
  jazzShirtColor?: string;
  jazzInnerColor?: string;
  jazzPantsColor?: string;

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
  fanmeetCardiganColor?: string;
  fanmeetInnerColor?: string;
  fanmeetShortsColor?: string;
  fanmeetSkirtColor?: string;

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
  mouthStyle?: MouthStyle;
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

const MOUTH_MODEL_URLS: Record<MouthStyle, string> = {
  DEFAULT: "/models/mouths/mouth_default.glb",
  SMILE: "/models/mouths/mouth_smile.glb",
  OPEN_SMILE: "/models/mouths/mouth_open_smile.glb",
  PUCKER: "/models/mouths/mouth_pucker.glb",
  CAT: "/models/mouths/mouth_cat.glb",
  ROUND: "/models/mouths/mouth_round.glb",
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

function isSameHexColor(first: string, second: string) {
  return first.toUpperCase() === second.toUpperCase();
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
}: Pick<CharacterModelViewerProps, "modelUrl" | "skinColor">) {
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
  const hairModelUrl = HAIR_MODEL_URLS[hairStyle] ?? HAIR_MODEL_URLS.short;
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
  const eyeModelUrl = EYE_MODEL_URLS[eyeStyle] ?? EYE_MODEL_URLS.default;
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

      return (
        <MouthErrorBoundary mouthStyle="DEFAULT">
          <MouthAsset mouthStyle="DEFAULT" />
        </MouthErrorBoundary>
      );
    }

    return this.props.children;
  }
}

function MouthModel({
  mouthStyle = "DEFAULT",
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
function findBalletPartColor(
  object: THREE.Object3D,
  balletWearColor: string,
  balletShortsColor: string,
): string | null {
  let current: THREE.Object3D | null = object;

  while (current) {
    if (matchesPartName(current.name, BALLET_PART_NAMES.wear)) {
      return balletWearColor;
    }

    if (matchesPartName(current.name, BALLET_PART_NAMES.shorts)) {
      return balletShortsColor;
    }

    current = current.parent;
  }

  return null;
}

/** Match the mesh or its parent object, including Blender name suffixes. */
function findFanmeetPartColor(
  object: THREE.Object3D,
  colors: Record<keyof typeof FANMEET_OUTFIT_PART_NAMES, string>,
): string | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    for (const part of Object.keys(FANMEET_OUTFIT_PART_NAMES) as (keyof typeof FANMEET_OUTFIT_PART_NAMES)[]) {
      if (matchesPartName(current.name, FANMEET_OUTFIT_PART_NAMES[part])) {
        return colors[part];
      }
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

/**
 * GLB의 원래 Base Color / Base Color Texture에 영향받지 않고
 * 지정한 색상을 그대로 적용합니다.
 */
function applyMeshColorWithoutBaseTexture(
  object: THREE.Mesh,
  color: string,
) {
  if (Array.isArray(object.material)) {
    object.material = object.material.map((material) =>
      createMaterialWithColor(material, color),
    );
    return;
  }

  object.material = createMaterialWithColor(
    object.material,
    color,
  );
}

function OutfitModel({
  modelUrl,
  outfitModelId,
  outfitColor,
  jazzShirtColor,
  jazzInnerColor,
  jazzPantsColor,
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
  fanmeetCardiganColor,
  fanmeetInnerColor,
  fanmeetShortsColor,
  fanmeetSkirtColor,
}: {
  modelUrl: string;
  outfitModelId: OutfitModelId;
  outfitColor: string;
  jazzShirtColor?: string;
  jazzInnerColor?: string;
  jazzPantsColor?: string;
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
  fanmeetCardiganColor: string;
  fanmeetInnerColor: string;
  fanmeetShortsColor: string;
  fanmeetSkirtColor: string;
}) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    if (
      outfitModelId !== "festival" &&
      outfitModelId !== "musical" &&
      outfitModelId !== "concert" &&
      outfitModelId !== "ballet" &&
      outfitModelId !== "theater" &&
      outfitModelId !== "rainbow-blouse"
    ) {
      return clonedScene;
    }

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      if (outfitModelId === "rainbow-blouse") {
        applyJazzPartColor(object, {
          shirt: jazzShirtColor ?? outfitColor,
          inner: jazzInnerColor ?? outfitColor,
          pants: jazzPantsColor ?? outfitColor,
        });
        return;
      }

      if (outfitModelId === "theater") {
        const partColor = findFanmeetPartColor(object, {
          cardigan: fanmeetCardiganColor,
          inner: fanmeetInnerColor,
          shorts: fanmeetShortsColor,
          skirt: fanmeetSkirtColor,
        });
        if (partColor) applyMeshColorWithoutBaseTexture(object, partColor);
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
    jazzShirtColor,
    jazzInnerColor,
    jazzPantsColor,
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
    fanmeetCardiganColor,
    fanmeetInnerColor,
    fanmeetShortsColor,
    fanmeetSkirtColor,
  ]);

  return <primitive object={scene} />;
}

function CharacterModel({
  modelPosition = [0, -0.4, 0],
  modelScale = 0.8,
  centered = false,
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitModelId,
  outfitColor,
  jazzShirtColor,
  jazzInnerColor,
  jazzPantsColor,
  balletWearColor,
  balletShortsColor,
  jacketColor,
  innerColor,
  bottomColor,
  hairStyle,
  eyeStyle = "default",
  mouthStyle = "DEFAULT",
  musicalJacketColor = DEFAULT_MUSICAL_JACKET_COLOR,
  musicalInnerColor = DEFAULT_MUSICAL_INNER_COLOR,
  musicalShortsColor = DEFAULT_MUSICAL_SHORTS_COLOR,
  festivalTopColor = DEFAULT_FESTIVAL_TOP_COLOR,
  festivalBottomColor = DEFAULT_FESTIVAL_BOTTOM_COLOR,
  fanmeetCardiganColor = DEFAULT_FANMEET_CARDIGAN_COLOR,
  fanmeetInnerColor = DEFAULT_FANMEET_INNER_COLOR,
  fanmeetShortsColor = DEFAULT_FANMEET_SHORTS_COLOR,
  fanmeetSkirtColor = DEFAULT_FANMEET_SKIRT_COLOR,
}: Pick<
  CharacterModelViewerProps,
  | "modelPosition"
  | "modelScale"
  | "centered"
  | "modelUrl"
  | "skinColor"
  | "hairColor"
  | "outfitColor"
  | "jazzShirtColor"
  | "jazzInnerColor"
  | "jazzPantsColor"
  | "balletWearColor"
  | "balletShortsColor"
  | "jacketColor"
  | "innerColor"
  | "bottomColor"
  | "outfitModelId"
  | "hairStyle"
  | "mouthStyle"
  | "eyeStyle"
  | "musicalJacketColor"
  | "musicalInnerColor"
  | "musicalShortsColor"
  | "festivalTopColor"
  | "festivalBottomColor"
  | "fanmeetCardiganColor"
  | "fanmeetInnerColor"
  | "fanmeetShortsColor"
  | "fanmeetSkirtColor"
>) {
  const outfitModelUrl = getOutfitModelUrl(outfitModelId);

  const outfit = outfitModelUrl ? (
    <OutfitModel
      modelUrl={outfitModelUrl}
      outfitModelId={outfitModelId}
      outfitColor={outfitColor}
      jazzShirtColor={jazzShirtColor}
      jazzInnerColor={jazzInnerColor}
      jazzPantsColor={jazzPantsColor}
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
      fanmeetCardiganColor={fanmeetCardiganColor}
      fanmeetInnerColor={fanmeetInnerColor}
      fanmeetShortsColor={fanmeetShortsColor}
      fanmeetSkirtColor={fanmeetSkirtColor}
    />
  ) : null;

  return (
    <Center
      cacheKey={
        centered
          ? [
              modelUrl,
              hairStyle,
              eyeStyle,
              mouthStyle,
              outfitModelId,
              modelScale,
            ].join(":")
          : 0
      }
    >
      <group
        scale={modelScale}
        position={centered ? [0, 0, 0] : modelPosition}
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

        <MouthModel mouthStyle={mouthStyle} />

        {centered ? (
          outfit
        ) : (
          <Suspense fallback={null}>
            {outfit}
          </Suspense>
        )}
      </group>
    </Center>
  );
}

export default function CharacterModelViewer({
  modelPosition = [0, -0.4, 0],
  modelScale = 0.8,
  centered = false,
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitModelId,
  outfitColor,
  jazzShirtColor,
  jazzInnerColor,
  jazzPantsColor,
  balletWearColor,
  balletShortsColor,
  jacketColor,
  innerColor,
  bottomColor,
  hairStyle,
  eyeStyle = "default",
  mouthStyle = "DEFAULT",
  musicalJacketColor = DEFAULT_MUSICAL_JACKET_COLOR,
  musicalInnerColor = DEFAULT_MUSICAL_INNER_COLOR,
  musicalShortsColor = DEFAULT_MUSICAL_SHORTS_COLOR,
  festivalTopColor = DEFAULT_FESTIVAL_TOP_COLOR,
  festivalBottomColor = DEFAULT_FESTIVAL_BOTTOM_COLOR,
  fanmeetCardiganColor = DEFAULT_FANMEET_CARDIGAN_COLOR,
  fanmeetInnerColor = DEFAULT_FANMEET_INNER_COLOR,
  fanmeetShortsColor = DEFAULT_FANMEET_SHORTS_COLOR,
  fanmeetSkirtColor = DEFAULT_FANMEET_SKIRT_COLOR,
}: CharacterModelViewerProps) {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{
          position: centered ? [0, 0, 6] : [0, 1.2, 6],
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

        <Suspense fallback={<CharacterModelLoadingFallback />}>
          <CharacterModel
            modelPosition={modelPosition}
            modelScale={modelScale}
            centered={centered}
            modelUrl={modelUrl}
            skinColor={skinColor}
            hairColor={hairColor}
            outfitModelId={outfitModelId}
            outfitColor={outfitColor}
            jazzShirtColor={jazzShirtColor}
            jazzInnerColor={jazzInnerColor}
            jazzPantsColor={jazzPantsColor}
            balletWearColor={balletWearColor}
            balletShortsColor={balletShortsColor}
            jacketColor={jacketColor}
            innerColor={innerColor}
            bottomColor={bottomColor}
            hairStyle={hairStyle}
            eyeStyle={eyeStyle}
            mouthStyle={mouthStyle}
            musicalJacketColor={musicalJacketColor}
            musicalInnerColor={musicalInnerColor}
            musicalShortsColor={musicalShortsColor}
            festivalTopColor={festivalTopColor}
            festivalBottomColor={festivalBottomColor}
            fanmeetCardiganColor={fanmeetCardiganColor}
            fanmeetInnerColor={fanmeetInnerColor}
            fanmeetShortsColor={fanmeetShortsColor}
            fanmeetSkirtColor={fanmeetSkirtColor}
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

useGLTF.preload("/models/mouths/mouth_default.glb");
useGLTF.preload("/models/mouths/mouth_smile.glb");
useGLTF.preload("/models/mouths/mouth_open_smile.glb");
useGLTF.preload("/models/mouths/mouth_pucker.glb");
useGLTF.preload("/models/mouths/mouth_cat.glb");
useGLTF.preload("/models/mouths/mouth_round.glb");