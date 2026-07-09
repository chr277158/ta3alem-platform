'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type MoleType = 'normal' | 'golden' | 'bad';

interface Hole {
  id: number;
  hasMole: boolean;
  moleType: MoleType;
  isHit: boolean;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG = {
  easy: { spawnRate: 1200, moleDuration: 1500, label: '😊 سهل', color: 'bg-green-500' },
  medium: { spawnRate: 900, moleDuration: 1100, label: '😐 متوسط', color: 'bg-yellow-500' },
  hard: { spawnRate: 600, moleDuration: 800, label: '😈 صعب', color: 'bg-red-500' }
};

const GAME_DURATION = 30; // ثانية
const SOUND_KEY = 'game-sound-muted';
const DIFFICULTY_KEY = 'whack-difficulty';

function createEmptyHoles(): Hole[] {
  return Array(9).fill(null).map((_, i) => ({
    id: i,
    hasMole: false,
    moleType: 'normal' as MoleType,
    isHit: false
  }));
}

export default function WhackGame() {
  const router = useRouter();
  const [holes, setHoles] = useState<Hole[]>(createEmptyHoles());

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [molesHit, setMolesHit] = useState(0);
  const [molesMissed, setMolesMissed] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lastHitId, setLastHitId] = useState<number | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [muted, setMuted] = useState(false);
  const [checking, setChecking] = useState(true);

  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moleTimersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const playSafe = useCallback((name: Parameters<typeof playSound>[0]) => {
    if (!muted) playSound(name);
  }, [muted]);

  // تحميل تفضيلات الصوت وآخر مستوى صعوبة مختار
  useEffect(() => {
    try {
      const savedMute = localStorage.getItem(SOUND_KEY);
      if (savedMute) setMuted(savedMute === 'true');
      const savedDifficulty = localStorage.getItem(DIFFICULTY_KEY) as Difficulty | null;
      if (savedDifficulty && savedDifficulty in DIFFICULTY_CONFIG) setDifficulty(savedDifficulty);
    } catch {
      // تجاهل أخطاء القراءة
    }
  }, []);

  // تحميل أعلى نتيجة لكل مستوى صعوبة (وتصفيرها إن لم توجد نتيجة محفوظة)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`whack_highscore_${difficulty}`);
      setHighScore(saved ? parseInt(saved, 10) : 0);
    } catch {
      setHighScore(0);
    }
  }, [difficulty]);

  // التحقق من أن اللعبة مفتوحة
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }

    fetch(`/api/badges?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.unlockedGames?.includes('whack')) {
          alert('🔒 يجب فتح شهادة المستوى 2 أولاً!');
          router.push('/games');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  // تنظيف المؤقتات عند الخروج
  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      moleTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // إنهاء اللعبة عندما ينتهي الوقت (خارج دالة تحديث الحالة لتفادي التأثيرات الجانبية داخلها)
  useEffect(() => {
    if (isPlaying && timeLeft <= 0) {
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isPlaying]);

  // اختيار نوع الخلد عشوائياً
  const getRandomMoleType = useCallback((): MoleType => {
    const rand = Math.random();
    if (rand < 0.08) return 'golden';   // 8% خلد ذهبي
    if (rand < 0.20) return 'bad';      // 12% خنزير
    return 'normal';                     // 80% عادي
  }, []);

  // إظهار خلد في ثقب عشوائي
  const spawnMole = useCallback(() => {
    setHoles(prev => {
      const availableHoles = prev.filter(h => !h.hasMole);
      if (availableHoles.length === 0) return prev;

      const randomHole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
      const moleType = getRandomMoleType();

      const newHoles = prev.map(h =>
        h.id === randomHole.id
          ? { ...h, hasMole: true, moleType, isHit: false }
          : h
      );

      // يلغي أي مؤقت قديم متبقٍّ لنفس الثقب لتفادي تعارضه مع الخلد الجديد
      const existingTimer = moleTimersRef.current.get(randomHole.id);
      if (existingTimer) clearTimeout(existingTimer);

      // إخفاء الخلد بعد مدة إن لم يُضرب
      const timer = setTimeout(() => {
        setHoles(current => {
          const hole = current.find(h => h.id === randomHole.id);
          if (hole?.hasMole && !hole.isHit) {
            setMolesMissed(m => m + 1);
            setCombo(0);
          }
          return current.map(h =>
            h.id === randomHole.id ? { ...h, hasMole: false, moleType: 'normal', isHit: false } : h
          );
        });
        moleTimersRef.current.delete(randomHole.id);
      }, DIFFICULTY_CONFIG[difficulty].moleDuration);

      moleTimersRef.current.set(randomHole.id, timer);

      return newHoles;
    });
  }, [difficulty, getRandomMoleType]);

  // بدء اللعبة
  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsPlaying(true);
    setIsGameOver(false);
    setCombo(0);
    setMaxCombo(0);
    setMolesHit(0);
    setMolesMissed(0);
    setShowStartScreen(false);

    moleTimersRef.current.forEach(timer => clearTimeout(timer));
    moleTimersRef.current.clear();
    setHoles(createEmptyHoles());

    playSafe('click');

    // مؤقت اللعبة
    gameTimerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // مؤقت ظهور الخلد
    spawnTimerRef.current = setInterval(() => {
      spawnMole();
    }, DIFFICULTY_CONFIG[difficulty].spawnRate);
  };

  // إنهاء اللعبة
  const endGame = () => {
    setIsPlaying(false);
    setIsGameOver(true);

    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    moleTimersRef.current.forEach(timer => clearTimeout(timer));
    moleTimersRef.current.clear();

    // حفظ أعلى نتيجة
    try {
      const key = `whack_highscore_${difficulty}`;
      const currentHigh = parseInt(localStorage.getItem(key) || '0', 10);
      setScore(currentScore => {
        if (currentScore > currentHigh) {
          localStorage.setItem(key, currentScore.toString());
          setHighScore(currentScore);
        }
        return currentScore;
      });
    } catch {
      // تجاهل أخطاء التخزين
    }

    playSafe('achievement');
  };

  // الضغط على خلد
  const whackMole = (holeId: number) => {
    if (!isPlaying) return;

    setHoles(prev => prev.map(h => {
      if (h.id === holeId && h.hasMole && !h.isHit) {
        if (h.moleType === 'bad') {
          // خنزير! خصم نقاط
          setScore(s => Math.max(0, s - 20));
          setCombo(0);
          playSafe('wrong');
        } else {
          // خلد عادي أو ذهبي
          const points = h.moleType === 'golden' ? 30 : 10;
          const comboBonus = Math.floor(combo / 3) * 5;
          setScore(s => s + points + comboBonus);
          setCombo(c => {
            const newCombo = c + 1;
            setMaxCombo(m => Math.max(m, newCombo));
            return newCombo;
          });
          setMolesHit(m => m + 1);
          playSafe(h.moleType === 'golden' ? 'achievement' : 'correct');
        }
        setLastHitId(holeId);
        setTimeout(() => setLastHitId(null), 300);

        // يلغي مؤقت الإخفاء التلقائي القديم حتى لا يؤثر على خلد جديد يظهر في نفس الثقب لاحقًا
        const existingTimer = moleTimersRef.current.get(holeId);
        if (existingTimer) clearTimeout(existingTimer);

        return { ...h, isHit: true };
      }
      return h;
    }));

    // إخفاء الخلد بعد ضربه
    const hideTimer = setTimeout(() => {
      setHoles(prev => prev.map(h =>
        h.id === holeId ? { ...h, hasMole: false, moleType: 'normal', isHit: false } : h
      ));
      moleTimersRef.current.delete(holeId);
    }, 200);
    moleTimersRef.current.set(holeId, hideTimer);
  };

  // الضغط على ثقب فارغ
  const whackEmpty = () => {
    if (!isPlaying) return;
    setCombo(0);
  };

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_KEY, String(next));
      } catch {
        // تجاهل
      }
      return next;
    });
  };

  const selectDifficulty = (level: Difficulty) => {
    setDifficulty(level);
    try {
      localStorage.setItem(DIFFICULTY_KEY, level);
    } catch {
      // تجاهل
    }
  };

  const config = DIFFICULTY_CONFIG[difficulty];

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center" dir="rtl">
        <div className="text-2xl font-bold text-gray-500 animate-pulse">⏳ جارٍ التحميل...</div>
      </div>
    );
  }

  // شاشة البداية
  if (showStartScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-center gap-3 mb-6 relative">
              <h1 className="text-4xl font-bold text-center">🎯 اضرب الخلد</h1>
              <button
                onClick={toggleMute}
                aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
                className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </div>

            <div className="text-center mb-8">
              <div className="text-8xl mb-4 animate-bounce">🐹</div>
              <p className="text-xl text-gray-600 mb-2">اضرب الخلدان قبل أن يختبئوا!</p>
              <div className="bg-yellow-50 rounded-xl p-4 mb-6">
                <div className="text-sm text-gray-700 space-y-1">
                  <div>🐹 خلد عادي = <span className="font-bold text-green-600">+10 نقاط</span></div>
                  <div>✨ خلد ذهبي = <span className="font-bold text-yellow-600">+30 نقطة</span></div>
                  <div>🐷 خنزير = <span className="font-bold text-red-600">-20 نقطة</span></div>
                  <div>🔥 كل 3 ضربات متتالية = <span className="font-bold text-purple-600">مكافأة!</span></div>
                </div>
              </div>

              <div className="text-lg font-bold mb-4 text-gray-700">اختر مستوى الصعوبة</div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(level => (
                  <button
                    key={level}
                    onClick={() => selectDifficulty(level)}
                    aria-pressed={difficulty === level}
                    className={`p-4 rounded-xl font-bold transition-all ${
                      difficulty === level
                        ? `${DIFFICULTY_CONFIG[level].color} text-white scale-105 shadow-lg`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
                  >
                    <div className="text-2xl mb-1">
                      {level === 'easy' && '😊'}
                      {level === 'medium' && '😐'}
                      {level === 'hard' && '😈'}
                    </div>
                    <div className="text-sm">
                      {level === 'easy' && 'سهل'}
                      {level === 'medium' && 'متوسط'}
                      {level === 'hard' && 'صعب'}
                    </div>
                  </button>
                ))}
              </div>

              {highScore > 0 && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-6">
                  <div className="text-sm">أعلى نتيجة</div>
                  <div className="text-2xl font-bold">{highScore}</div>
                </div>
              )}

              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-xl font-bold text-xl hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                🎮 ابدأ اللعبة!
              </button>
            </div>

            <button
              onClick={() => router.push('/games')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              🏠 العودة للألعاب
            </button>
          </div>
        </div>
      </div>
    );
  }

  // شاشة نهاية اللعبة
  if (isGameOver) {
    const isNewRecord = score >= highScore && score > 0;
    const rating = score >= 200 ? '🏆' : score >= 100 ? '🎉' : score >= 50 ? '👍' : '💪';
    const message = score >= 200 ? 'أداء خرافي!' : score >= 100 ? 'أحسنت!' : score >= 50 ? 'جيد!' : 'حاول مرة أخرى!';

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center">
              <div className="text-8xl mb-4 animate-bounce">{rating}</div>
              <h2 className="text-3xl font-bold mb-2">{message}</h2>

              {isNewRecord && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-4 animate-pulse">
                  🎊 رقم قياسي جديد! 🎊
                </div>
              )}

              <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-6 mb-6">
                <div className="text-6xl font-bold text-orange-600 mb-2">{score}</div>
                <div className="text-gray-600">نقطة</div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-green-50 rounded-xl p-3">
                  <div className="text-2xl font-bold text-green-600">{molesHit}</div>
                  <div className="text-xs text-gray-600">تم ضربه</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="text-2xl font-bold text-red-600">{molesMissed}</div>
                  <div className="text-xs text-gray-600">فاته</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <div className="text-2xl font-bold text-purple-600">{maxCombo}</div>
                  <div className="text-xs text-gray-600">أعلى كومبو</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={startGame}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-teal-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                >
                  🔄 العب مرة أخرى
                </button>
                <button
                  onClick={() => router.push('/games')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                >
                  🏠 العودة
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // شاشة اللعب
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <div className="flex items-center justify-center gap-3 mb-4 relative">
            <h1 className="text-3xl font-bold text-center">🎯 اضرب الخلد</h1>
            <button
              onClick={toggleMute}
              aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
              className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 flex items-center justify-center text-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>

          {/* شريط المعلومات */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-orange-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{score}</div>
              <div className="text-xs text-gray-600">النقاط</div>
            </div>
            <div className={`rounded-xl p-3 text-center text-white ${
              timeLeft <= 10 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
            }`}>
              <div className="text-2xl font-bold">{timeLeft}</div>
              <div className="text-xs">ثانية</div>
            </div>
            <div className="bg-purple-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {combo > 0 ? `🔥${combo}` : '0'}
              </div>
              <div className="text-xs text-gray-600">كومبو</div>
            </div>
          </div>

          {/* مستوى الصعوبة */}
          <div className="text-center mb-4">
            <span className={`${config.color} text-white px-4 py-1 rounded-full text-sm font-bold`}>
              {config.label}
            </span>
          </div>

          {/* لوحة اللعب */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-4">
            {holes.map(hole => {
              const isLastHit = lastHitId === hole.id;
              const holeLabel = hole.hasMole
                ? hole.moleType === 'golden' ? 'خلد ذهبي' : hole.moleType === 'bad' ? 'خنزير' : 'خلد عادي'
                : 'ثقب فارغ';

              return (
                <button
                  key={hole.id}
                  onClick={() => hole.hasMole ? whackMole(hole.id) : whackEmpty()}
                  aria-label={holeLabel}
                  className={`aspect-square rounded-2xl relative overflow-hidden transition-all transform ${
                    isLastHit ? 'scale-95' : 'hover:scale-105'
                  } ${
                    hole.hasMole
                      ? 'bg-gradient-to-br from-amber-200 to-orange-300 cursor-pointer'
                      : 'bg-gradient-to-br from-green-800 to-green-900'
                  } focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300`}
                >
                  {/* الثقب */}
                  <div className="absolute inset-0 flex items-end justify-center">
                    <div className="w-full h-1/3 bg-gradient-to-t from-black/40 to-transparent rounded-b-2xl"></div>
                  </div>

                  {/* الخلد */}
                  {hole.hasMole && (
                    <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                      hole.isHit ? 'scale-0 rotate-180 opacity-0' : 'scale-100 animate-bounce'
                    }`}>
                      <div className="text-6xl">
                        {hole.moleType === 'golden' && '✨'}
                        {hole.moleType === 'bad' && '🐷'}
                        {hole.moleType === 'normal' && '🐹'}
                      </div>
                    </div>
                  )}

                  {/* تأثير الضربة */}
                  {hole.isHit && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-5xl animate-ping">
                        {hole.moleType === 'bad' ? '💨' : '💥'}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* شريط التقدم الزمني */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full transition-all duration-1000 ${
                timeLeft <= 10 ? 'bg-red-500' : 'bg-gradient-to-r from-orange-500 to-red-500'
              }`}
              style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
            ></div>
          </div>

          {/* زر الإنهاء المبكر */}
          <button
            onClick={endGame}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-xl font-bold hover:bg-gray-300 transition-all text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            ⏹️ إنهاء اللعبة
          </button>
        </div>
      </div>
    </div>
  );
}
