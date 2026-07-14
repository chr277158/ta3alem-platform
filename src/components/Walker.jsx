import { useRef, useEffect, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export default function Walker({ position = [0, 0, 0], scale = 1 }) {
  const group = useRef();
  const { scene, animations } = useGLTF('/models/walk.glb');
  const { actions, mixer } = useAnimations(animations, group);

  // تشغيل أول حركة موجودة في الملف (غالباً اسمها "walk" أو "Armature|walk")
  useEffect(() => {
    const actionNames = Object.keys(actions);
    if (actionNames.length > 0) {
      const action = actions[actionNames[0]];
      action.reset().play();
    }
  }, [actions]);

  // دوران بطيء للنموذج حتى تراه من كل الجهات (اختياري)
  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={group} position={position} scale={scale} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}