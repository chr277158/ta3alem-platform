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
  const [showBubble, setShowBubble] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const tipTimeoutRef = useRef<number | null>(null);
  const bubbleTimeoutRef = useRef<number | null>(null);

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
    '/game': {
      text: 'اختر الإجابة بتركيز، وقل لي إذا أردتُ مساعدتك في الشرح 💡',
      mood: 'thinking',
    },
  };

  useEffect(() => {
    const baseRoute = '/' + pathname.split('/')[1];
    const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
    setMessage(context.text);
    setMood(context.mood);
    setBubbleKey((k) => k + 1);
    setShowBubble(false);
  }, [pathname, userName]);

  useEffect(() => {
    if (!isLoaded) return;

    const autoHint = window.setTimeout(() => {
      const baseRoute = '/' + pathname.split('/')[1];
      const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
      if (!showBubble) {
        setMessage(context.text);
        setMood(context.mood);
        setBubbleKey((k) => k + 1);
        setShowBubble(true);
      }
    }, 6000);

    return () => window.clearTimeout(autoHint);
  }, [pathname, isLoaded, showBubble]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const defaultScreenPos = { x: 16, y: 0 };
  const [screenPos, setScreenPos] = useState(defaultScreenPos);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const recenterAssistant = () => {
    const h = panelRef.current?.offsetHeight ?? 224;
    setScreenPos({ x: 16, y: window.innerHeight - h - 16 });
  };

  // position initiale en bas à gauche
  useEffect(() => {
    const setInitial = () => {
      const h = panelRef.current?.offsetHeight ?? 224;
      setScreenPos({ x: 16, y: window.innerHeight - h - 16 });
    };
    setInitial();
    window.addEventListener('resize', setInitial);
    return () => window.removeEventListener('resize', setInitial);
  }, []);

  const onPanelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    draggingRef.current = true;
    const rect = panelRef.current?.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPanelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    setIsBouncing(true);
    window.setTimeout(() => setIsBouncing(false), 360);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const onPanelPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const w = panelRef.current?.offsetWidth ?? 176;
    const h = panelRef.current?.offsetHeight ?? 224;
    const minX = -(w - 32);
    let nx = ev.clientX - dragOffset.current.x;
    let ny = ev.clientY - dragOffset.current.y;
    nx = Math.max(minX, Math.min(nx, window.innerWidth - w));
    ny = Math.max(0, Math.min(ny, window.innerHeight - h));
    setScreenPos({ x: nx, y: ny });
    if (!showBubble) {
      const baseRoute = '/' + pathname.split('/')[1];
      const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
      setMessage(context.text);
      setMood(context.mood);
      setBubbleKey((k) => k + 1);
      setShowBubble(true);
    }
  };

  const showTemporaryBubble = (tipText?: string, keepContext = true) => {
    if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    setShowBubble(true);
    if (tipText) {
      setMessage(tipText);
      setMood('thinking' as MishbakMood);
    } else {
      const baseRoute = '/' + pathname.split('/')[1];
      const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
      setMessage(context.text);
      setMood(context.mood);
    }
    setBubbleKey((k) => k + 1);

    if (keepContext) {
      bubbleTimeoutRef.current = window.setTimeout(() => {
        setShowBubble(false);
      }, 2600);
    }
  };

  const handleCompanionClick = () => {
    playChime('tap');
    const baseRoute = '/' + pathname.split('/')[1];
    const randomTips = [
      'هل تعلم؟ المراجعة اليومية تقوي الذاكرة! ',
      'نصيحة: اقرأ السؤال جيداً قبل اختيار الإجابة 👀',
      'أنت تبلي بلاءً حسناً، استمر! ',
      'لا بأس من الخطأ، فهو جزء من التعلم! 🌱',
      baseRoute === '/game' ? 'أستطيع أن أشرح لك السؤال خطوة بخطوة إذا أردتَ 💡' : 'أحتاجك لتستمر، وأنت قادر على ذلك ✨',
    ];
    const tip = randomTips[Math.floor(Math.random() * randomTips.length)];
    showTemporaryBubble(tip, true);
    if (tipTimeoutRef.current) window.clearTimeout(tipTimeoutRef.current);
    tipTimeoutRef.current = window.setTimeout(() => {
      playChime('tip');
      showTemporaryBubble(undefined, false);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (tipTimeoutRef.current) window.clearTimeout(tipTimeoutRef.current);
      if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    };
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      draggingRef.current = false;
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
    // full-screen overlay so assistant is always in front
    <div className="fixed inset-0 z-[2147483647] pointer-events-none">
      <button
        type="button"
        onClick={recenterAssistant}
        className="kid-recenter-btn"
        aria-label="Recentrer le compagnon"
      >
        ↺
      </button>
      <div
        ref={panelRef}
        style={{ left: screenPos.x, top: screenPos.y }}
        className="absolute w-44 h-56 rounded-t-2xl overflow-hidden cursor-pointer pointer-events-auto"
        // improve transform performance and touch behaviour
        aria-hidden={false}
        tabIndex={-1}
        role="dialog"
        onPointerDown={onPanelPointerDown}
        onPointerMove={onPanelPointerMove}
        onPointerUp={onPanelPointerUp}
        onClick={handleCompanionClick}
        title="اسحب أو انقر للحصول على نصيحة!"
      >
        {showBubble && (
          <div key={bubbleKey} className={`kid-speech-bubble ${isBouncing ? 'kid-bounce' : ''}`}>
            <p className="kid-speech-text">{message}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="kid-close-btn"
              aria-label="إخفاء المساعد"
            >
              ×
            </button>
          </div>
        )}
        
        <Canvas
          camera={{ position: [0, 0.6, 2.6], fov: 42 }}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
            background: 'rgba(255,255,255,0.02)',
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