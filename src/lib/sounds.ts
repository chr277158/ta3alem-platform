// src/lib/sounds.ts

// إنشاء AudioContext واحد (أفضل للأداء)
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext!;
}

// دالة موحدة لتشغيل الأصوات
export function playSound(soundName: string): void {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // إعدادات مختلفة لكل صوت
  switch (soundName) {
    case 'correct':
      oscillator.frequency.value = 523.25; // C5
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
      break;

    case 'wrong':
      oscillator.frequency.value = 200; // منخفض
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
      break;

    case 'achievement':
      // نغمة صاعدة (3 نغمات)
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
      break;

    case 'click':
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
      break;

    case 'levelup':
      // نغمة احتفالية
      const levelNotes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
      levelNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.4);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.4);
      });
      break;

    default:
      // صوت افتراضي
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
  }
}

// الحفاظ على التوافق مع الكود القديم
export function playClickSound(): void {
  playSound('click');
}

export function playCorrectSound(): void {
  playSound('correct');
}

export function playWrongSound(): void {
  playSound('wrong');
}

export function playAchievementSound(): void {
  playSound('achievement');
}
type SoundName = 'click' | 'correct' | 'powerup' | 'wrong' | 'achievement';

const soundMap: Record<SoundName, string> = {
  click: '/sounds/click.wav',
  correct: '/sounds/eat.wav',
  powerup: '/sounds/powerup.wav',
  wrong: '/sounds/gameover.wav',
  achievement: '/sounds/achievement.wav',
};

export function playSound(name: SoundName) {
  try {
    const audio = new Audio(soundMap[name]);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}