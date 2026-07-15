'use client';

import { Canvas } from '@react-three/fiber';
import { Float, Stars, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useState, Component, ReactNode } from 'react';

interface Companion3DProps {
  avatarType: string;
  mood: 'happy' | 'neutral' | 'sad';
}

// النموذج الوحيد المتوفر فعلياً في public/models هو walk.glb.
// لا توجد ملفات robot.glb / astronaut.glb / wizard.glb / animal.glb، لذلك
// نربط كل أنواع الأفاتار بهذا النموذج المتوفر بدل تخمين مسار غير موجود
// (وهو ما كان يسبب طلب 404 وتعطّل الصفحة بالكامل).
// عند إضافة نماذج مخصّصة لاحقاً، يكفي إضافة مدخل هنا يشير لملفها الحقيقي.
const AVATAR_MODEL_MAP: Record<string, string> = {
  robot: '/models/walk.glb',
  astronaut: '/models/walk.glb',
  wizard: '/models/walk.glb',
  animal: '/models/walk.glb',
};
const DEFAULT_MODEL = '/models/walk.glb';

function getModelPath(avatarType: string) {
  return AVATAR_MODEL_MAP[avatarType] ?? DEFAULT_MODEL;
}

function CharacterModel({ avatarType }: { avatarType: string }) {
  const { scene } = useGLTF(getModelPath(avatarType));
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <primitive object={scene} scale={1.5} position={[0, -1, 0]} />
    </Float>
  );
}

// Suspense fallback أثناء تحميل النموذج (بدل شاشة فارغة)
function ModelLoadingFallback() {
  return (
    <mesh position={[0, -0.5, 0]}>
      <sphereGeometry args={[0.6, 16, 16]} />
      <meshStandardMaterial color="#a5b4fc" wireframe />
    </mesh>
  );
}

// Error Boundary: لو فشل تحميل أي نموذج (ملف مفقود، شبكة، إلخ)
// نعرض بديلاً بسيطاً بدل إسقاط الصفحة كلها.
class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('❌ Companion3D failed to load model:', error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function AvatarEmojiFallback({ avatarType, mood }: Companion3DProps) {
  const icons: Record<string, string> = {
    robot: '🤖',
    astronaut: '👨‍🚀',
    wizard: '🧙‍♂️',
    animal: '🦁',
  };
  return (
    <div className="w-full h-full flex items-center justify-center text-7xl">
      {icons[avatarType] ?? '🤖'}
    </div>
  );
}

export default function Companion3D({ avatarType, mood }: Companion3DProps) {
  // لو حصل خطأ WebGL/Canvas على مستوى المتصفح نفسه، نتجنّب حتى محاولة تركيب Canvas
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglSupported(!!gl);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  return (
    <div className="w-40 h-40 md:w-56 md:h-56 relative">
      {webglSupported ? (
        <ModelErrorBoundary
          fallback={<AvatarEmojiFallback avatarType={avatarType} mood={mood} />}
        >
          <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
            {/* إضاءة محيطة واتجاهية لإبراز الـ 3D */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
            <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff00ff" />

            {/* خلفية نجوم خفيفة لإعطاء عمق */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {/* الشخصية */}
            <Suspense fallback={<ModelLoadingFallback />}>
              <CharacterModel avatarType={avatarType} />
            </Suspense>
          </Canvas>
        </ModelErrorBoundary>
      ) : (
        <AvatarEmojiFallback avatarType={avatarType} mood={mood} />
      )}

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

useGLTF.preload('/models/walk.glb');
