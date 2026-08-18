import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";

interface CharacterModelViewerProps {
  modelUrl?: string;
  skinColor: string;
  hairColor: string;
  outfitColor: string;
  hairStyle: string;
}

function getPartType(objectName: string) {
  const name = objectName.toLowerCase();

  if (name.startsWith("body_")) {
    return "body";
  }

  if (name.startsWith("hair_")) {
    return "hair";
  }

  if (name.startsWith("clothes_")) {
    return "clothes";
  }

  return "other";
}

function shouldShowHair(objectName: string, selectedHairStyle: string) {
  const name = objectName.toLowerCase();

  if (!name.startsWith("hair_")) {
    return true;
  }

  return name.startsWith(`hair_${selectedHairStyle}`);
}

function CharacterModel({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitColor,
  hairStyle,
}: CharacterModelViewerProps) {
  const gltf = useGLTF(modelUrl);

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      const objectName = object.name.toLowerCase();
      const partType = getPartType(objectName);

      if (partType === "hair") {
        object.visible = shouldShowHair(objectName, hairStyle);
      }

      if (partType === "body") {
        object.material = new THREE.MeshStandardMaterial({
          color: skinColor,
          roughness: 0.8,
        });
      }

      if (partType === "hair") {
        object.material = new THREE.MeshStandardMaterial({
          color: hairColor,
          roughness: 0.85,
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
  }, [gltf.scene, skinColor, hairColor, outfitColor, hairStyle]);

  return (
    <Center>
        <primitive
        object={scene}
        scale={0.8}
        position={[0, -0.4, 0]}
        rotation={[0, 0, 0]}
        />
    </Center>
    );
}

export default function CharacterModelViewer({
  modelUrl = "/models/chibi-base.glb",
  skinColor,
  hairColor,
  outfitColor,
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