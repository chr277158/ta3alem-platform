'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type Color = 'green' | 'red' | 'yellow' | 'blue';

interface ColorButton {
  id: Color;
  color: string;
  activeColor: string;
  position: string;
  label: string;
  frequency: number;
}

const COLORS: ColorButton[] = [
  { id: 'green', color: 'bg-green-500', activeColor: 'bg-green-300', position: 'top-left', label: 'أخضر', frequency: 261.63 },
  { id: 'red', color: 'bg-red-500', activeColor: 'bg-red-300', position: 'top-right', label: 'أحمر', frequency: 329.63 },
  { id: 'yellow', color: 'bg-yellow-500', activeColor: 'bg-yellow-300', position: 'bottom-left', label: 'أصفر', frequency: 392.00 },
  { id: 'blue', color: 'bg-blue-500', activeColor: 'bg-blue-300', position: 'bottom-right', label: 'أزرق', frequency: 523.25 }
];

type GameState = 'menu' | 'playing' | 'showing' | 'waiting' | 'gameover';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG = {
  easy: { label: '😊 سهل', initialSpeed: 800, speedDecrement: 0 },
  medium: { label: '😐 متوسط', initialSpeed: 600, speedDecrement: 20 },
  hard: { label: '😈 صعب', initialSpeed: 400, speedDecrement: 30 }
};

export default function SimonGame() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerSequence, setPlayerSequence] = useState<Color[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [activeButton, setActiveButton] = useState<Color | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showingIndex, setShowingIndex] = useState(0);
  const [isStrict, setIsStrict] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]); // مصفوفة لتتبع وتنظيف المؤقتات

  // تنظيف جميع المؤقتات لمنع تسريب الذاكرة
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  // التحقق من صلاحيات الدخول والالعاب المفتوحة
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }

    fetch(`/api/badges?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.unlockedGames?.includes('simon')) {
          alert('🔒 يجب فتح شهادة المستوى 4 أولاً!');
          router.push('/games');
        }
      })
      .catch(err => console.error("Error fetching badges:", err));

    return () => clearAllTimeouts();
  }, [router]);

  // تحميل أعلى نتيجة
  useEffect(() => {
    const saved = localStorage.getItem(`simon_highscore_${difficulty}`);
    if (saved) {
      setHighScore(parseInt(saved));
    } else {
      setHighScore(0);
    }
  }, [difficulty]);

  // إنشاء AudioContext
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // تشغيل صوت للون
  const playColorSound = useCallback((color: Color) => {
    if (!audioContextRef.current) return;
    
    // تفعيل الصوت في المتصفحات الحديثة في حال كان معلقاً
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const colorData = COLORS.find(c => c.id === color);
    if (!colorData) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = colorData.frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.3);
  }, []);

  // دالة عرض التسلسل المحسنة والمحمية من التداخل
  const showSequence = useCallback(async (currentSequence: Color[]) => {
    setGameState('showing');
    setPlayerSequence([]);
    setShowingIndex(0);

    const config = DIFFICULTY_CONFIG[difficulty];
    const speed = Math.max(200, config.initialSpeed - (currentSequence.length * config.speedDecrement));

    await new Promise(resolve => {
      const t = setTimeout(resolve, 500);
      timeoutsRef.current.push(t);
    });

    for (let i = 0; i < currentSequence.length; i++) {
      await new Promise(resolve => {
        const t = setTimeout(resolve, speed);
        timeoutsRef.current.push(t);
      });
      
      const color = currentSequence[i];
      setActiveButton(color);
      playColorSound(color);
      setShowingIndex(i);

      await new Promise(resolve => {
        const t = setTimeout(resolve, speed);
        timeoutsRef.current.push(t);
      });
      setActiveButton(null);
    }

    await new Promise(resolve => {
      const t = setTimeout(resolve, 300);
      timeoutsRef.current.push(t);
    });
    setGameState('waiting');
  }, [difficulty, playColorSound]);

  // إضافة لون جديد واستدعاء العرض مباشرة لحل مشكلة الـ Race Condition
  const nextRound = useCallback((currentSequence: Color[]) => {
    const randomColor = COLORS[Math.floor(Math.random() * 4)].id;
    const newSequence = [...currentSequence, randomColor];
    setSequence(newSequence);
    
    const t = setTimeout(() => {
      showSequence(newSequence);
    }, 800);
    timeoutsRef.current.push(t);
  }, [showSequence]);

  // بدء اللعبة
  const startGame = useCallback(() => {
    clearAllTimeouts();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setPlayerSequence([]);
    setScore(0);
    setMistakes(0);
    setGameState('playing');
    playSound('click');
    
    nextRound([]);
  }, [nextRound]);

  // إنهاء اللعبة وحفظ النتيجة بشكل آمن
  const endGame = useCallback((finalScore: number) => {
    clearAllTimeouts();
    setGameState('gameover');
    
    const key = `simon_highscore_${difficulty}`;
    const currentHigh = parseInt(localStorage.getItem(key) || '0');
    if (finalScore > currentHigh) {
      localStorage.setItem(key, finalScore.toString());
      setHighScore(finalScore);
    }

    playSound('achievement');
  }, [difficulty]);

  // معالجة ضغط اللاعب على زر
  const handleButtonClick = useCallback((color: Color) => {
    if (gameState !== 'waiting') return;

    playColorSound(color);
    setActiveButton(color);
    
    const clickTimeout = setTimeout(() => setActiveButton(null), 200);
    timeoutsRef.current.push(clickTimeout);

    const newPlayerSequence = [...playerSequence, color];
    setPlayerSequence(newPlayerSequence);

    const currentIndex = newPlayerSequence.length - 1;
    
    // التحقق من الخطأ
    if (newPlayerSequence[currentIndex] !== sequence[currentIndex]) {
      playSound('wrong');
      const updatedMistakes = mistakes + 1;
      setMistakes(updatedMistakes);

      if (isStrict || updatedMistakes >= 3) {
        endGame(score);
      } else {
        setGameState('showing');
        const retryTimeout = setTimeout(() => {
          showSequence(sequence);
        }, 1000);
        timeoutsRef.current.push(retryTimeout);
      }
      return;
    }

    // إذا أكمل اللاعب التسلسل بنجاح
    if (newPlayerSequence.length === sequence.length) {
      const newScore = score + 1;
      setScore(newScore);
      playSound('correct');
      
      nextRound(sequence);
    }
  }, [gameState, playerSequence, sequence, isStrict, mistakes, score, playColorSound, nextRound, showSequence, endGame]);

  // شاشة القائمة
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-center mb-6">🎨 لعبة سايمون</h1>
            
            <div className="text-center mb-8">
              <div className="text-8xl mb-4">🎵</div>
              <p className="text-xl text-gray-600 mb-6">كرر التسلسل اللوني والسمعي!</p>
              
              <div className="bg-purple-50 rounded-xl p-4 mb-6">
                <div className="text-sm text-gray-700 space-y-2">
                  <div>👀 <strong>شاهد</strong> التسلسل ونفذه بدقة</div>
                  <div>🔊 <strong>استمع</strong> للأصوات والنغمات المرافقة</div>
                  <div>🔄 <strong>كرر</strong> نفس الترتيب بدون أخطاء</div>
                  <div>❤️ <strong>فرصك:</strong> لديك 3 محاولات (ما لم تفعل الوضع الصارم)</div>
                </div>
              </div>

              <div className="text-lg font-bold mb-4 text-gray-700">اختر مستوى الصعوبة</div>
              <div className="grid grid-cols-1 gap-3 mb-6">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`p-4 rounded-xl font-bold transition-all ${
                      difficulty === level
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white scale-105 shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-right">
                        <div className="text-lg">{DIFFICULTY_CONFIG[level].label}</div>
                        <div className="text-sm opacity-80">
                          {level === 'easy' && 'سرعة بطيئة - مناسب للمبتدئين'}
                          {level === 'medium' && 'سرعة متوسطة - تحدي جيد'}
                          {level === 'hard' && 'سرعة عالية - للمحترفين'}
                        </div>
                      </div>
                      <div className="text-3xl">
                        {level === 'easy' && '😊'}
                        {level === 'medium' && '😐'}
                        {level === 'hard' && '😈'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="flex items-center justify-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStrict}
                    onChange={(e) => setIsStrict(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-700 font-bold">الوضع الصارم (خطأ واحد = خسارة فورية 💀)</span>
                </label>
              </div>

              {highScore > 0 && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-6">
                  <div className="text-sm">🏆 أعلى نتيجة لمستوى {DIFFICULTY_CONFIG[difficulty].label}</div>
                  <div className="text-2xl font-bold">{highScore} نُقطة</div>
                </div>
              )}

              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-xl hover:from-purple-600 hover:to-indigo-700 transition-all transform hover:scale-105"
              >
                🎮 ابدأ اللعبة!
              </button>
            </div>

            <button
              onClick={() => router.push('/games')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              🏠 العودة للألعاب
            </button>
          </div>
        </div>
      </div>
    );
  }

  // شاشة نهاية اللعبة
  if (gameState === 'gameover') {
    const isNewRecord = score >= highScore && score > 0;
    const rating = score >= 20 ? '👑' : score >= 10 ? '🧠' : score >= 5 ? '⭐' : '💪';
    const message = score >= 20 ? 'أسطورة الذاكرة المطلقة!' : score >= 10 ? 'أداء مذهل وتركيز عالي!' : score >= 5 ? 'جيد جداً، واصل التقدم!' : 'بداية جيدة، حاول مرة أخرى!';

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center">
              <div className="text-8xl mb-4 animate-bounce">{rating}</div>
              <h2 className="text-3xl font-bold mb-2">{message}</h2>
              
              {isNewRecord && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-4 animate-pulse font-bold">
                  🎊 تحطيم الرقم القياسي السابق! 🎊
                </div>
              )}

              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl p-6 mb-6">
                <div className="text-6xl font-bold text-purple-600 mb-2">{score}</div>
                <div className="text-gray-600 font-medium">نقطة تم إحرازها</div>
                <div className="text-sm text-gray-500 mt-2">إجمالي الأخطاء: {mistakes}/3</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={startGame}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-teal-700 transition-all shadow-md"
                >
                  🔄 العب مجدداً
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  📋 شاشة التحكم بالصعوبة
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h1 className="text-3xl font-bold text-center mb-4">🎵 لعبة سايمون</h1>

          {/* شريط المعلومات */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-purple-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{score}</div>
              <div className="text-xs text-gray-600">النقاط الحالية</div>
            </div>
            <div className="bg-red-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{mistakes} / 3</div>
              <div className="text-xs text-gray-600">الأخطاء المرتكبة</div>
            </div>
            <div className="bg-blue-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{sequence.length}</div>
              <div className="text-xs text-gray-600">طول السلسلة</div>
            </div>
          </div>

          {/* حالة اللعبة الحالية */}
          <div className="text-center mb-6 h-8">
            {gameState === 'showing' && (
              <div className="text-2xl font-bold text-purple-600 animate-pulse">
                👁️ انتبه وركز في الومضات والنغمات... {showingIndex + 1}
              </div>
            )}
            {gameState === 'waiting' && (
              <div className="text-2xl font-bold text-green-600 animate-bounce">
                🎯 دورك الآن! كرر النمط
              </div>
            )}
          </div>

          {/* لوحة أزرار سايمون الدائرية والتفاعلية */}
          <div className="relative w-80 h-80 mx-auto mb-6">
            <div className="grid grid-cols-2 gap-4 w-full h-full">
              {COLORS.map((colorData) => {
                const isActive = activeButton === colorData.id;
                
                return (
                  <button
                    key={colorData.id}
                    onClick={() => handleButtonClick(colorData.id)}
                    disabled={gameState !== 'waiting'}
                    className={`rounded-3xl transition-all duration-150 transform ${
                      isActive
                        ? `${colorData.activeColor} scale-95 shadow-2xl ring-4 ring-white`
                        : gameState === 'waiting'
                        ? `${colorData.color} hover:scale-105 hover:shadow-xl cursor-pointer active:scale-95`
                        : `${colorData.color} opacity-60 cursor-not-allowed`
                    }`}
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center select-none">
                      <div className="text-5xl mb-2 min-h-[50px]">
                        {isActive && '💡'}
                      </div>
                      <div className="text-white font-bold text-lg drop-shadow-lg">
                        {colorData.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* دائرة التحكم والتوجيه بالمنتصف */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-gray-100">
              <div className="text-3xl select-none">
                {gameState === 'showing' && '👁️'}
                {gameState === 'waiting' && '🎯'}
              </div>
            </div>
          </div>

          {/* مؤشر تقدم اللاعب الذكي */}
          <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex justify-between text-sm text-gray-600 mb-2 font-bold">
              <span>خطواتك الصحيحة بالترتيب:</span>
              <span>{playerSequence.length} من {sequence.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${sequence.length > 0 ? (playerSequence.length / sequence.length) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* زر الاستسلام الفوري والإنهاء */}
          <button
            onClick={() => endGame(score)}
            className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-200"
          >
            ⏹️ إنهاء اللعبة الحالية والاستسلام
          </button>
        </div>
      </div>
    </div>
  );
}