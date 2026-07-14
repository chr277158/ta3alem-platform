'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

interface Companion3DProps {
  avatarType: string;
  mood: 'happy' | 'neutral' | 'sad';
}
import { useGLTF } from '@react-three/drei';

function CharacterModel({ avatarType, mood }: Companion3DProps) {
  // تحميل النموذج الحقيقي
  const { scene } = useGLTF(`/models/${avatarType}.glb`);
  
  // يمكنك هنا إضافة Animations باستخدام useAnimations من drei
  
  return <primitive object={scene} scale={1.5} position={[0, -1, 0]} />;
}
// مكون داخلي للشخصية (يمكن استبداله لاحقاً بـ useGLTF لتحميل نموذج حقيقي)


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