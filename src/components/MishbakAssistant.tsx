'use client';

import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { usePathname } from 'next/navigation';
import { useMishbak, MishbakMood } from '@/context/MishbakContext';
import { Companion3D } from './Companion3D';

export default function MishbakAssistant({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const { showMessage } = useMishbak();
  
  const [isVisible, setIsVisible] = useState(true);
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState<MishbakMood>('neutral');
  const [isLoaded, setIsLoaded] = useState(false);

  // قاموس الرسائل السياقية
  const contextualMessages: Record<string, { text: string; mood: MishbakMood }> = {
    '/dashboard': { 
      text: userName 
        ? `أهلاً بك يا ${userName}! ماذا سنتعلم اليوم؟ 🚀` 
        : 'أهلاً بك يا بطل! ماذا سنتعلم اليوم؟ 🚀', 
      mood: 'happy' 
    },
    '/daily': { 
      text: 'لا تنسَ تحدي اليوم للحفاظ على سلسلة انتصاراتك! 🔥', 
      mood: 'excited' 
    },
    '/mastery': { 
      text: 'ما شاء الله! انظر إلى كل هذه الشارات، أنت نجم متلألئ ✨', 
      mood: 'celebrating' 
    },
    '/badges': { 
      text: 'كل شارة جديدة هي خطوة نحو الإتقان! استمر يا بطل 🏆', 
      mood: 'happy' 
    },
    '/games': { 
      text: 'وقت المرح! استمتع باللعب الذي فتحته بجدارتك 🎮', 
      mood: 'excited' 
    },
  };

  // تحديث الرسالة تلقائياً عند تغيير الصفحة
  useEffect(() => {
    const baseRoute = '/' + pathname.split('/')[1];
    const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
    setMessage(context.text);
    setMood(context.mood);
  }, [pathname, userName]);

  // إخفاء شاشة التحميل
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleCompanionClick = () => {
    const randomTips = [
      'هل تعلم؟ المراجعة اليومية تقوي الذاكرة! 🧠',
      'نصيحة: اقرأ السؤال جيداً قبل اختيار الإجابة 👀',
      'أنت تبلي بلاءً حسناً، استمر! 💪',
      'لا بأس من الخطأ، فهو جزء من التعلم! 🌱',
      'جرّب تحدي اليوم لتحصل على نقاط مضاعفة! ⭐',
      'هل تعلم أن اللعب يساعد على تثبيت المعلومات؟ 🎯',
    ];
    const tip = randomTips[Math.floor(Math.random() * randomTips.length)];
    setMessage(tip);
    setMood('thinking');
    setTimeout(() => {
      const baseRoute = '/' + pathname.split('/')[1];
      const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
      setMessage(context.text);
      setMood(context.mood);
    }, 4000);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-full shadow-xl hover:scale-110 transition-all duration-300"
        aria-label="إظهار المساعد"
      >
        <span className="text-2xl">🤖</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-2 z-40 flex flex-col items-start gap-1 w-56">
      {/* فقاعة الرسالة */}
      <div className="bg-white/95 backdrop-blur-sm text-gray-800 px-4 py-3 rounded-2xl rounded-bl-none shadow-xl border border-blue-200 max-w-[220px] text-sm font-medium relative animate-fade-in-up">
        <p className="leading-relaxed">{message}</p>
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute -top-2 -left-2 bg-red-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500 transition-colors shadow-md"
        >
          ×
        </button>
      </div>

      {/* المشهد ثلاثي الأبعاد */}
      <div 
        className="w-56 h-56 rounded-t-2xl relative overflow-hidden cursor-pointer"
        onClick={handleCompanionClick}
        title="انقر للحصول على نصيحة!"
      >
        {/* خلفية متدرجة */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-200/50 via-purple-100/30 to-transparent rounded-t-2xl" />
        
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-blue-600 text-xs font-medium">جاري التحميل...</span>
            </div>
          </div>
        )}
        
        <Canvas
          camera={{ position: [0, 0.5, 2.5], fov: 45 }}
          style={{ 
            opacity: isLoaded ? 1 : 0, 
            transition: 'opacity 0.8s ease-in-out' 
          }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.4} color="#a78bfa" />
          
          <Suspense fallback={null}>
            <Companion3D mood={mood} onClick={handleCompanionClick} />
            <ContactShadows 
              position={[0, -0.79, 0]} 
              opacity={0.4} 
              scale={3} 
              blur={2} 
            />
            <Environment preset="sunset" />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}