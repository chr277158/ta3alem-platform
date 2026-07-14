'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

interface Companion3DProps {
  avatarType: string;
  mood: 'happy' | 'neutral' | 'sad';
}

// مكون داخلي للشخصية (يمكن استبداله لاحقاً بـ useGLTF لتحميل نموذج حقيقي)
function CharacterModel({ avatarType, mood }: Companion3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  
  // ألوان وأنماط الشخصيات
  const avatars: Record<string, { color: string; eyeColor: string; shape: 'box' | 'sphere' | 'cone' }> = {
    robot: { color: '#3b82f6', eyeColor: '#10b981', shape: 'box' },      // أزرق
    astronaut: { color: '#f3f4f6', eyeColor: '#1f2937', shape: 'sphere' }, // أبيض
    wizard: { color: '#8b5cf6', eyeColor: '#fbbf24', shape: 'cone' },    // بنفسجي
    animal: { color: '#f97316', eyeColor: '#000000', shape: 'sphere' },  // برتقالي
  };

  const config = avatars[avatarType] || avatars.robot;

  // حركة تفاعلية بناءً على الحالة المزاجية
  useFrame((state) => {
    if (!meshRef.current) return;
    
    if (mood === 'happy') {
      // قفز سريع عند الفرح
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 10) * 0.2 + 0.5;
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 5) * 0.2;
    } else if (mood === 'sad') {
      // اهتزاز بطيء وميلان عند الحزن
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.05;
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0.3, 0.1);
    } else {
      // تنفس طبيعي محايد
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.1);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={meshRef}>
        {/* الجسم */}
        {config.shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
        {config.shape === 'sphere' && <sphereGeometry args={[0.7, 32, 32]} />}
        {config.shape === 'cone' && <coneGeometry args={[0.7, 1.2, 32]} />}
        
        <meshStandardMaterial color={config.color} roughness={0.3} metalness={0.6} />

        {/* العيون (تتفاعل مع المزاج) */}
        <group position={[0, 0.2, 0.6]}>
          <mesh position={[-0.25, 0, 0]}>
            <sphereGeometry args={[mood === 'sad' ? 0.08 : 0.12, 16, 16]} />
            <meshStandardMaterial color={config.eyeColor} emissive={config.eyeColor} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.25, 0, 0]}>
            <sphereGeometry args={[mood === 'sad' ? 0.08 : 0.12, 16, 16]} />
            <meshStandardMaterial color={config.eyeColor} emissive={config.eyeColor} emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* الفم */}
        <mesh position={[0, -0.1, 0.65]} rotation={[0, 0, mood === 'sad' ? Math.PI : 0]}>
          <torusGeometry args={[0.15, 0.03, 16, Math.PI]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
    </Float>
  );
}

export default function Companion3D({ avatarType, mood }: Companion3DProps) {
  return (
    <div className="w-40 h-40 md:w-56 md:h-56 relative">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        {/* إضاءة محيطة واتجاهية لإبراز الـ 3D */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />
        
        {/* خلفية نجوم خفيفة لإعطاء عمق */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* الشخصية */}
        <CharacterModel avatarType={avatarType} mood={mood} />
      </Canvas>
      
      {/* فقاعة كلام (اختياري) */}
      {mood === 'happy' && (
        <div className="absolute -top-4 -right-4 bg-white px-3 py-1 rounded-xl shadow-lg border-2 border-green-400 animate-bounce text-sm font-bold text-green-600">
          أحسنت! 🎉
        </div>
      )}
      {mood === 'sad' && (
        <div className="absolute -top-4 -right-4 bg-white px-3 py-1 rounded-xl shadow-lg border-2 border-red-400 animate-pulse text-sm font-bold text-red-600">
          حاول مرة أخرى 💪
        </div>
      )}
    </div>
  );
}