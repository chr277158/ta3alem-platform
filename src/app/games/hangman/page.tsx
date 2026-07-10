'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type Difficulty = 'easy' | 'medium' | 'hard';
type GameStatus = 'playing' | 'won' | 'lost';

interface Word {
  word: string;
  hint: string;
  category: string;
}

const WORDS: Record<Difficulty, Word[]> = {
  easy: [
    { word: 'قلم', hint: 'نكتب به', category: 'أدوات' },
    { word: 'كتاب', hint: 'نقرأ فيه', category: 'أدوات' },
    { word: 'شمس', hint: 'تضيء النهار', category: 'طبيعة' },
    { word: 'قمر', hint: 'يضيء الليل', category: 'طبيعة' },
    { word: 'بيت', hint: 'نعيش فيه', category: 'أماكن' },
    { word: 'مدرسة', hint: 'نتعلم فيها', category: 'أماكن' },
    { word: 'تفاح', hint: 'فاكهة حمراء', category: 'طعام' },
    { word: 'ماء', hint: 'نشربه', category: 'طعام' },
    { word: 'كلب', hint: 'حيوان أليف', category: 'حيوانات' },
    { word: 'قطة', hint: 'مواء', category: 'حيوانات' },
    { word: 'سمك', hint: 'يعيش في الماء', category: 'حيوانات' },
    { word: 'طائر', hint: 'يطير في السماء', category: 'حيوانات' }
  ],
  medium: [
    { word: 'حاسوب', hint: 'جهاز إلكتروني', category: 'تكنولوجيا' },
    { word: 'هاتف', hint: 'نتصل به', category: 'تكنولوجيا' },
    { word: 'سيارة', hint: 'وسيلة نقل', category: 'مركبات' },
    { word: 'طائرة', hint: 'تطير في الجو', category: 'مركبات' },
    { word: 'مستشفى', hint: 'نعالج فيه', category: 'أماكن' },
    { word: 'مكتبة', hint: 'فيها كتب كثيرة', category: 'أماكن' },
    { word: 'برتقال', hint: 'فاكهة برتقالية', category: 'طعام' },
    { word: 'موز', hint: 'فاكهة صفراء', category: 'طعام' },
    { word: 'فيل', hint: 'حيوان كبير', category: 'حيوانات' },
    { word: 'زرافة', hint: 'عنقها طويل', category: 'حيوانات' },
    { word: 'أسد', hint: 'ملك الغابة', category: 'حيوانات' },
    { word: 'نمر', hint: 'مخطط', category: 'حيوانات' }
  ],
  hard: [
    { word: 'كمبيوتر', hint: 'جهاز حاسوب', category: 'تكنولوجيا' },
    { word: 'انترنت', hint: 'شبكة عالمية', category: 'تكنولوجيا' },
    { word: 'دراجة', hint: 'ذات عجلتين', category: 'مركبات' },
    { word: 'قطار', hint: 'يسير على سكك', category: 'مركبات' },
    { word: 'مطار', hint: 'تقلع منه الطائرات', category: 'أماكن' },
    { word: 'مطعم', hint: 'نأكل فيه', category: 'أماكن' },
    { word: 'فراولة', hint: 'فاكهة حمراء صغيرة', category: 'طعام' },
    { word: 'بطيخ', hint: 'فاكهة صيفية كبيرة', category: 'طعام' },
    { word: 'دلفين', hint: 'ثديي بحري ذكي', category: 'حيوانات' },
    { word: 'نسر', hint: 'طائر جارح', category: 'حيوانات' },
    { word: 'تمساح', hint: 'زاحف مائي', category: 'حيوانات' },
    { word: 'فراشة', hint: 'حشرة ملونة', category: 'حيوانات' }
  ]
};

const DIFFICULTY_CONFIG = {
  easy: { label: '😊 سهل', maxAttempts: 10, description: 'كلمات قصيرة وبسيطة' },
  medium: { label: '😐 متوسط', maxAttempts: 8, description: 'كلمات متوسطة الطول' },
  hard: { label: '😈 صعب', maxAttempts: 6, description: 'كلمات طويلة وصعبة' }
};

const ARABIC_LETTERS = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
  'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
  'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ة', 'ء',
  'أ', 'إ', 'آ', 'ؤ', 'ئ', 'ى'
];

export default function HangmanGame() {
  const router = useRouter();
  const [gameStatus, setGameStatus] = useState<'menu' | GameStatus>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [wordsWon, setWordsWon] = useState(0);
  const [wordsLost, setWordsLost] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

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
        if (!data.unlockedGames?.includes('hangman')) {
          alert('🔒 يجب فتح شهادة المستوى 4 أولاً!');
          router.push('/games');
        }
      });
  }, [router]);

  // تحميل أعلى نتيجة
  useEffect(() => {
    const saved = localStorage.getItem(`hangman_highscore_${difficulty}`);
    if (saved) setHighScore(parseInt(saved));
  }, [difficulty]);

  // المؤقت
  useEffect(() => {
    if (!isTimerActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsTimerActive(false);
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  // اختيار كلمة عشوائية
  const getRandomWord = useCallback((): Word => {
    const words = WORDS[difficulty];
    return words[Math.floor(Math.random() * words.length)];
  }, [difficulty]);

  // بدء اللعبة
  const startGame = useCallback(() => {
    const word = getRandomWord();
    setCurrentWord(word);
    setGuessedLetters(new Set());
    setWrongAttempts(0);
    setGameStatus('playing');
    setShowHint(false);
    setHintUsed(false);
    setTimeLeft(60);
    setIsTimerActive(true);
    playSound('click');
  }, [getRandomWord]);

  // كلمة جديدة
  const nextWord = useCallback(() => {
    const word = getRandomWord();
    setCurrentWord(word);
    setGuessedLetters(new Set());
    setWrongAttempts(0);
    setGameStatus('playing');
    setShowHint(false);
    setHintUsed(false);
    setTimeLeft(60);
    setIsTimerActive(true);
    playSound('click');
  }, [getRandomWord]);

  // التحقق من الحرف
  const isLetterInWord = (letter: string): boolean => {
    if (!currentWord) return false;
    return currentWord.word.includes(letter);
  };

  // التحقق من اكتمال الكلمة
  const isWordComplete = (): boolean => {
    if (!currentWord) return false;
    return currentWord.word.split('').every(letter => guessedLetters.has(letter));
  };

  // معالجة الضغط على حرف
  const handleLetterClick = (letter: string) => {
    if (gameStatus !== 'playing' || guessedLetters.has(letter)) return;

    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);

    if (isLetterInWord(letter)) {
      playSound('correct');
      
      // التحقق من اكتمال الكلمة
      if (currentWord!.word.split('').every(l => newGuessed.has(l))) {
        const pointsEarned = hintUsed ? 5 : 10;
        const timeBonus = Math.floor(timeLeft / 10);
        const totalPoints = pointsEarned + timeBonus;
        
        setScore(s => s + totalPoints);
        setStreak(s => s + 1);
        setWordsWon(w => w + 1);
        setGameStatus('won');
        setIsTimerActive(false);
        playSound('achievement');
      }
    } else {
      playSound('wrong');
      const newWrong = wrongAttempts + 1;
      setWrongAttempts(newWrong);
      setStreak(0);
      
      if (newWrong >= DIFFICULTY_CONFIG[difficulty].maxAttempts) {
        setGameStatus('lost');
        setWordsLost(l => l + 1);
        setIsTimerActive(false);
      }
    }
  };

  // إنهاء اللعبة
  const handleGameOver = () => {
    setGameStatus('lost');
    setWordsLost(l => l + 1);
    setStreak(0);
    
    // حفظ أعلى نتيجة
    const key = `hangman_highscore_${difficulty}`;
    const currentHigh = parseInt(localStorage.getItem(key) || '0');
    if (score > currentHigh) {
      localStorage.setItem(key, score.toString());
      setHighScore(score);
    }
  };

  // إعادة تعيين كل شيء
  const resetAll = () => {
    setScore(0);
    setStreak(0);
    setWordsWon(0);
    setWordsLost(0);
    setGameStatus('menu');
  };

  // رسم الرجل المشنوق (SVG)
  const renderHangman = () => {
    const maxAttempts = DIFFICULTY_CONFIG[difficulty].maxAttempts;
    const progress = wrongAttempts / maxAttempts;

    return (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* القاعدة */}
        <line x1="20" y1="180" x2="180" y2="180" stroke="#8B4513" strokeWidth="4" />
        <line x1="40" y1="180" x2="40" y2="20" stroke="#8B4513" strokeWidth="4" />
        <line x1="40" y1="20" x2="120" y2="20" stroke="#8B4513" strokeWidth="4" />
        <line x1="120" y1="20" x2="120" y2="40" stroke="#8B4513" strokeWidth="4" />

        {/* الرأس */}
        {progress >= 0.17 && (
          <circle cx="120" cy="55" r="15" fill="none" stroke="#333" strokeWidth="3" />
        )}
        {/* الوجه */}
        {progress >= 0.17 && (
          <>
            <circle cx="115" cy="52" r="2" fill="#333" />
            <circle cx="125" cy="52" r="2" fill="#333" />
            {progress >= 0.83 ? (
              <path d="M 113 60 Q 120 55 127 60" stroke="#333" strokeWidth="2" fill="none" />
            ) : (
              <path d="M 113 58 Q 120 63 127 58" stroke="#333" strokeWidth="2" fill="none" />
            )}
          </>
        )}

        {/* الجسم */}
        {progress >= 0.34 && (
          <line x1="120" y1="70" x2="120" y2="120" stroke="#333" strokeWidth="3" />
        )}

        {/* الذراع اليسرى */}
        {progress >= 0.50 && (
          <line x1="120" y1="80" x2="90" y2="100" stroke="#333" strokeWidth="3" />
        )}

        {/* الذراع اليمنى */}
        {progress >= 0.67 && (
          <line x1="120" y1="80" x2="150" y2="100" stroke="#333" strokeWidth="3" />
        )}

        {/* الرجل اليسرى */}
        {progress >= 0.83 && (
          <line x1="120" y1="120" x2="95" y2="150" stroke="#333" strokeWidth="3" />
        )}

        {/* الرجل اليمنى */}
        {progress >= 1.0 && (
          <line x1="120" y1="120" x2="145" y2="150" stroke="#333" strokeWidth="3" />
        )}
      </svg>
    );
  };

  // شاشة القائمة
  if (gameStatus === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-center mb-6">📝 تخمين الكلمة</h1>
            
            <div className="text-center mb-8">
              <div className="text-8xl mb-4">🎯</div>
              <p className="text-xl text-gray-600 mb-6">خمّن الكلمة حرفاً بحرف!</p>
              
              <div className="bg-pink-50 rounded-xl p-4 mb-6">
                <div className="text-sm text-gray-700 space-y-2">
                  <div>🔤 <strong>اختر حرفاً</strong> من لوحة المفاتيح</div>
                  <div>💡 <strong>استخدم التلميح</strong> إذا احتجت مساعدة</div>
                  <div>⏱️ <strong>أسرع</strong> للحصول على نقاط إضافية</div>
                  <div>❌ <strong>احذر</strong> من الأخطاء الكثيرة!</div>
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
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white scale-105 shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-right">
                        <div className="text-lg">{DIFFICULTY_CONFIG[level].label}</div>
                        <div className="text-sm opacity-80">{DIFFICULTY_CONFIG[level].description}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {DIFFICULTY_CONFIG[level].maxAttempts} محاولات خاطئة مسموحة
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

              {highScore > 0 && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-6">
                  <div className="text-sm">🏆 أعلى نتيجة</div>
                  <div className="text-2xl font-bold">{highScore}</div>
                </div>
              )}

              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-4 rounded-xl font-bold text-xl hover:from-pink-600 hover:to-rose-700 transition-all transform hover:scale-105"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h1 className="text-3xl font-bold text-center mb-4"> تخمين الكلمة</h1>

          {/* شريط المعلومات */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-pink-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-pink-600">{score}</div>
              <div className="text-xs text-gray-600">النقاط</div>
            </div>
            <div className="bg-purple-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">🔥{streak}</div>
              <div className="text-xs text-gray-600">متتالية</div>
            </div>
            <div className={`rounded-xl p-3 text-center text-white ${
              timeLeft <= 10 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
            }`}>
              <div className="text-2xl font-bold">{timeLeft}</div>
              <div className="text-xs">ثانية</div>
            </div>
            <div className="bg-orange-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {wrongAttempts}/{DIFFICULTY_CONFIG[difficulty].maxAttempts}
              </div>
              <div className="text-xs text-gray-600">أخطاء</div>
            </div>
          </div>

          {/* مستوى الصعوبة والفئة */}
          <div className="flex justify-between items-center mb-6">
            <span className="bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-bold">
              {DIFFICULTY_CONFIG[difficulty].label}
            </span>
            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-bold">
              {currentWord?.category}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* رسم الرجل المشنوق */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="w-full h-64">
                {renderHangman()}
              </div>
            </div>

            {/* الكلمة والتلميح */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-center mb-4">
                  <div className="text-sm text-gray-600 mb-2">خمّن الكلمة:</div>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {currentWord?.word.split('').map((letter, index) => {
                      const isGuessed = guessedLetters.has(letter);
                      const isRevealed = gameStatus === 'lost';
                      
                      return (
                        <div
                          key={index}
                          className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                            isGuessed
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : isRevealed
                              ? 'bg-red-100 border-red-500 text-red-700'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          {isGuessed || isRevealed ? letter : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* التلميح */}
                <div className="bg-yellow-50 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      {showHint ? (
                        <span>💡 <strong>التلميح:</strong> {currentWord?.hint}</span>
                      ) : (
                        <span className="text-gray-500">اضغط لرؤية التلميح (-5 نقاط)</span>
                      )}
                    </div>
                    {!showHint && gameStatus === 'playing' && (
                      <button
                        onClick={() => {
                          setShowHint(true);
                          setHintUsed(true);
                          setScore(s => Math.max(0, s - 5));
                          playSound('click');
                        }}
                        className="bg-yellow-400 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-yellow-500 transition-all"
                      >
                        إظهار
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* إحصائيات */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{wordsWon}</div>
                  <div className="text-xs text-gray-600">كلمات صحيحة</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-red-600">{wordsLost}</div>
                  <div className="text-xs text-gray-600">كلمات خاطئة</div>
                </div>
              </div>
            </div>
          </div>

          {/* لوحة المفاتيح */}
          {gameStatus === 'playing' && (
            <div className="mb-6">
              <div className="grid grid-cols-6 md:grid-cols-9 gap-2">
                {ARABIC_LETTERS.map(letter => {
                  const isGuessed = guessedLetters.has(letter);
                  const isCorrect = isGuessed && currentWord?.word.includes(letter);
                  const isWrong = isGuessed && !currentWord?.word.includes(letter);

                  return (
                    <button
                      key={letter}
                      onClick={() => handleLetterClick(letter)}
                      disabled={isGuessed}
                      className={`aspect-square rounded-lg font-bold text-lg transition-all transform ${
                        isCorrect
                          ? 'bg-green-500 text-white scale-95'
                          : isWrong
                          ? 'bg-red-500 text-white scale-95 opacity-50'
                          : 'bg-gradient-to-br from-pink-400 to-rose-500 text-white hover:scale-105 hover:shadow-lg'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* نتيجة الفوز */}
          {gameStatus === 'won' && (
            <div className="bg-gradient-to-r from-green-400 to-teal-500 text-white rounded-2xl p-6 mb-6 text-center animate-bounce">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-2xl font-bold mb-2">أحسنت! خمّنت الكلمة!</div>
              <div className="text-lg">
                الكلمة: <strong>{currentWord?.word}</strong>
              </div>
            </div>
          )}

          {/* نتيجة الخسارة */}
          {gameStatus === 'lost' && (
            <div className="bg-gradient-to-r from-red-400 to-orange-500 text-white rounded-2xl p-6 mb-6 text-center">
              <div className="text-4xl mb-2">😢</div>
              <div className="text-2xl font-bold mb-2">انتهت اللعبة!</div>
              <div className="text-lg">
                الكلمة كانت: <strong>{currentWord?.word}</strong>
              </div>
            </div>
          )}

          {/* الأزرار */}
          <div className="flex gap-3">
            {gameStatus === 'won' && (
              <button
                onClick={nextWord}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-teal-700 transition-all"
              >
                ➡️ كلمة جديدة
              </button>
            )}
            {gameStatus === 'lost' && (
              <button
                onClick={startGame}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                🔄 العب مرة أخرى
              </button>
            )}
            <button
              onClick={resetAll}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              📋 القائمة
            </button>
            <button
              onClick={() => router.push('/games')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              🏠 العودة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}