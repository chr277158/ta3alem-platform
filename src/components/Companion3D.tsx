'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

export type CompanionMood = 'happy' | 'neutral' | 'thinking' | 'excited' | 'celebrating' | 'encouraging';

interface Companion3DProps {
  mood: CompanionMood;
  onClick?: () => void;
}

export function Companion3D({ mood, onClick }: Companion3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // تحميل المودل
  const { scene, animations } = useGLTF('/models/walk.glb');
  const { actions, mixer } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (animations.length > 0) {
      // بما أن هناك حركة واحدة فقط، نأخذها مباشرة
      const animName = animations[0].name;
      const action = actions[animName];
      
      if (action) {
        action.reset().play();
        
        // تغيير سرعة الحركة بناءً على المزاج (بديل رائع لتغيير الحركة نفسها)
        if (mood === 'excited' || mood === 'celebrating') {
          action.timeScale = 1.5; // حركة أسرع للاحتفال
        } else if (mood === 'thinking' || mood === 'neutral') {
          action.timeScale = 0.5; // حركة أبطأ للتفكير
        } else {
          action.timeScale = 1.0; // سرعة عادية
        }
      }
    }
  }, [mood, actions, animations]);

  // دوران لطيف جداً لإضفاء الحيوية
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group 
      ref={groupRef} 
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* 
        مكون Center يقوم بضبط المودل تلقائياً في منتصف المشهد.
        خاصية 'top' تجعل أعلى المودل هو نقطة الارتكاز (مفيد للشخصيات).
        خاصية 'scale' يمكن تعديلها: جرب 0.3 أو 0.5 أو 0.8 حسب ما يناسبك.
      */}
      <Center top scale={0.5}>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

useGLTF.preload('/models/walk.glb');