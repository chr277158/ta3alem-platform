'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type Difficulty = 'easy' | 'medium' | 'hard';
type Direction = 'up' | 'down' | 'left' | 'right';

const DIFFICULTY_CONFIG: Record<Difficulty, { speed: number; emoji: string; label: string; color: string }> = {
  easy: { speed: 180, emoji: '😊', label: 'سهل', color: 'bg-green-500' },
  medium: { speed: 130, emoji: '😐', label: 'متوسط', color: 'bg-yellow-500' },
  hard: { speed: 90, emoji: '😈', label: 'صعب', color: 'bg-red-500' },
};

const SOUND_KEY = 'game-sound-muted';
const DIFFICULTY_KEY = 'snake-difficulty';

export default function SnakeGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [muted, setMuted] = useState(false);
  const [checking, setChecking] = useState(true);

  const GRID_SIZE = 20;
  const CELL_SIZE = 20;
  const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

  // اتجاه الثعبان يعيش في ref حتى يقدر كل من لوحة المفاتيح وأزرار اللمس والسحب يغيّرونه
  // بدون التسبب بمشكلة "الانعطاف المزدوج" داخل نفس الجولة
  const directionRef = useRef({ dx: 1, dy: 0, nextDx: 1, nextDy: 0 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const playSafe = useCallback((name: Parameters<typeof playSound>[0]) => {
    if (!muted) playSound(name);
  }, [muted]);

  // تغيير الاتجاه بشكل آمن: يمنع الانعطاف المباشر 180 درجة
  const handleDirection = useCallback((dir: Direction) => {
    const d = directionRef.current;
    if (dir === 'up' && d.dy === 0) { d.nextDx = 0; d.nextDy = -1; }
    if (dir === 'down' && d.dy === 0) { d.nextDx = 0; d.nextDy = 1; }
    if (dir === 'left' && d.dx === 0) { d.nextDx = -1; d.nextDy = 0; }
    if (dir === 'right' && d.dx === 0) { d.nextDx = 1; d.nextDy = 0; }
  }, []);

  // تحميل تفضيلات الصوت وآخر صعوبة مختارة
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

  // تحميل أعلى نتيجة لكل مستوى صعوبة
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`snake_highscore_${difficulty}`);
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
        if (!data.unlockedGames?.includes('snake')) {
          alert('🔒 يجب فتح شهادة المستوى 2 أولاً!');
          router.push('/games');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let snake = [{ x: 10, y: 10 }];
    let food = { x: 15, y: 15 };

    const generateFood = () => {
      let newFood: { x: number; y: number };
      do {
        newFood = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
      } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
      food = newFood;
    };

    const draw = () => {
      // خلفية
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // الطعام
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);

      // الثعبان
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#4ecdc4' : '#45b7aa';
        ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);
      });
    };

    const endRound = () => {
      setGameOver(true);
      try {
        const key = `snake_highscore_${difficulty}`;
        const currentHigh = parseInt(localStorage.getItem(key) || '0', 10);
        if (score > currentHigh) {
          localStorage.setItem(key, score.toString());
          setHighScore(score);
          setIsNewRecord(true);
          playSafe('achievement');
        } else {
          setIsNewRecord(false);
          playSafe('wrong');
        }
      } catch {
        playSafe('wrong');
      }
    };

    const move = () => {
      // تثبيت الاتجاه القادم مرة واحدة فقط لكل جولة تحريك
      directionRef.current.dx = directionRef.current.nextDx;
      directionRef.current.dy = directionRef.current.nextDy;
      const { dx, dy } = directionRef.current;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // التحقق من الاصطدام بالجدران
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        endRound();
        return;
      }

      // التحقق من الاصطدام بالجسم
      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endRound();
        return;
      }

      snake.unshift(head);

      // التحقق من أكل الطعام
      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 10);
        playSafe('correct');
        generateFood();
      } else {
        snake.pop();
      }

      draw();
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleDirection(dir);
      }
    };

    draw();
    window.addEventListener('keydown', handleKeyPress);
    const interval = setInterval(move, DIFFICULTY_CONFIG[difficulty].speed);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver, difficulty, handleDirection, playSafe]);

  const startGame = () => {
    directionRef.current = { dx: 1, dy: 0, nextDx: 1, nextDy: 0 };
    setScore(0);
    setGameOver(false);
    setIsNewRecord(false);
    setIsPlaying(true);
    setShowStartScreen(false);
    playSafe('click');
  };

  const selectDifficulty = (level: Difficulty) => {
    setDifficulty(level);
    try {
      localStorage.setItem(DIFFICULTY_KEY, level);
    } catch {
      // تجاهل
    }
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

  // التحكم باللمس (سحب على اللوحة)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const threshold = 20;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      handleDirection(dx > 0 ? 'right' : 'left');
    } else {
      handleDirection(dy > 0 ? 'down' : 'up');
    }
    touchStartRef.current = null;
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" dir="rtl">
        <div className="text-2xl font-bold text-gray-500 animate-pulse">⏳ جارٍ التحميل...</div>
      </div>
    );
  }

  if (showStartScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-center gap-3 mb-6 relative">
              <h1 className="text-4xl font-bold text-center">🐍 لعبة الثعبان</h1>
              <button
                onClick={toggleMute}
                aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
                className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </div>

            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🐍</div>
              <p className="text-xl text-gray-600 mb-6">وجّه الثعبان لأكل الطعام دون أن يصطدم بنفسه أو بالجدار!</p>

              <div className="text-lg font-bold mb-4 text-gray-700">اختر مستوى الصعوبة</div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(level => (
                  <button
                    key={level}
                    onClick={() => selectDifficulty(level)}
                    aria-pressed={difficulty === level}
                    className={`p-4 rounded-xl font-bold transition-all ${
                      difficulty === level
                        ? `${DIFFICULTY_CONFIG[level].color} text-white scale-105 shadow-lg`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
                  >
                    <div className="text-3xl mb-2">{DIFFICULTY_CONFIG[level].emoji}</div>
                    <div>{DIFFICULTY_CONFIG[level].label}</div>
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
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-xl font-bold text-xl hover:from-green-600 hover:to-teal-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                🎮 ابدأ اللعبة
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-center gap-3 mb-6 relative">
            <h1 className="text-4xl font-bold text-center">🐍 لعبة الثعبان</h1>
            <button
              onClick={toggleMute}
              aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
              className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-2xl font-bold text-blue-600">النقاط: {score}</div>
            <span className={`${DIFFICULTY_CONFIG[difficulty].color} text-white px-3 py-1 rounded-full text-sm font-bold`}>
              {DIFFICULTY_CONFIG[difficulty].emoji} {DIFFICULTY_CONFIG[difficulty].label}
            </span>
          </div>

          <div
            className="flex justify-center mb-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="border-4 border-purple-500 rounded-lg touch-none"
              style={{ width: '100%', maxWidth: CANVAS_SIZE, height: 'auto' }}
            />
          </div>

          {isPlaying && !gameOver && (
            <>
              <div className="text-center text-gray-600 mb-4">
                استخدم أسهم لوحة المفاتيح، أو اسحب على اللوحة، أو استخدم الأزرار بالأسفل
              </div>

              {/* أزرار التحكم للجوال */}
              <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto mb-6">
                <div />
                <button
                  onClick={() => handleDirection('up')}
                  aria-label="أعلى"
                  className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  ⬆️
                </button>
                <div />
                <button
                  onClick={() => handleDirection('left')}
                  aria-label="يسار"
                  className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  ⬅️
                </button>
                <button
                  onClick={() => handleDirection('down')}
                  aria-label="أسفل"
                  className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  ⬇️
                </button>
                <button
                  onClick={() => handleDirection('right')}
                  aria-label="يمين"
                  className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  ➡️
                </button>
              </div>
            </>
          )}

          {gameOver && (
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">انتهت اللعبة!</div>
              {isNewRecord && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-4 animate-pulse">
                  🎊 رقم قياسي جديد! 🎊
                </div>
              )}
              <div className="text-2xl mb-6">النقاط النهائية: {score}</div>
              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                🔄 العب مرة أخرى
              </button>
              <button
                onClick={() => router.push('/games')}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                🏠 العودة للألعاب
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}