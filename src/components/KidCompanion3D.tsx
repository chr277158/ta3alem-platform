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
  allowDrag?: boolean;
  onPositionChange?: (pos: [number, number, number]) => void;
  initialPosition?: [number, number, number];
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

export function KidCompanion3D({
  mood,
  onClick,
  allowDrag = true,
  onPositionChange,
  initialPosition,
}: KidCompanion3DProps) {
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
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef(new THREE.Vector3());
  const raycasterRef = useRef(new THREE.Raycaster());
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const boundsRef = useRef({ minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity });

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

  // appliquer la position initiale si fournie
  useEffect(() => {
    if (groupRef.current && initialPosition) {
      groupRef.current.position.set(
        initialPosition[0],
        initialPosition[1],
        initialPosition[2]
      );
    }
  }, [initialPosition]);

  // Gestion du drag par pointeur (déplacement sur le plan XZ)
  const handlePointerDown = (e: any) => {
    if (!allowDrag) return;
    e.stopPropagation();
    draggingRef.current = true;
    const point: THREE.Vector3 = e.point;
    if (groupRef.current && point) {
      dragOffsetRef.current.copy(groupRef.current.position).sub(point);
    } else if (groupRef.current) {
      // fallback: project mouse to plane
      const rect = gl.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const planeY = groupRef.current.position.y;
      planeRef.current.set(new THREE.Vector3(0, 1, 0), -planeY);
      const intersect = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(planeRef.current, intersect);
      dragOffsetRef.current.copy(groupRef.current.position).sub(intersect);
    }
    gl.domElement.style.cursor = 'grabbing';

    // attach global listeners so dragging continues off-canvas
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
  };

  const handlePointerMove = (e: any) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    const point: THREE.Vector3 = e.point;
    if (groupRef.current) {
      let nx = point.x + dragOffsetRef.current.x;
      // garder la même hauteur Y
      let nz = point.z + dragOffsetRef.current.z;
      [nx, nz] = clampToBounds(nx, nz);
      groupRef.current.position.x = nx;
      groupRef.current.position.z = nz;
      onPositionChange?.([
        groupRef.current.position.x,
        groupRef.current.position.y,
        groupRef.current.position.z,
      ]);
    }
  };

  const handlePointerUp = (e: any) => {
    if (!allowDrag) return;
    draggingRef.current = false;
    gl.domElement.style.cursor = 'auto';
    // remove global listeners
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
  };

  const handlePointerOver = (e: any) => {
    if (!allowDrag) return;
    if (!draggingRef.current) gl.domElement.style.cursor = 'grab';
  };

  const handlePointerOut = (e: any) => {
    if (!allowDrag) return;
    if (!draggingRef.current) gl.domElement.style.cursor = 'auto';
  };

  // helper: project client coords to world point on avatar's Y plane
  const getPointFromClient = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const planeY = groupRef.current ? groupRef.current.position.y : 0;
    planeRef.current.set(new THREE.Vector3(0, 1, 0), -planeY);
    const intersect = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(planeRef.current, intersect);
    return intersect;
  };

  // compute page bounds in world coordinates on the avatar's Y plane
  // Use the full window viewport so the avatar can be placed anywhere on the page
  const updateBounds = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const corners = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: 0, y: h },
      { x: w, y: h },
    ];
    const xs: number[] = [];
    const zs: number[] = [];
    corners.forEach((c) => {
      const p = getPointFromClient(c.x, c.y);
      if (p) {
        xs.push(p.x);
        zs.push(p.z);
      }
    });
    if (xs.length && zs.length) {
      boundsRef.current.minX = Math.min(...xs);
      boundsRef.current.maxX = Math.max(...xs);
      boundsRef.current.minZ = Math.min(...zs);
      boundsRef.current.maxZ = Math.max(...zs);
    }
  };

  useEffect(() => {
    // update bounds on mount and when window size or camera changes
    updateBounds();
    const onResize = () => updateBounds();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [camera]);

  const clampToBounds = (x: number, z: number) => {
    const b = boundsRef.current;
    return [Math.min(Math.max(x, b.minX), b.maxX), Math.min(Math.max(z, b.minZ), b.maxZ)];
  };

  const onWindowPointerMove = (ev: PointerEvent) => {
    if (!draggingRef.current) return;
    const pt = getPointFromClient(ev.clientX, ev.clientY);
    if (!pt || !groupRef.current) return;
    let nx = pt.x + dragOffsetRef.current.x;
    let nz = pt.z + dragOffsetRef.current.z;
    [nx, nz] = clampToBounds(nx, nz);
    groupRef.current.position.x = nx;
    groupRef.current.position.z = nz;
    onPositionChange?.([
      groupRef.current.position.x,
      groupRef.current.position.y,
      groupRef.current.position.z,
    ]);
  };

  const onWindowPointerUp = (ev: PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    gl.domElement.style.cursor = 'auto';
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
  };

  // cleanup on unmount in case listeners remain
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
    };
  }, []);

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

      // Réduire l'écart horizontal de base entre les yeux
      leftEyeRef.current.position.x = -0.07 + eyeMoveX;
      leftEyeRef.current.position.y = 0.05 + eyeMoveY;
      rightEyeRef.current.position.x = 0.07 + eyeMoveX;
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
        if (draggingRef.current) return;
        onClick?.();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
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
        <group position={[-0.07, 0.05, 0.35]}>
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
        <group position={[0.07, 0.05, 0.35]}>
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