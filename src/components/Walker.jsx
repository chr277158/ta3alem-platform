import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export default function Walker({ position = [0, 0, 0], scale = 1 }) {
  const group = useRef();
  const { scene, animations } = useGLTF('/models/walk.glb');
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const names = Object.keys(actions);
    console.log('الحركات المتاحة:', names);
    if (names.length > 0) {
      actions[names[0]].reset().play();
    }
  }, [actions]);

  useFrame((_, delta) => {
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