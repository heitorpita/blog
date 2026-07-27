"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

function levelColor(level: number) {
  const hue = (200 + level * 35) % 360;
  return new THREE.Color(`hsl(${hue}, 70%, 60%)`);
}

function CharacterCore({ level }: { level: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => levelColor(level), [level]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.08;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35 + Math.min(level, 6) * 0.05}
        roughness={0.35}
        metalness={0.4}
        flatShading
      />
    </mesh>
  );
}

function OrbitRing({ radius, speed, tilt, color }: { radius: number; speed: number; tilt: number; color: THREE.Color }) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * speed;
    }
  });

  return (
    <group ref={ringRef} rotation={[tilt, 0, 0]}>
      <mesh>
        <torusGeometry args={[radius, 0.02, 8, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

export function CharacterScene({ level }: { level: number }) {
  const color = useMemo(() => levelColor(level), [level]);
  const ringCount = Math.min(Math.max(level, 0), 4);

  return (
    <Canvas camera={{ position: [0, 0, 4.5], fov: 40 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 3, 3]} intensity={40} color={color} />
      <pointLight position={[-3, -2, -3]} intensity={15} color="#ffffff" />

      <CharacterCore level={level} />

      {Array.from({ length: ringCount }).map((_, index) => (
        <OrbitRing
          key={index}
          radius={1.4 + index * 0.25}
          speed={0.4 + index * 0.15}
          tilt={(index * Math.PI) / 5}
          color={color}
        />
      ))}

      {level > 0 && (
        <Sparkles
          count={Math.min(level * 8, 60)}
          scale={3.2}
          size={2}
          speed={0.3}
          color={color}
        />
      )}
    </Canvas>
  );
}
