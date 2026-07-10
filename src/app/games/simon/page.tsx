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
        if (!data.unlockedGames?.includes('simon')) {
          alert('🔒 يجب فتح شهادة المستوى 4 أولاً!');
          router.push('/games');
        }
      });
  }, [router]);

  // تحميل أعلى نتيجة
  useEffect(() => {
    const saved = localStorage.getItem(`simon_highscore_${difficulty}`);
    if (saved) {
      setHighScore(parseInt(saved));
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

  // إضافة لون جديد للتسلسل
  const addToSequence = useCallback(() => {
    const randomColor = COLORS[Math.floor(Math.random() * 4)].id;
    setSequence(prev => [...prev, randomColor]);
  }, []);

  // عرض التسلسل للاعب
  const showSequence = useCallback(async () => {
    setGameState('showing');
    setPlayerSequence([]);
    setShowingIndex(0);

    const config = DIFFICULTY_CONFIG[difficulty];
    const speed = Math.max(200, config.initialSpeed - (sequence.length * config.speedDecrement));

    // انتظار قصير قبل البدء
    await new Promise(resolve => setTimeout(resolve, 500));

    for (let i = 0; i < sequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, speed));
      
      const color = sequence[i];
      setActiveButton(color);
      playColorSound(color);
      setShowingIndex(i);

      await new Promise(resolve => setTimeout(resolve, speed));
      setActiveButton(null);
    }

    // إعطاء اللاعب وقتاً للرد
    await new Promise(resolve => setTimeout(resolve, 300));
    setGameState('waiting');
  }, [sequence, difficulty, playColorSound]);

  // بدء اللعبة
  const startGame = useCallback(() => {
    setSequence([]);
    setPlayerSequence([]);
    setScore(0);
    setMistakes(0);
    setGameState('playing');
    playSound('click');
    
    // إضافة أول لون بعد ثانية
    setTimeout(() => {
      addToSequence();
    }, 1000);
  }, [addToSequence]);

  // عرض التسلسل عند إضافته
  useEffect(() => {
    if (gameState === 'playing' && sequence.length > 0 && sequence.length === playerSequence.length + 1) {
      showSequence();
    }
  }, [sequence, gameState, playerSequence.length, showSequence]);

  // معالجة ضغط اللاعب على زر
  const handleButtonClick = useCallback((color: Color) => {
    if (gameState !== 'waiting') return;

    playColorSound(color);
    setActiveButton(color);
    setTimeout(() => setActiveButton(null), 200);

    const newPlayerSequence = [...playerSequence, color];
    setPlayerSequence(newPlayerSequence);

    // التحقق من صحة الحركة
    const currentIndex = newPlayerSequence.length - 1;
    if (newPlayerSequence[currentIndex] !== sequence[currentIndex]) {
      // خطأ!
      playSound('wrong');
      setMistakes(m => m + 1);

      if (isStrict) {
        // وضع صارم: خسارة فورية
        setGameState('gameover');
      } else {
        // إعادة عرض التسلسل
        setTimeout(() => {
          setPlayerSequence([]);
          showSequence();
        }, 1000);
      }
      return;
    }

    // التسلسل كامل صحيح
    if (newPlayerSequence.length === sequence.length) {
      setScore(s => s + 1);
      playSound('correct');
      
      // إضافة لون جديد
      setTimeout(() => {
        addToSequence();
      }, 1000);
    }
  }, [gameState, playerSequence, sequence, isStrict, playColorSound, showSequence, addToSequence]);

  // إنهاء اللعبة
  const endGame = useCallback(() => {
    setGameState('gameover');
    
    // حفظ أعلى نتيجة
    const key = `simon_highscore_${difficulty}`;
    const currentHigh = parseInt(localStorage.getItem(key) || '0');
    if (score > currentHigh) {
      localStorage.setItem(key, score.toString());
      setHighScore(score);
    }

    playSound('achievement');
  }, [score, difficulty]);

  // التحقق من إنهاء اللعبة
  useEffect(() => {
    if (mistakes >= 3 && !isStrict) {
      endGame();
    }
  }, [mistakes, isStrict, endGame]);

  // شاشة القائمة
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-center mb-6"> لعبة سايمون</h1>
            
            <div className="text-center mb-8">
              <div className="text-8xl mb-4">🎨</div>
              <p className="text-xl text-gray-600 mb-6">كرر التسلسل اللوني والسمعي!</p>
              
              <div className="bg-purple-50 rounded-xl p-4 mb-6">
                <div className="text-sm text-gray-700 space-y-2">
                  <div>️ <strong>شاهد</strong> التسلسل</div>
                  <div> <strong>استمع</strong> للأصوات</div>
                  <div> <strong>كرر</strong> نفس التسلسل</div>
                  <div> <strong>استمر</strong> حتى الخطأ الثالث</div>
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
                  <span className="text-gray-700 font-bold">الوضع الصارم (خطأ واحد = خسارة)</span>
                </label>
              </div>

              {highScore > 0 && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-6">
                  <div className="text-sm"> أعلى نتيجة</div>
                  <div className="text-2xl font-bold">{highScore}</div>
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
    const rating = score >= 20 ? '' : score >= 10 ? '' : score >= 5 ? '' : '💪';
    const message = score >= 20 ? 'أسطورة الذاكرة!' : score >= 10 ? 'أداء رائع!' : score >= 5 ? 'جيد جداً!' : 'حاول مرة أخرى!';

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center">
              <div className="text-8xl mb-4 animate-bounce">{rating}</div>
              <h2 className="text-3xl font-bold mb-2">{message}</h2>
              
              {isNewRecord && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-4 animate-pulse">
                  🎊 رقم قياسي جديد! 
                </div>
              )}

              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl p-6 mb-6">
                <div className="text-6xl font-bold text-purple-600 mb-2">{score}</div>
                <div className="text-gray-600">نقطة</div>
                <div className="text-sm text-gray-500 mt-2">الأخطاء: {mistakes}/3</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={startGame}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-teal-700 transition-all"
                >
                  🔄 العب مرة أخرى
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  📋 القائمة
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
              <div className="text-xs text-gray-600">النقاط</div>
            </div>
            <div className="bg-red-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{mistakes}</div>
              <div className="text-xs text-gray-600">الأخطاء</div>
            </div>
            <div className="bg-blue-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{sequence.length}</div>
              <div className="text-xs text-gray-600">الطول</div>
            </div>
          </div>

          {/* حالة اللعبة */}
          <div className="text-center mb-6">
            {gameState === 'showing' && (
              <div className="text-2xl font-bold text-purple-600 animate-pulse">
                👁️ انتبه للتسلسل...
              </div>
            )}
            {gameState === 'waiting' && (
              <div className="text-2xl font-bold text-green-600">
                🎯 دورك! كرر التسلسل
              </div>
            )}
          </div>

          {/* لوحة الألوان */}
          <div className="relative w-80 h-80 mx-auto mb-6">
            <div className="grid grid-cols-2 gap-4 w-full h-full">
              {COLORS.map((colorData) => {
                const isActive = activeButton === colorData.id;
                
                return (
                  <button
                    key={colorData.id}
                    onClick={() => handleButtonClick(colorData.id)}
                    disabled={gameState !== 'waiting'}
                    className={`rounded-3xl transition-all transform ${
                      isActive
                        ? `${colorData.activeColor} scale-95 shadow-2xl`
                        : gameState === 'waiting'
                        ? `${colorData.color} hover:scale-105 hover:shadow-xl cursor-pointer`
                        : `${colorData.color} opacity-70`
                    }`}
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="text-5xl mb-2">
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

            {/* دائرة الوسط */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center">
              <div className="text-3xl">
                {gameState === 'showing' && '👁️'}
                {gameState === 'waiting' && ''}
              </div>
            </div>
          </div>

          {/* مؤشر التقدم */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>التسلسل الحالي:</span>
              <span>{playerSequence.length} / {sequence.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all"
                style={{ width: `${(playerSequence.length / sequence.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* زر الإنهاء */}
          <button
            onClick={endGame}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
          >
            ⏹️ إنهاء اللعبة
          </button>
        </div>
      </div>
    </div>
  );
}