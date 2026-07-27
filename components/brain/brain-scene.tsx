"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

function levelColor(level: number) {
  const hue = (200 + level * 35) % 360;
  return new THREE.Color(`hsl(${hue}, 70%, 60%)`);
}

/** Distribui pontos uniformemente numa esfera (espiral de Fibonacci). */
function neuronPositions(count: number, radius: number) {
  const golden = Math.PI * (3 - Math.sqrt(5));

  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / Math.max(count - 1, 1)) * 2;
    const ring = Math.sqrt(Math.max(1 - y * y, 0));
    const theta = golden * index;

    return new THREE.Vector3(
      Math.cos(theta) * ring * radius,
      y * radius,
      Math.sin(theta) * ring * radius,
    );
  });
}

/**
 * A rede cresce com o nível: mais neurônios e mais sinapses ligando os vizinhos.
 * `levelUp` faz a rede pulsar e brilhar enquanto a subida é comemorada.
 */
function NeuralNetwork({ level, levelUp }: { level: number; levelUp: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const color = useMemo(() => levelColor(level), [level]);

  const { positions, synapses } = useMemo(() => {
    const count = 14 + Math.min(level, 8) * 6;
    const points = neuronPositions(count, 1.15);

    // Liga cada neurônio aos vizinhos mais próximos; quanto maior o nível, mais
    // conexões por neurônio, então a rede fica visivelmente mais densa.
    const neighbours = 2 + Math.min(level, 5);
    const segments: number[] = [];

    points.forEach((point, index) => {
      const closest = points
        .map((other, otherIndex) => ({ otherIndex, distance: point.distanceTo(other) }))
        .filter((entry) => entry.otherIndex !== index)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, neighbours);

      for (const { otherIndex } of closest) {
        if (otherIndex <= index) continue;
        const other = points[otherIndex];
        segments.push(point.x, point.y, point.z, other.x, other.y, other.z);
      }
    });

    return { positions: points, synapses: new Float32Array(segments) };
  }, [level]);

  const synapseGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(synapses, 3));
    return geometry;
  }, [synapses]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.y += delta * 0.25;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;

    // Respiração sutil o tempo todo; pulso curto e forte durante o level up.
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.02;
    const burst = levelUp ? 1 + Math.sin(state.clock.elapsedTime * 9) * 0.09 : 1;
    groupRef.current.scale.setScalar(breathe * burst);
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={synapseGeometry}>
        <lineBasicMaterial color={color} transparent opacity={levelUp ? 0.75 : 0.35} />
      </lineSegments>

      {positions.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={levelUp ? 1.6 : 0.7}
          />
        </mesh>
      ))}

      <mesh>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={levelUp ? 1.2 : 0.4}
          roughness={0.35}
          metalness={0.4}
          flatShading
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

export function BrainScene({ level, levelUp = false }: { level: number; levelUp?: boolean }) {
  const color = useMemo(() => levelColor(level), [level]);

  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 42 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.55} />
      <pointLight position={[3, 3, 3]} intensity={40} color={color} />
      <pointLight position={[-3, -2, -3]} intensity={15} color="#ffffff" />

      <NeuralNetwork level={level} levelUp={levelUp} />

      <Sparkles
        count={levelUp ? 90 : Math.min(20 + level * 8, 70)}
        scale={3.4}
        size={levelUp ? 4 : 2}
        speed={levelUp ? 1.2 : 0.3}
        color={color}
      />
    </Canvas>
  );
}
