import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";
import type { HairStyle } from "@/components/admin/character/characterHair";

export type { HairStyle } from "@/components/admin/character/characterHair";

interface CharacterModelViewerProps {
  modelUrl?: string;
  skinColor: string;
  hairColor: string;
  outfitColor: string;
  outfitName: string;
  hairStyle: HairStyle;
}

const HAIR_MODEL_URLS: Record<HairStyle, string> = {
  short: "/models/hair/hair_short.glb",
  long: "/models/hair/hair_long.glb",
  ponytail: "/models/hair/hair_ponytail.glb",
  twintails: "/models/hair/hair_twintails.glb",
  wave: "/models/hair/hair_wave.glb",
};

const CONCERT_OUTFIT_NAME = "마이크 콘서트";
const CONCERT_OUTFIT_URL = "/models/outfits/concert_outfit.glb";

const MUSICAL_OUTFIT_NAME = "뮤지컬 공연";
const MUSICAL_OUTFIT_URL = "/models/outfits/musical_outfit.glb";

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

function CharacterBody({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  outfitColor,
  outfitName,
}: Pick<
  CharacterModelViewerProps,
  "modelUrl" | "skinColor" | "outfitColor" | "outfitName"
>) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    const isConcertOutfit = outfitName === CONCERT_OUTFIT_NAME;
    const isMusicalOutfit = outfitName === MUSICAL_OUTFIT_NAME;
    const isCustomOutfit = isConcertOutfit || isMusicalOutfit;

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
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
        if (isCustomOutfit) {
          object.visible = false;
          return;
        }

        object.material = new THREE.MeshStandardMaterial({
          color: outfitColor,
          roughness: 0.75,
        });
      }
    });

    return clonedScene;
  }, [gltf.scene, skinColor, outfitColor, outfitName]);

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

function ConcertOutfitModel() {
  const gltf = useGLTF(CONCERT_OUTFIT_URL);

  const scene = useMemo(() => {
    return gltf.scene.clone(true);
  }, [gltf.scene]);

  return <primitive object={scene} />;
}

function MusicalOutfitModel() {
  const gltf = useGLTF(MUSICAL_OUTFIT_URL);

  const scene = useMemo(() => {
    return gltf.scene.clone(true);
  }, [gltf.scene]);

  return <primitive object={scene} />;
}

function CharacterModel({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitColor,
  outfitName,
  hairStyle,
}: CharacterModelViewerProps) {
  const isConcertOutfit = outfitName === CONCERT_OUTFIT_NAME;
  const isMusicalOutfit = outfitName === MUSICAL_OUTFIT_NAME;

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
          outfitName={outfitName}
        />

        <HairModel
          hairStyle={hairStyle}
          hairColor={hairColor}
        />

        {isConcertOutfit && <ConcertOutfitModel />}

        {isMusicalOutfit && <MusicalOutfitModel />}
      </group>
    </Center>
  );
}

export default function CharacterModelViewer({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitColor,
  outfitName,
  hairStyle,
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
            outfitName={outfitName}
            hairStyle={hairStyle}
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

useGLTF.preload(CONCERT_OUTFIT_URL);
useGLTF.preload(MUSICAL_OUTFIT_URL);