'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type CompanionMood = 'happy' | 'neutral' | 'thinking' | 'excited' | 'celebrating' | 'encouraging';

interface Companion3DProps {
  mood: CompanionMood;
  onClick?: () => void;
}

export function Companion3D({ mood, onClick }: Companion3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // دوران لطيف
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      
      // حركة تنفس
      const breatheY = Math.sin(state.clock.elapsedTime * 2) * 0.03;
      groupRef.current.position.y = breatheY;
      
      // قفزات عند الحماس
      if (mood === 'excited' || mood === 'celebrating') {
        groupRef.current.position.y += Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 0.12;
        groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.08;
      } else {
        groupRef.current.rotation.z = 0;
      }
    }
  });

  const getBodyColor = () => {
    switch (mood) {
      case 'happy': return '#60a5fa';
      case 'excited': return '#fbbf24';
      case 'celebrating': return '#f472b6';
      case 'encouraging': return '#34d399';
      case 'thinking': return '#a78bfa';
      default: return '#93c5fd';
    }
  };

  const isHappy = mood === 'happy' || mood === 'excited' || mood === 'celebrating';

  return (
    <group 
      ref={groupRef} 
      position={[0, -0.5, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* الجسم */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.9, 0.5]} />
        <meshStandardMaterial 
          color={getBodyColor()} 
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* الرأس - أكبر وأعلى */}
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial 
          color="#fde68a" 
          roughness={0.4}
        />
      </mesh>

      {/* العين اليسرى - أكبر */}
      <mesh position={[-0.15, 1.05, 0.35]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* العين اليمنى - أكبر */}
      <mesh position={[0.15, 1.05, 0.35]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* الحواجب */}
      <mesh position={[-0.15, 1.18, 0.38]} rotation={[0, 0, isHappy ? -0.2 : 0.2]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0.15, 1.18, 0.38]} rotation={[0, 0, isHappy ? 0.2 : -0.2]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* الفم المبتسم - واضح وكبير */}
      {isHappy ? (
        <mesh position={[0, 0.88, 0.4]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.12, 0.03, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ) : mood === 'thinking' ? (
        <mesh position={[0, 0.88, 0.4]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ) : (
        <mesh position={[0, 0.9, 0.4]} rotation={[-0.2, 0, 0]}>
          <torusGeometry args={[0.1, 0.025, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      )}

      {/* الخدود الوردية */}
      <mesh position={[-0.25, 0.95, 0.38]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#fca5a5" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.25, 0.95, 0.38]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#fca5a5" transparent opacity={0.6} />
      </mesh>

      {/* الذراع الأيسر */}
      <mesh position={[-0.55, 0, 0]} rotation={[0, 0, 0.4]} castShadow>
        <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
        <meshStandardMaterial color={getBodyColor()} />
      </mesh>

      {/* الذراع الأيمن */}
      <mesh position={[0.55, 0, 0]} rotation={[0, 0, -0.4]} castShadow>
        <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
        <meshStandardMaterial color={getBodyColor()} />
      </mesh>

      {/* الرجل اليسرى */}
      <mesh position={[-0.2, -0.7, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.5, 4, 8]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>

      {/* الرجل اليمنى */}
      <mesh position={[0.2, -0.7, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.5, 4, 8]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>

      {/* الهوائيات */}
      <mesh position={[-0.15, 1.4, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
        <meshStandardMaterial color="#f87171" />
      </mesh>
      <mesh position={[-0.15, 1.52, 0]} rotation={[0, 0, -0.3]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.5} />
      </mesh>

      <mesh position={[0.15, 1.4, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
        <meshStandardMaterial color="#f87171" />
      </mesh>
      <mesh position={[0.15, 1.52, 0]} rotation={[0, 0, 0.3]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}