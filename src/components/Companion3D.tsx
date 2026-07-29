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
  const bodyRef = useRef<THREE.Group>(null);

  // حركة تنفس ودوران تلقائية
  useFrame((state) => {
    if (groupRef.current) {
      // دوران لطيف يميناً ويساراً
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      
      // حركة تنفس
      const breatheY = Math.sin(state.clock.elapsedTime * 2) * 0.02;
      groupRef.current.position.y = breatheY;
      
      // قفزات عند الحماس
      if (mood === 'excited' || mood === 'celebrating') {
        groupRef.current.position.y += Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 0.1;
        groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.05;
      } else {
        groupRef.current.rotation.z = 0;
      }
    }
  });

  // ألوان حسب الحالة المزاجية
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

  return (
    <group 
      ref={groupRef} 
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <group ref={bodyRef} position={[0, 0, 0]}>
        {/* الجسم */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.7, 0.4]} />
          <meshStandardMaterial 
            color={getBodyColor()} 
            roughness={0.3}
            metalness={0.1}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* الرأس */}
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial 
            color="#fde68a" 
            roughness={0.4}
            transparent
            opacity={0.95}
          />
        </mesh>

        {/* العين اليسرى */}
        <mesh position={[-0.15, 0.95, 0.25]} castShadow>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>

        {/* العين اليمنى */}
        <mesh position={[0.15, 0.95, 0.25]} castShadow>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>

        {/* الفم */}
        <mesh 
          position={[0, 0.8, 0.3]} 
          rotation={[mood === 'happy' || mood === 'excited' || mood === 'celebrating' ? -0.3 : 0, 0, 0]}
        >
          {mood === 'thinking' ? (
            <sphereGeometry args={[0.05, 16, 16]} />
          ) : (
            <torusGeometry args={[0.08, 0.025, 8, 20, Math.PI]} />
          )}
          <meshStandardMaterial color="#1f2937" />
        </mesh>

        {/* الذراع الأيسر */}
        <mesh position={[-0.45, 0.3, 0]} rotation={[0, 0, 0.3]} castShadow>
          <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
          <meshStandardMaterial color={getBodyColor()} transparent opacity={0.9} />
        </mesh>

        {/* الذراع الأيمن */}
        <mesh position={[0.45, 0.3, 0]} rotation={[0, 0, -0.3]} castShadow>
          <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
          <meshStandardMaterial color={getBodyColor()} transparent opacity={0.9} />
        </mesh>

        {/* الرجل اليسرى */}
        <mesh position={[-0.15, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.35, 4, 8]} />
          <meshStandardMaterial color="#6b7280" transparent opacity={0.9} />
        </mesh>

        {/* الرجل اليمنى */}
        <mesh position={[0.15, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.35, 4, 8]} />
          <meshStandardMaterial color="#6b7280" transparent opacity={0.9} />
        </mesh>

        {/* الهوائيات */}
        <mesh position={[-0.1, 1.25, 0]} rotation={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
          <meshStandardMaterial color="#f87171" />
        </mesh>
        <mesh position={[-0.1, 1.35, 0]} rotation={[0, 0, -0.2]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.5} />
        </mesh>

        <mesh position={[0.1, 1.25, 0]} rotation={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
          <meshStandardMaterial color="#f87171" />
        </mesh>
        <mesh position={[0.1, 1.35, 0]} rotation={[0, 0, 0.2]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  );
}