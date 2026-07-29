'use client';

import { useContext } from 'react';
import { MishbakContext } from '@/context/MishbakContext';

type MishbakContextValue = {
  showMessage: (message: string, mood: string, duration: number) => void;
  setMood: (mood: string) => void;
};

export function useGameCompanion() {
  const context = useContext(MishbakContext) as MishbakContextValue | null;

  if (!context) {
    throw new Error('useGameCompanion must be used within MishbakProvider');
  }

  // تشجيع عند الإجابة الصحيحة
  const celebrateCorrectAnswer = () => {
    context.showMessage('أحسنت! إجابة رائعة وممتازة ', 'celebrating', 3000);
    playSoundEffect('success');
  };

  // تشجيع عند الإجابة الخاطئة
  const encourageWrongAnswer = () => {
    context.showMessage('لا تيأس! الخطأ جزء من التعلم ', 'encouraging', 4000);
    playSoundEffect('gentle');
  };

  // احتفال عند إنهاء المستوى
  const celebrateLevelComplete = (score: number) => {
    const messages = [
      `أداء رائع! حصلت على ${score} نقطة 🎉`,
      'أنت بطل حقيقي! استمر هكذا ',
      'ما شاء الله! مستوى الإتقان 🌟',
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    context.showMessage(message, 'celebrating', 5000);
    playSoundEffect('celebration');
  };

  // تحذير عند نفاذ المحاولات
  const warnLowHearts = (hearts: number) => {
    const messages = [
      `انتبه! تبقى لديك ${hearts} محاولات فقط ️`,
      'ركز جيداً! المحاولات تنفذ 🎯',
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    context.showMessage(message, 'thinking', 3500);
  };

  // تهنئة عند فتح شارة جديدة
  const celebrateNewBadge = (badgeName: string) => {
    context.showMessage(
      `🎉 مبروك! فتحت شارة "${badgeName}" الجديدة!`,
      'celebrating',
      5000
    );
    playSoundEffect('unlock');
  };

  // تشجيع على الاستمرار
  const encourageContinue = () => {
    const messages = [
      'أنت على الطريق الصحيح! استمر 🚀',
      'كل سؤال تجيب عليه يجعلك أقوى ',
      'المثابرة هي مفتاح النجاح 🌟',
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    context.showMessage(message, 'happy', 3500);
  };

  // تشغيل مؤثرات صوتية بسيطة
  const playSoundEffect = (type: 'success' | 'gentle' | 'celebration' | 'unlock') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      const playNote = (freq: number, delay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type === 'celebration' ? 'triangle' : 'sine';
        osc.frequency.value = freq;

        const start = ctx.currentTime + delay;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(type === 'celebration' ? 0.2 : 0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      switch (type) {
        case 'success':
          playNote(523.25, 0, 0.2); // Do
          playNote(659.25, 0.1, 0.2); // Mi
          break;
        case 'gentle':
          playNote(392.0, 0, 0.25); // Sol (أخفض)
          break;
        case 'celebration':
          playNote(523.25, 0, 0.3); // Do
          playNote(659.25, 0.1, 0.3); // Mi
          playNote(783.99, 0.2, 0.4); // Sol
          playNote(1046.5, 0.3, 0.5); // Do (أوكتاف أعلى)
          break;
        case 'unlock':
          playNote(523.25, 0, 0.15);
          playNote(659.25, 0.08, 0.15);
          playNote(783.99, 0.16, 0.2);
          playNote(1046.5, 0.24, 0.3);
          break;
      }

      setTimeout(() => ctx.close(), 1000);
    } catch {
      // تجاهل الأخطاء إذا كان الصوت ممنوعاً
    }
  };

  return {
    celebrateCorrectAnswer,
    encourageWrongAnswer,
    celebrateLevelComplete,
    warnLowHearts,
    celebrateNewBadge,
    encourageContinue,
    showMessage: context.showMessage,
    setMood: context.setMood,
  };
}