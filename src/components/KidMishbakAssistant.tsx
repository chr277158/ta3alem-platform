'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { KidCompanion3D } from './KidCompanion3D';
import type { KidCompanionMood } from './KidCompanion3D';
import './KidMishbakAssistant.css';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

// ⏱️ جميع الثوابت الزمنية في مكان واحد - قابلة للتعديل والاختبار بسهولة
const MISHBAK_TIMINGS = {
  INITIAL_LOAD: 1000,        // مدة ظهور المساعد بعد تحميل الصفحة
  AUTO_HINT_DELAY: 6000,     // مدة انتظار قبل عرض تلميح تلقائي
  TEMPORARY_BUBBLE: 2600,    // مدة عرض فقاعة الرسالة العابرة
  RETURN_TO_CONTEXT: 4000,   // مدة انتظار قبل العودة إلى الرسالة السياقية
  BOUNCE_DURATION: 360,      // مدة أنيميشن kidBounce (يجب أن يطابق CSS)
};

// 🔁 رسائل سياقية لكل مسار - يمكن إثراؤها لاحقاً من قاعدة بيانات
const CONTEXTUAL_MESSAGES: Record<string, { text: string; mood: KidCompanionMood }> = {
  '/dashboard': { text: 'أهلاً بعودتك! أي مهمة سنبدأ بها اليوم؟', mood: 'happy' },
  '/rewards':  { text: 'رائع! لقد جمعت جدارتك، هيا نستمتع 🎁', mood: 'excited' },
  '/game':     { text: 'اختر الإجابة بتركيز، وقل لي إذا أردتُ مساعدتك في الشرح 💡', mood: 'thinking' },
};

const FALLBACK_MESSAGE = {
  text: 'أهلاً! أنا مشبك، مساعدك الشخصي.',
  mood: 'happy' as KidCompanionMood,
};

interface BubblePayload {
  text: string;
  mood: KidCompanionMood;
  duration: 'short' | 'auto' | 'persistent';
  speak?: boolean;
}

export default function KidMishbakAssistant({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);

  const [message, setMessage] = useState(FALLBACK_MESSAGE.text);
  const [mood, setMood] = useState<KidCompanionMood>(FALLBACK_MESSAGE.mood);
  const [showBubble, setShowBubble] = useState(false);

  // 📬 طابور الرسائل - يعالج رسالة واحدة فقط في كل لحظة
  const messageQueueRef = useRef<BubblePayload[]>([]);
  const isDisplayingRef = useRef(false);

  // ⏱️ جميع الـ timeouts في refs منفصلة لتنظيفها بدقة
  const activeTimeoutsRef = useRef<{
    autoHint?: number;
    bubbleHide?: number;
    bounce?: number;
    contextReturn?: number;
  }>({});

  const abortControllerRef = useRef<AbortController | null>(null);
  const { speak: ttsSpeak, isSpeaking } = useSpeechSynthesis('ar-SA');

  // 🧹 دالة مساعدة لتنظيف timeout محدد
  const clearNamedTimeout = (name: keyof typeof activeTimeoutsRef.current) => {
    if (activeTimeoutsRef.current[name]) {
      window.clearTimeout(activeTimeoutsRef.current[name]!);
      delete activeTimeoutsRef.current[name];
    }
  };

  // 🧹 تنظيف شامل عند إلغاء التشغيل
  const clearAllTimeouts = () => {
    Object.keys(activeTimeoutsRef.current).forEach((k) =>
      clearNamedTimeout(k as keyof typeof activeTimeoutsRef.current)
    );
  };

  // 📺 الدالة الموحدة الوحيدة لعرض الرسائل
  const displayBubble = useCallback((payload: BubblePayload) => {
    clearNamedTimeout('bubbleHide');
    clearNamedTimeout('contextReturn');

    setMessage(payload.text);
    setMood(payload.mood);
    setBubbleKey((k) => k + 1);
    setShowBubble(true);

    // 🔊 قراءة صوتية اختيارية - مفيدة للأطفال الصغار
    if (payload.speak) {
      ttsSpeak(payload.text);
    }

    // إخفاء تلقائي للرسائل العابرة
    if (payload.duration === 'short') {
      activeTimeoutsRef.current.bubbleHide = window.setTimeout(() => {
        setShowBubble(false);
      }, MISHBAK_TIMINGS.TEMPORARY_BUBBLE);
    }
  }, [ttsSpeak]);

  // 📬 معالج طابور الرسائل - يعرض الرسالة التالية عند انتهاء الحالية
  const processQueue = useCallback(() => {
    if (isDisplayingRef.current || messageQueueRef.current.length === 0) return;

    const next = messageQueueRef.current.shift()!;
    isDisplayingRef.current = true;
    displayBubble(next);

    const waitTime = next.duration === 'short'
      ? MISHBAK_TIMINGS.TEMPORARY_BUBBLE
      : next.duration === 'auto'
        ? MISHBAK_TIMINGS.RETURN_TO_CONTEXT
        : 0;

    if (waitTime > 0) {
      window.setTimeout(() => {
        isDisplayingRef.current = false;
        processQueue();
      }, waitTime);
    } else {
      // persistent - ينتظر حتى ينقر الطفل
      isDisplayingRef.current = false;
    }
  }, [displayBubble]);

  // ➕ إضافة رسالة إلى الطابور
  const queueMessage = useCallback((payload: BubblePayload, priority: 'low' | 'high' = 'low') => {
    if (priority === 'high') {
      // الرسائل عالية الأولوية تُدخل في بداية الطابور وتُلغي الرسالة الحالية
      messageQueueRef.current.unshift(payload);
      isDisplayingRef.current = false;
      clearNamedTimeout('bubbleHide');
      clearNamedTimeout('contextReturn');
      setShowBubble(false);
    } else {
      messageQueueRef.current.push(payload);
    }
    processQueue();
  }, [processQueue]);

  // 🔁 تحميل الرسالة السياقية لكل صفحة
  useEffect(() => {
    const baseRoute = '/' + pathname.split('/')[1];
    const context = CONTEXTUAL_MESSAGES[baseRoute] ?? CONTEXTUAL_MESSAGES['/dashboard']!;

    setMessage(context.text);
    setMood(context.mood);
    setBubbleKey((k) => k + 1);
    setShowBubble(false);

    // 🛑 إلغاء أي رسالة معلقة عند تغيير الصفحة
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    clearAllTimeouts();
    messageQueueRef.current = [];
    isDisplayingRef.current = false;
  }, [pathname, userName]);

  // ⏰ عرض تلميح تلقائي إذا لم يتفاعل الطفل
  useEffect(() => {
    if (!isLoaded) return;

    activeTimeoutsRef.current.autoHint = window.setTimeout(() => {
      if (!showBubble && !isDisplayingRef.current) {
        const baseRoute = '/' + pathname.split('/')[1];
        const context = CONTEXTUAL_MESSAGES[baseRoute] ?? FALLBACK_MESSAGE;
        queueMessage({
          text: context.text,
          mood: context.mood,
          duration: 'auto',
          speak: true,
        }, 'high');
      }
    }, MISHBAK_TIMINGS.AUTO_HINT_DELAY);

    return () => clearNamedTimeout('autoHint');
  }, [pathname, isLoaded, showBubble, queueMessage]);

  // 🚀 التحميل الأولي
  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoaded(true), MISHBAK_TIMINGS.INITIAL_LOAD);
    return () => window.clearTimeout(timer);
  }, []);

  // 🧹 تنظيف شامل عند إلغاء التحميل
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      clearAllTimeouts();
    };
  }, []);

  // 🖱️ تفاعل السحب
  const draggingRef = useRef(false);
  const [screenPos, setScreenPos] = useState({ x: 30, y: 30 });

  const onPanelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };

  const onPanelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    setIsBouncing(true);
    activeTimeoutsRef.current.bounce = window.setTimeout(() => {
      setIsBouncing(false);
    }, MISHBAK_TIMINGS.BOUNCE_DURATION);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const onPanelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const w = e.currentTarget.offsetWidth;
    const h = e.currentTarget.offsetHeight;
    const minX = 10;
    let nx = e.clientX - w / 2;
    let ny = e.clientY - h / 2;
    nx = Math.max(minX, Math.min(nx, window.innerWidth - w));
    ny = Math.max(0, Math.min(ny, window.innerHeight - h));
    setScreenPos({ x: nx, y: ny });
  };

  // 🎯 عند النقر على المساعد - عرض نصيحة من الطابور
  const handleCompanionClick = () => {
    playChime('tap');
    const baseRoute = '/' + pathname.split('/')[1];

    const randomTips: Array<{ text: string; mood: KidCompanionMood }> = [
      { text: 'هل تعلم؟ المراجعة اليومية تقوي الذاكرة!', mood: 'thinking' },
      { text: 'نصيحة: اقرأ السؤال جيداً قبل اختيار الإجابة 👀', mood: 'thinking' },
      { text: 'أنت تبلي بلاءً حسناً، استمر!', mood: 'happy' },
      { text: 'لا بأس من الخطأ، فهو جزء من التعلّم! 🌱', mood: 'happy' },
      { 
        text: baseRoute === '/game'
          ? 'أستطيع أن أشرح لك السؤال خطوة بخطوة إذا أردتَ 💡'
          : 'أحتاجك لتستمر، وأنت قادر على ذلك ✨',
        mood: 'thinking'
      },
    ];

    const tip = randomTips[Math.floor(Math.random() * randomTips.length)];

    queueMessage({
      text: tip.text,
      mood: tip.mood,
      duration: 'auto',
      speak: true,
    }, 'high');

    // العودة للرسالة السياقية بعد انتهاء النصيحة
    activeTimeoutsRef.current.contextReturn = window.setTimeout(() => {
      playChime('tip');
      const context = CONTEXTUAL_MESSAGES[baseRoute] ?? FALLBACK_MESSAGE;
      queueMessage({
        text: context.text,
        mood: context.mood,
        duration: 'auto',
      });
    }, MISHBAK_TIMINGS.RETURN_TO_CONTEXT);
  };

  if (!isVisible) return null;

  return (
    <div
      className="kid-companion-panel"
      style={{ left: screenPos.x, top: screenPos.y }}
      onPointerDown={onPanelPointerDown}
      onPointerMove={onPanelPointerMove}
      onPointerUp={onPanelPointerUp}
    >
      <div
        className={`kid-companion-avatar ${isLoaded ? 'loaded' : ''}`}
        onClick={handleCompanionClick}
        title="اسحب أو انقر للحصول على نصيحة!"
        role="button"
        tabIndex={0}
        aria-label="المساعد مشبك - انقر للنصيحة"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCompanionClick(); }}
        style={{ position: 'relative', cursor: 'grab', userSelect: 'none' }}
      >
        {showBubble && (
          <div key={bubbleKey} className={`kid-speech-bubble ${isBouncing ? 'kid-bounce' : ''}`}>
            <p className="kid-speech-text">{message}</p>
            {/* 🔊 زر القراءة الصوتية - يظهر فقط إن كان الصوت غير مُشغل */}
            {!isSpeaking && (
              <button
                className="kid-tts-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  ttsSpeak(message);
                }}
                aria-label="اقرأ لي الرسالة"
                title="اقرأ لي 🗣️"
              >
                🔊
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
              className="kid-close-btn"
              aria-label="إخفاء المساعد"
            >
              ×
            </button>
          </div>
        )}

        <Canvas 
          camera={{ position: [0, 0.6, 2.6], fov: 42 }} 
          shadows
          gl={{ alpha: true, antialias: true }}
          style={{ pointerEvents: 'none', width: '220px', height: '150px', margin: 'auto' }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 5, 5]} intensity={1.4} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.6} color="#a78bfa" />
          <pointLight position={[0, 2, 0]} intensity={0.8} color="#fbbf24" />
          <KidCompanion3D mood={mood} />
        </Canvas>
      </div>
    </div>
  );
}

// دالة مساعدة للصوت - يمكن استبدالها بمكتبة صوتية حقيقية
function playChime(type: 'tap' | 'tip') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = type === 'tap' ? 660 : 880;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}