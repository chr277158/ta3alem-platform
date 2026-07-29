'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { usePathname } from 'next/navigation';
import { useMishbak, MishbakMood } from '@/context/MishbakContext';
import { KidCompanion3D, KidCompanionMood } from './KidCompanion3D';
import './KidMishbakAssistant.css';

// نحوّل حالات السياق العامة (MishbakMood) إلى حالات الشخصية الجديدة
// هذا يسمح بإبقاء بقية التطبيق كما هو دون تعديل أي مكان آخر
function toKidMood(mood: MishbakMood): KidCompanionMood {
  switch (mood) {
    case 'happy':
      return 'happy';
    case 'excited':
      return 'excited';
    case 'celebrating':
      return 'celebrating';
    case 'thinking':
      return 'thinking';
    case 'encouraging':
      return 'encouraging';
    default:
      return 'happy';
  }
}

// نغمات بسيطة تُولَّد مباشرة بالمتصفح (Web Audio API) — لا حاجة لملفات صوتية خارجية
function playChime(kind: 'tap' | 'tip' = 'tap') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = kind === 'tap' ? [523.25, 659.25] : [523.25, 659.25, 783.99]; // دو-مي أو دو-مي-صول، نغمة مرحة وقصيرة
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
    // إغلاق السياق بعد انتهاء الصوت لتفادي تراكم الموارد
    setTimeout(() => ctx.close(), 600);
  } catch {
    // بعض المتصفحات تمنع الصوت قبل أول تفاعل من المستخدم — نتجاهل الخطأ بصمت
  }
}

export default function KidMishbakAssistant({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const { showMessage } = useMishbak();
  const [isVisible, setIsVisible] = useState(true);
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState<MishbakMood>('neutral' as MishbakMood);
  const [isLoaded, setIsLoaded] = useState(false);
  const [bubbleKey, setBubbleKey] = useState(0); // لإعادة تشغيل أنيميشن الفقاعة عند تغيّر الرسالة
  const tipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const contextualMessages: Record<string, { text: string; mood: MishbakMood }> = {
    '/dashboard': {
      text: userName
        ? `أهلاً بك يا ${userName}! ماذا سنتعلم اليوم؟ 🚀`
        : 'أهلاً بك يا بطل! ماذا سنتعلم اليوم؟ ',
      mood: 'happy',
    },
    '/daily': {
      text: 'لا تنسَ تحدي اليوم للحفاظ على سلسلة انتصاراتك! ',
      mood: 'excited',
    },
    '/mastery': {
      text: 'ما شاء الله! انظر إلى كل هذه الشارات، أنت نجم متلألئ ✨',
      mood: 'celebrating',
    },
    '/badges': {
      text: 'كل شارة جديدة هي خطوة نحو الإتقان! استمر يا بطل ',
      mood: 'happy',
    },
    '/games': {
      text: 'وقت المرح! استمتع باللعب الذي فتحته بجدارتك 🎮',
      mood: 'excited',
    },
  };

  useEffect(() => {
    const baseRoute = '/' + pathname.split('/')[1];
    const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
    setMessage(context.text);
    setMood(context.mood);
    setBubbleKey((k) => k + 1);
  }, [pathname, userName]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleCompanionClick = () => {
    playChime('tap');
    const randomTips = [
      'هل تعلم؟ المراجعة اليومية تقوي الذاكرة! ',
      'نصيحة: اقرأ السؤال جيداً قبل اختيار الإجابة 👀',
      'أنت تبلي بلاءً حسناً، استمر! ',
      'لا بأس من الخطأ، فهو جزء من التعلم! 🌱',
    ];
    const tip = randomTips[Math.floor(Math.random() * randomTips.length)];
    setMessage(tip);
    setMood('thinking' as MishbakMood);
    setBubbleKey((k) => k + 1);
    if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
    tipTimeoutRef.current = setTimeout(() => {
      playChime('tip');
      const baseRoute = '/' + pathname.split('/')[1];
      const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
      setMessage(context.text);
      setMood(context.mood);
      setBubbleKey((k) => k + 1);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="kid-reopen-btn"
        aria-label="إظهار المساعد"
      >
        <span className="text-2xl"></span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-2 z-40 flex flex-col items-start gap-3 w-44">
      <div key={bubbleKey} className="kid-speech-bubble">
        <p className="kid-speech-text">{message}</p>
        <button
          onClick={() => setIsVisible(false)}
          className="kid-close-btn"
          aria-label="إخفاء المساعد"
        >
          ×
        </button>
      </div>

      <div
        className="w-44 h-56 rounded-t-2xl relative overflow-hidden cursor-pointer z-20"
        onClick={handleCompanionClick}
        title="انقر للحصول على نصيحة!"
      >
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
          camera={{ position: [0, 0.6, 2.6], fov: 42 }}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
          }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={1.1} />
          <directionalLight position={[5, 5, 5]} intensity={1.4} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.5} color="#a78bfa" />
          <pointLight position={[0, 2, 0]} intensity={0.7} color="#fbbf24" />
          <Suspense fallback={null}>
            <KidCompanion3D mood={toKidMood(mood)} onClick={handleCompanionClick} />
            <ContactShadows position={[0, -0.55, 0]} opacity={0.35} scale={2} blur={2.5} far={3} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}