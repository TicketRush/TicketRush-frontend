import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";

function Model() {
  const { scene } = useGLTF("/models/baseCharacter.glb");
  return <primitive object={scene} scale={1.5} />;
}

export default function CharacterViewer() {
  return (
    <Canvas camera={{ position: [0, 1, 3] }}>
      <ambientLight intensity={1} />
      <directionalLight position={[2, 2, 2]} />

      <Model />

      <OrbitControls />
    </Canvas>
  );
}