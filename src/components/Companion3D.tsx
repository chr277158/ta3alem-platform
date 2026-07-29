'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export type CompanionMood = 'happy' | 'neutral' | 'thinking' | 'excited' | 'celebrating' | 'encouraging';

interface Companion3DProps {
  mood: CompanionMood;
  onClick?: () => void;
}

export function Companion3D({ mood, onClick }: Companion3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [currentAction, setCurrentAction] = useState<string>('');
  
  // ✅ المسار الصحيح: /models/walk.glb
  const { scene, animations } = useGLTF('/models/walk.glb');
  const { actions, mixer } = useAnimations(animations, groupRef);

  // طباعة أسماء الحركات المتاحة (للتطوير فقط، يمكن حذفه لاحقاً)
  useEffect(() => {
    if (animations.length > 0) {
      console.log('🎬 الحركات المتاحة في walk.glb:', animations.map(a => a.name));
    } else {
      console.log('⚠️ لا توجد حركات في الملف، سيتم استخدام الدوران التلقائي');
    }
  }, [animations]);

  // تحديد الحركة بناءً على الحالة المزاجية
  useEffect(() => {
    const availableActions = Object.keys(actions);
    if (availableActions.length === 0) return;

    // محاولة مطابقة المزاج مع اسم الحركة
    let targetAction = availableActions[0]; // الحركة الأولى كافتراضية

    // إذا كان الملف يحتوي على حركات متعددة، نحاول المطابقة
    const moodToAction: Record<string, string[]> = {
      happy: ['walk', 'Walk', 'WALK', 'idle', 'Idle'],
      excited: ['run', 'Run', 'RUN', 'walk', 'Walk'],
      celebrating: ['dance', 'Dance', 'jump', 'Jump', 'walk', 'Walk'],
      encouraging: ['idle', 'Idle', 'IDLE', 'walk', 'Walk'],
      thinking: ['idle', 'Idle', 'IDLE'],
      neutral: ['idle', 'Idle', 'IDLE', 'walk', 'Walk'],
    };

    const preferredActions = moodToAction[mood] || moodToAction.neutral;
    
    for (const preferred of preferredActions) {
      if (actions[preferred]) {
        targetAction = preferred;
        break;
      }
    }

    // تبديل الحركة بسلاسة
    if (targetAction !== currentAction && actions[targetAction]) {
      if (currentAction && actions[currentAction]) {
        actions[currentAction].fadeOut(0.4);
      }
      actions[targetAction].reset().fadeIn(0.4).play();
      setCurrentAction(targetAction);
    }
  }, [mood, actions, currentAction]);

  // حركة دوران وتنفس تلقائية
  useFrame((state) => {
    if (groupRef.current) {
      // دوران لطيف يميناً ويساراً
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      
      // حركة تنفس (تموج خفيف للأعلى والأسفل)
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.03;
      
      // إذا كان المزاج "متحمس"، نضيف قفزات صغيرة
      if (mood === 'excited' || mood === 'celebrating') {
        groupRef.current.position.y += Math.abs(Math.sin(state.clock.elapsedTime * 3)) * 0.08;
      }
    }
  });

  return (
    <group 
      ref={groupRef} 
      scale={1} 
      position={[0, -0.8, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <primitive object={scene} />
    </group>
  );
}

// ✅ تحميل مسبق للنموذج من المسار الصحيح
useGLTF.preload('/models/walk.glb');