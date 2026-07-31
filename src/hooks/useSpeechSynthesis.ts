import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 🗣️ Hook للتخليق الصوتي باستخدام Web Speech API
 * يدعم اللغة العربية ويُحترم تفضيل تقليل الحركة
 */
export function useSpeechSynthesis(lang = 'ar-SA') {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // إيقاف الصوت عند إلغاء تحميل المكون
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('SpeechSynthesis غير مدعوم في هذا المتصفح');
      return;
    }

    // احترام prefers-reduced-motion - لا تشغيل صوت تلقائي
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    // إيقاف أي قراءة سابقة
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;   // أبطأ قليلاً ليكون أوضح للأطفال
    utterance.pitch = 1.1;  // أعلى قليلاً (صوت ودّي)
    utterance.volume = 1;

    // محاولة اختيار صوت عربي إذا كان متاحاً
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(
      (v) => v.lang.startsWith('ar') || v.lang.startsWith('ar-')
    );
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [lang]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { speak, stop, isSpeaking };
}