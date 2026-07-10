'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type Choice = 'rock' | 'paper' | 'scissors';
type Result = 'win' | 'lose' | 'draw' | null;
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameStats {
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  bestStreak: number;
}

// 1. إصلاح إيموجي الورقة الفارغ
const CHOICES: { id: Choice; emoji: string; name: string; color: string }[] = [
  { id: 'rock', emoji: '🪨', name: 'حجر', color: 'from-gray-400 to-gray-600' },
  { id: 'paper', emoji: '📄', name: 'ورقة', color: 'from-blue-400 to-blue-600' },
  { id: 'scissors', emoji: '✂️', name: 'مقص', color: 'from-red-400 to-red-600' }
];

const DIFFICULTY_CONFIG = {
  easy: { label: '😊 سهل', description: 'الكمبيوتر يختار عشوائياً' },
  medium: { label: '😐 متوسط', description: 'الكمبيوتر يحاول الفوز' },
  hard: { label: '😈 صعب', description: 'الكمبيوتر يتعلم من اختياراتك' }
};

export default function RPSGame() {
  const router = useRouter();
  const animationRef = useRef<NodeJS.Timeout | null>(null); // لمنع تسريب الذاكرة

  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [round, setRound] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerHistory, setPlayerHistory] = useState<Choice[]>([]);
  
  const [stats, setStats] = useState<GameStats>({
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0
  });

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
        if (!data.unlockedGames?.includes('rps')) {
          alert('🔒 يجب فتح شهادة المستوى 3 أولاً!');
          router.push('/games');
        }
      })
      .catch(err => console.error("Error fetching badges:", err));

    // تنظيف التايمر عند الخروج من الصفحة
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [router]);

  // تحميل الإحصائيات عند تغيير مستوى الصعوبة
  useEffect(() => {
    const saved = localStorage.getItem(`rps_stats_${difficulty}`);
    if (saved) {
      setStats(JSON.parse(saved));
    } else {
      setStats({ wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0 });
    }
  }, [difficulty]);

  // دالة الحفظ المحدثة لحل مشكلة الـ Async State
  const saveStatsToStorage = (updatedStats: GameStats) => {
    localStorage.setItem(`rps_stats_${difficulty}`, JSON.stringify(updatedStats));
  };

  const getWinningChoice = (opponentChoice: Choice): Choice => {
    if (opponentChoice === 'rock') return 'paper';
    if (opponentChoice === 'paper') return 'scissors';
    return 'rock';
  };

  const getComputerChoice = (currentHistory: Choice[]): Choice => {
    const choices: Choice[] = ['rock', 'paper', 'scissors'];
    
    if (difficulty === 'easy') {
      return choices[Math.floor(Math.random() * 3)];
    }
    
    if (difficulty === 'medium') {
      if (Math.random() < 0.5 || currentHistory.length === 0) {
        return choices[Math.floor(Math.random() * 3)];
      }
      const lastChoice = currentHistory[currentHistory.length - 1];
      return getWinningChoice(lastChoice);
    }
    
    if (difficulty === 'hard') {
      if (currentHistory.length >= 3) {
        const counts: Record<Choice, number> = { rock: 0, paper: 0, scissors: 0 };
        currentHistory.forEach(c => counts[c]++);
        const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as Choice;
        return getWinningChoice(mostCommon);
      }
      return choices[Math.floor(Math.random() * 3)];
    }
    
    return choices[Math.floor(Math.random() * 3)];
  };

  const getResult = (player: Choice, computer: Choice): Result => {
    if (player === computer) return 'draw';
    if (
      (player === 'rock' && computer === 'scissors') ||
      (player === 'paper' && computer === 'rock') ||
      (player === 'scissors' && computer === 'paper')
    ) {
      return 'win';
    }
    return 'lose';
  };

  const play = (choice: Choice) => {
    if (isAnimating) return;

    setPlayerChoice(choice);
    setComputerChoice(null);
    setResult(null);
    setShowResult(false);
    setIsAnimating(true);
    
    // إبقاء آخر 20 جولة فقط لمنع استهلاك الذاكرة
    const updatedHistory = [...playerHistory, choice].slice(-20);
    setPlayerHistory(updatedHistory);

    playSound('click');

    let animationCount = 0;
    const choices: Choice[] = ['rock', 'paper', 'scissors'];

    animationRef.current = setInterval(() => {
      setComputerChoice(choices[Math.floor(Math.random() * 3)]);
      animationCount++;
      
      if (animationCount >= 10) {
        if (animationRef.current) clearInterval(animationRef.current);
        
        const finalComputerChoice = getComputerChoice(updatedHistory);
        setComputerChoice(finalComputerChoice);
        
        const gameResult = getResult(choice, finalComputerChoice);
        setResult(gameResult);
        
        setTimeout(() => {
          setShowResult(true);
          setIsAnimating(false);
          
          setStats(prev => {
            const newStats = { ...prev };
            if (gameResult === 'win') {
              newStats.wins++;
              newStats.streak++;
              newStats.bestStreak = Math.max(newStats.bestStreak, newStats.streak);
              playSound('correct');
            } else if (gameResult === 'lose') {
              newStats.losses++;
              newStats.streak = 0;
              playSound('wrong');
            } else {
              newStats.draws++;
              playSound('click');
            }
            saveStatsToStorage(newStats);
            return newStats;
          });
          
          setRound(r => r + 1);
        }, 400);
      }
    }, 100);
  };

  const resetGame = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult(null);
    setShowResult(false);
    setRound(1);
    setPlayerHistory([]);
    const clearedStats = { wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0 };
    setStats(clearedStats);
    saveStatsToStorage(clearedStats);
  };

  const getResultMessage = () => {
    if (result === 'win') return '🎉 فزت!';
    if (result === 'lose') return '😢 خسرت!';
    if (result === 'draw') return '🤝 تعادل!';
    return '';
  };

  const getResultColor = () => {
    if (result === 'win') return 'text-green-600';
    if (result === 'lose') return 'text-red-600';
    if (result === 'draw') return 'text-gray-600';
    return '';
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-center mb-6">✂️ حجر ورقة مقص</h1>
            
            <div className="text-center mb-8">
              <div className="text-8xl mb-4">🪨📄✂️</div>
              <p className="text-xl text-gray-600 mb-6">تحدَّ الكمبيوتر في هذه اللعبة الكلاسيكية!</p>
              
              <div className="bg-purple-50 rounded-xl p-4 mb-6">
                <div className="text-sm text-gray-700 space-y-1">
                  <div>🪨 حجر يهزم ✂️ مقص</div>
                  <div>📄 ورقة تهزم 🪨 حجر</div>
                  <div>✂️ مقص يهزم 📄 ورقة</div>
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
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-right">
                        <div className="text-lg">{DIFFICULTY_CONFIG[level].label}</div>
                        <div className="text-sm opacity-80">{DIFFICULTY_CONFIG[level].description}</div>
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

              <button
                onClick={() => setGameStarted(true)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-xl font-bold text-xl hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105"
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h1 className="text-3xl font-bold text-center mb-4">✂️ حجر ورقة مقص</h1>

          {/* شريط الإحصائيات */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-green-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.wins}</div>
              <div className="text-xs text-gray-600">فوز</div>
            </div>
            <div className="bg-red-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.losses}</div>
              <div className="text-xs text-gray-600">خسارة</div>
            </div>
            <div className="bg-gray-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.draws}</div>
              <div className="text-xs text-gray-600">تعادل</div>
            </div>
            <div className="bg-purple-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">🔥{stats.streak}</div>
              <div className="text-xs text-gray-600">متتالية</div>
            </div>
          </div>

          {/* الجولة ومستوى الصعوبة */}
          <div className="flex justify-between items-center mb-6">
            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-bold">
              الجولة {round}
            </span>
            <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-bold">
              {DIFFICULTY_CONFIG[difficulty].label}
            </span>
          </div>

          {/* منطقة اللعب */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* اللاعب */}
            <div className="text-center">
              <div className="text-sm font-bold text-gray-600 mb-2">أنت</div>
              <div className={`aspect-square rounded-2xl bg-gradient-to-br ${
                playerChoice 
                  ? CHOICES.find(c => c.id === playerChoice)?.color 
                  : 'from-gray-200 to-gray-300'
              } flex items-center justify-center transition-all ${
                isAnimating ? 'animate-bounce' : ''
              }`}>
                <div className="text-8xl">
                  {playerChoice ? CHOICES.find(c => c.id === playerChoice)?.emoji : '❓'}
                </div>
              </div>
            </div>

            {/* الكمبيوتر */}
            <div className="text-center">
              <div className="text-sm font-bold text-gray-600 mb-2">الكمبيوتر</div>
              <div className={`aspect-square rounded-2xl bg-gradient-to-br ${
                computerChoice 
                  ? CHOICES.find(c => c.id === computerChoice)?.color 
                  : 'from-gray-200 to-gray-300'
              } flex items-center justify-center transition-all ${
                isAnimating ? 'animate-pulse' : ''
              }`}>
                <div className="text-8xl">
                  {computerChoice ? CHOICES.find(c => c.id === computerChoice)?.emoji : '🤖'}
                </div>
              </div>
            </div>
          </div>

          {/* النتيجة */}
          {showResult && (
            <div className={`text-center mb-6 p-4 rounded-2xl ${
              result === 'win' ? 'bg-green-100' : 
              result === 'lose' ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <div className={`text-3xl font-bold ${getResultColor()}`}>
                {getResultMessage()}
              </div>
              {result === 'win' && stats.streak > 1 && (
                <div className="text-lg text-purple-600 mt-2">
                  🔥 سلسلة انتصارات: {stats.streak}
                </div>
              )}
            </div>
          )}

          {/* أزرار الاختيار */}
          {!isAnimating && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {CHOICES.map(choice => (
                <button
                  key={choice.id}
                  onClick={() => play(choice.id)}
                  className={`aspect-square rounded-2xl bg-gradient-to-br ${choice.color} text-white transition-all transform hover:scale-105 hover:shadow-xl active:scale-95`}
                >
                  <div className="text-6xl mb-2">{choice.emoji}</div>
                  <div className="text-sm font-bold">{choice.name}</div>
                </button>
              ))}
            </div>
          )}

          {isAnimating && (
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-purple-600 animate-pulse">
                🎲 الكمبيوتر يختار...
              </div>
            </div>
          )}

          {/* أعلى سلسلة انتصارات */}
          {stats.bestStreak > 0 && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-6 text-center">
              <div className="text-sm">🏆 أعلى سلسلة انتصارات</div>
              <div className="text-2xl font-bold">{stats.bestStreak}</div>
            </div>
          )}

          {/* الأزرار */}
          <div className="flex gap-3">
            <button
              onClick={resetGame}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all"
            >
               إعادة البدء
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