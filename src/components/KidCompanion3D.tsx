'use client';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// أمزجة مصممة خصيصاً لتفاعل الأطفال: تحية، تشجيع، احتفال، تفكير، نوم، استماع
export type KidCompanionMood =
  | 'happy'
  | 'excited'
  | 'celebrating'
  | 'thinking'
  | 'encouraging'
  | 'sleepy'
  | 'listening';

interface KidCompanion3DProps {
  mood: KidCompanionMood;
  onClick?: () => void;
}

// لوحة ألوان دافئة وناعمة، بعيدة عن الألوان المعدنية أو الحادة — مناسبة لعيون الأطفال
const MOOD_COLORS: Record<KidCompanionMood, { body: string; glow: string; blush: string }> = {
  happy: { body: '#FFD873', glow: '#FFB84D', blush: '#FF9EBB' },
  excited: { body: '#FF9F6B', glow: '#FF6B6B', blush: '#FFB3B3' },
  celebrating: { body: '#FF8FC7', glow: '#FFD873', blush: '#FFC2E0' },
  thinking: { body: '#B9A6FF', glow: '#8C7AE6', blush: '#D6C9FF' },
  encouraging: { body: '#7ED9A8', glow: '#4FC98A', blush: '#B8F0D1' },
  sleepy: { body: '#9AB8E8', glow: '#6C8FC7', blush: '#C7D9F5' },
  listening: { body: '#7FD8D8', glow: '#4FB8B8', blush: '#B8F0EA' },
};

export function KidCompanion3D({ mood, onClick }: KidCompanion3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const sparkleRefs = useRef<THREE.Mesh[]>([]);
  const { camera, gl } = useThree();
  const mouseRef = useRef({ x: 0, y: 0 });

  // تتبع حركة الماوس لجعل العيون تنظر نحو المؤشر
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current = { x, y };
    };

    gl.domElement.addEventListener('mousemove', handleMouseMove);
    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl.domElement]);

  const colors = MOOD_COLORS[mood];

  // نجوم صغيرة تدور حول الرأس عند الاحتفال
  const sparklePositions = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        angle: (i / 5) * Math.PI * 2,
        radius: 0.55,
        yOffset: (i % 2 === 0 ? 1 : -1) * 0.05,
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (groupRef.current) {
      // نسبة تنفس أبطأ وأكثر نعومة من الشخصية الأصلية — مريحة للعين
      const isSleepy = mood === 'sleepy';
      const breatheSpeed = isSleepy ? 1 : 2.2;
      const breatheAmount = isSleepy ? 0.015 : 0.03;
      groupRef.current.position.y = Math.sin(t * breatheSpeed) * breatheAmount;

      // ميل لطيف يميناً ويساراً، وكأنها فضولية
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.12;

      // قفزات حماس واضحة عند الحماس والاحتفال
      if (mood === 'excited' || mood === 'celebrating') {
        groupRef.current.position.y += Math.abs(Math.sin(t * 5)) * 0.15;
        groupRef.current.rotation.z = Math.sin(t * 4) * 0.08;
      } else {
        groupRef.current.rotation.z = 0;
      }
    }

    // إمالة الرأس عند التفكير، وكأنها تتساءل
    if (headRef.current) {
      if (mood === 'thinking') {
        headRef.current.rotation.z = Math.sin(t * 1.2) * 0.15 + 0.1;
      } else if (mood === 'sleepy') {
        headRef.current.rotation.z = 0.08;
        headRef.current.rotation.x = 0.1;
      } else {
        headRef.current.rotation.z = 0;
        headRef.current.rotation.x = 0;
      }
    }

    // رمش العينين — تكبير وتصغير سريع كل بضع ثوان
    const blinkCycle = t % 3.2;
    const isBlinking = blinkCycle > 3.05 && blinkCycle < 3.15;
    const isSleepy = mood === 'sleepy';
    const eyeScaleY = isSleepy ? 0.25 : isBlinking ? 0.1 : 1;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = eyeScaleY;
    if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScaleY;

    // تتبع العيون للماوس - حركة خفيفة وطبيعية
    if (leftEyeRef.current && rightEyeRef.current && !isSleepy) {
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      // تحريك العيون بنطاق محدود (±0.04) لتبدو طبيعية
      const eyeMoveX = mouseX * 0.04;
      const eyeMoveY = mouseY * 0.03;

      leftEyeRef.current.position.x = -0.16 + eyeMoveX;
      leftEyeRef.current.position.y = 0.05 + eyeMoveY;
      rightEyeRef.current.position.x = 0.16 + eyeMoveX;
      rightEyeRef.current.position.y = 0.05 + eyeMoveY;
    }

    // تلويح الذراع اليمنى عند السعادة والتشجيع والاحتفال
    if (rightArmRef.current) {
      if (mood === 'happy' || mood === 'celebrating' || mood === 'encouraging') {
        rightArmRef.current.rotation.z = -0.6 + Math.sin(t * 5) * 0.4;
      } else {
        rightArmRef.current.rotation.z = -0.35;
      }
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = mood === 'listening' ? 0.55 : 0.35;
    }

    // توهج الهوائي ينبض بلطف — كأنه مصباح صغير حي
    if (glowRef.current) {
      const pulse = 0.6 + Math.sin(t * 2.5) * 0.4;
      (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    }

    // دوران النجوم الصغيرة حول الرأس عند الاحتفال فقط
    sparkleRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      if (mood === 'celebrating') {
        const angle = sparklePositions[i].angle + t * 1.5;
        mesh.position.x = Math.cos(angle) * sparklePositions[i].radius;
        mesh.position.z = Math.sin(angle) * sparklePositions[i].radius;
        mesh.position.y = 0.95 + sparklePositions[i].yOffset + Math.sin(t * 3 + i) * 0.05;
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    });
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* الجسم — بيضاوي صغير وناعم بدون أطراف حادة */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow scale={[1, 0.85, 1]}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={colors.body} roughness={0.35} metalness={0} />
      </mesh>

      {/* الرأس — كبير جداً بالنسبة للجسم (نسب طفولية تجذب الأطفال) */}
      <group ref={headRef} position={[0, 0.55, 0]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.42, 32, 32]} />
          <meshStandardMaterial color={colors.body} roughness={0.35} metalness={0} />
        </mesh>

        {/* خدود وردية للدفء والتعبير */}
        <mesh position={[-0.28, -0.08, 0.28]} rotation={[0, -0.4, 0]}>
          <circleGeometry args={[0.07, 16]} />
          <meshStandardMaterial color={colors.blush} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.28, -0.08, 0.28]} rotation={[0, 0.4, 0]}>
          <circleGeometry args={[0.07, 16]} />
          <meshStandardMaterial color={colors.blush} transparent opacity={0.7} />
        </mesh>

        {/* العين اليسرى — كبيرة مع بريق أبيض لجعلها حيّة وودودة */}
        <group position={[-0.16, 0.05, 0.35]}>
          <mesh ref={leftEyeRef}>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color="#2b2b3d" />
          </mesh>
          <mesh position={[-0.035, 0.04, 0.09]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>

        {/* العين اليمنى */}
        <group position={[0.16, 0.05, 0.35]}>
          <mesh ref={rightEyeRef}>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color="#2b2b3d" />
          </mesh>
          <mesh position={[0.035, 0.04, 0.09]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>

        {/* الفم — ابتسامة واسعة إلا في حالة النوم والتفكير */}
        <mesh
          position={[0, -0.16, 0.37]}
          rotation={[
            mood === 'sleepy' ? Math.PI / 2 : 0,
            0,
            0,
          ]}
        >
          {mood === 'sleepy' ? (
            <torusGeometry args={[0.03, 0.012, 8, 16, Math.PI]} />
          ) : mood === 'thinking' ? (
            <sphereGeometry args={[0.025, 12, 12]} />
          ) : (
            <torusGeometry args={[0.11, 0.02, 8, 20, Math.PI]} />
          )}
          <meshStandardMaterial color="#2b2b3d" />
        </mesh>

        {/* هوائي واحد فقط في المنتصف — أبسط وأكثر وداعة من هوائيين */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
          <meshStandardMaterial color="#e5e5e5" />
        </mesh>
        <mesh ref={glowRef} position={[0, 0.62, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color={colors.glow}
            emissive={colors.glow}
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>

      {/* الذراع اليسرى — كبسولة قصيرة وناعمة */}
      <mesh ref={leftArmRef} position={[-0.32, 0.08, 0]} castShadow>
        <capsuleGeometry args={[0.055, 0.18, 4, 8]} />
        <meshStandardMaterial color={colors.body} roughness={0.35} />
      </mesh>

      {/* الذراع اليمنى */}
      <mesh ref={rightArmRef} position={[0.32, 0.08, 0]} castShadow>
        <capsuleGeometry args={[0.055, 0.18, 4, 8]} />
        <meshStandardMaterial color={colors.body} roughness={0.35} />
      </mesh>

      {/* بدون أرجل — الشخصية تطفو بلطف، مما يجعلها أخف وأكثر مرحاً */}

      {/* نجوم صغيرة متلألئة تظهر فقط عند الاحتفال */}
      {sparklePositions.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) sparkleRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color={colors.glow}
            emissive={colors.glow}
            emissiveIntensity={1}
          />
        </mesh>
      ))}
    </group>
  );
}