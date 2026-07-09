'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type Difficulty = 'easy' | 'medium' | 'hard';
type Direction = 'up' | 'down' | 'left' | 'right';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}

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
  const [isPaused, setIsPaused] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [muted, setMuted] = useState(false);
  const [checking, setChecking] = useState(true);

  const GRID_SIZE = 20;
  const CELL_SIZE = 20;
  const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

  const directionRef = useRef({ dx: 1, dy: 0, nextDx: 1, nextDy: 0 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const foodPulseRef = useRef(0);

  const playSafe = useCallback((name: Parameters<typeof playSound>[0]) => {
    if (!muted) playSound(name);
  }, [muted]);

  const handleDirection = useCallback((dir: Direction) => {
    if (isPaused) return;
    const d = directionRef.current;
    if (dir === 'up' && d.dy === 0) { d.nextDx = 0; d.nextDy = -1; }
    if (dir === 'down' && d.dy === 0) { d.nextDx = 0; d.nextDy = 1; }
    if (dir === 'left' && d.dx === 0) { d.nextDx = -1; d.nextDy = 0; }
    if (dir === 'right' && d.dx === 0) { d.nextDx = 1; d.nextDy = 0; }
  }, [isPaused]);

  // إنشاء جزيئات انفجارية عند أكل الطعام
  const createParticles = (x: number, y: number) => {
    const pCount = 8;
    for (let i = 0; i < pCount; i++) {
      const angle = (Math.PI * 2 / pCount) * i + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      particlesRef.current.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: '#ff6b6b'
      });
    }
  };

  useEffect(() => {
    try {
      const savedMute = localStorage.getItem(SOUND_KEY);
      if (savedMute) setMuted(savedMute === 'true');
      const savedDifficulty = localStorage.getItem(DIFFICULTY_KEY) as Difficulty | null;
      if (savedDifficulty && savedDifficulty in DIFFICULTY_CONFIG) setDifficulty(savedDifficulty);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`snake_highscore_${difficulty}`);
      setHighScore(saved ? parseInt(saved, 10) : 0);
    } catch {
      setHighScore(0);
    }
  }, [difficulty]);

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

  // حلقة اللعبة الأساسية ورسم الأنيميشن الصغير
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let snake = [{ x: 10, y: 10 }];
    let food = { x: 15, y: 15 };
    let gameLoopInterval: NodeJS.Timeout;
    let animationFrameId: number;

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
      // 1. تنظيف ورسم الخلفية
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // رسم شبكة خفيفة جداً بالخلفية لمنح طابع احترافي
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
      }

      // 2. رسم الجزيئات (Particles) وتحديثها
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;
        if (p.alpha <= 0) return false;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      // 3. رسم الطعام مع تأثير نبض عشوائي خفيف
      foodPulseRef.current += 0.15;
      const pulseFactor = Math.sin(foodPulseRef.current) * 1.5;
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.roundRect(
        food.x * CELL_SIZE + 1 - pulseFactor / 2,
        food.y * CELL_SIZE + 1 - pulseFactor / 2,
        CELL_SIZE - 2 + pulseFactor,
        CELL_SIZE - 2 + pulseFactor,
        4
      );
      ctx.fill();

      // 4. رسم الثعبان
      snake.forEach((segment, index) => {
        const isHead = index === 0;
        ctx.fillStyle = isHead ? '#4ecdc4' : '#45b7aa';
        
        ctx.beginPath();
        ctx.roundRect(
          segment.x * CELL_SIZE + 1,
          segment.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2,
          isHead ? 8 : 4
        );
        ctx.fill();

        // إضافة عينين متفاعلتين مع اتجاه الرأس
        if (isHead) {
          ctx.fillStyle = '#ffffff';
          const { dx, dy } = directionRef.current;
          
          let eyeX1 = 0, eyeY1 = 0, eyeX2 = 0, eyeY2 = 0;
          if (dx !== 0) { // التحرك أفقياً
            eyeX1 = segment.x * CELL_SIZE + (dx > 0 ? 12 : 4);
            eyeY1 = segment.y * CELL_SIZE + 4;
            eyeX2 = segment.x * CELL_SIZE + (dx > 0 ? 12 : 4);
            eyeY2 = segment.y * CELL_SIZE + 12;
          } else { // التحرك عمودياً
            eyeX1 = segment.x * CELL_SIZE + 4;
            eyeY1 = segment.y * CELL_SIZE + (dy > 0 ? 12 : 4);
            eyeX2 = segment.x * CELL_SIZE + 12;
            eyeY2 = segment.y * CELL_SIZE + (dy > 0 ? 12 : 4);
          }
          
          ctx.beginPath(); ctx.arc(eyeX1, eyeY1, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(eyeX2, eyeY2, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.beginPath(); ctx.arc(eyeX1, eyeY1, 1, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(eyeX2, eyeY2, 1, 0, Math.PI * 2); ctx.fill();
        }
      });

      // استمرار طلب الأنيميشن للجزيئات وحركة الطعام النبضية
      animationFrameId = requestAnimationFrame(draw);
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
      if (isPaused) return;

      directionRef.current.dx = directionRef.current.nextDx;
      directionRef.current.dy = directionRef.current.nextDy;
      const { dx, dy } = directionRef.current;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        endRound();
        return;
      }

      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endRound();
        return;
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 10);
        createParticles(food.x, food.y);
        playSafe('correct');
        generateFood();
      } else {
        snake.pop();
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        setIsPaused(prev => !prev);
        return;
      }

      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleDirection(dir);
      }
    };

    // حساب السرعة الديناميكية: تقل قيمتها (تزيد السرعة) بمقدار 5ms لكل 30 نقطة (3 أكلات)، بحد أقصى سرعة 40ms
    const baseSpeed = DIFFICULTY_CONFIG[difficulty].speed;
    const speedBonus = Math.floor(score / 30) * 5;
    const currentSpeed = Math.max(40, baseSpeed - speedBonus);

    window.addEventListener('keydown', handleKeyPress);
    interval = setInterval(move, currentSpeed);
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, gameOver, isPaused, difficulty, score, handleDirection, playSafe]);

  const startGame = () => {
    directionRef.current = { dx: 1, dy: 0, nextDx: 1, nextDy: 0 };
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setIsNewRecord(false);
    setIsPlaying(true);
    setShowStartScreen(false);
    particlesRef.current = [];
    playSafe('click');
  };

  const selectDifficulty = (level: Difficulty) => {
    setDifficulty(level);
    try {
      localStorage.setItem(DIFFICULTY_KEY, level);
    } catch {}
  };

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_KEY, String(next));
      } catch {}
      return next;
    });
  };

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
                className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all focus:outline-none"
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
                    className={`p-4 rounded-xl font-bold transition-all ${
                      difficulty === level
                        ? `${DIFFICULTY_CONFIG[level].color} text-white scale-105 shadow-lg`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-3xl mb-2">{DIFFICULTY_CONFIG[level].emoji}</div>
                    <div>{DIFFICULTY_CONFIG[level].label}</div>
                  </button>
                ))}
              </div>

              {highScore > 0 && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-6">
                  <div className="text-sm">أعلى نتيجة لـ هذا المستوى</div>
                  <div className="text-2xl font-bold">{highScore}</div>
                </div>
              )}

              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-xl font-bold text-xl hover:from-green-600 hover:to-teal-700 transition-all shadow-md"
              >
                🎮 ابدأ اللعبة
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-center gap-3 mb-6 relative">
            <h1 className="text-4xl font-bold text-center">🐍 لعبة الثعبان</h1>
            <button
              onClick={toggleMute}
              className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all"
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 mb-4 px-2">
            <div className="text-2xl font-bold text-blue-600">النقاط: {score}</div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsPaused(p => !p)}
                className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-sm hover:bg-purple-700"
              >
                {isPaused ? '▶️ استئناف' : '⏸️ إيقاف (P)'}
              </button>
              <span className={`${DIFFICULTY_CONFIG[difficulty].color} text-white px-3 py-1 rounded-full text-sm font-bold`}>
                {DIFFICULTY_CONFIG[difficulty].emoji} {DIFFICULTY_CONFIG[difficulty].label}
              </span>
            </div>
          </div>

          <div
            className="flex justify-center mb-4 relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="border-4 border-purple-500 rounded-lg touch-none shadow-inner"
              style={{ width: '100%', maxWidth: CANVAS_SIZE, height: 'auto' }}
            />
            
            {/* شاشة الإيقاف المؤقت فوق الـ Canvas */}
            {isPaused && !gameOver && (
              <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center text-white backdrop-blur-sm">
                <div className="text-4xl font-bold mb-2">⏸️ اللعبة متوقفة</div>
                <div className="text-sm opacity-80">اضغط زر الحفظ أو P للاستمرار</div>
              </div>
            )}
          </div>

          {isPlaying && !gameOver && (
            <>
              <div className="text-center text-sm text-gray-500 mb-4">
                استخدم الأسهم أو السحب للتحرك، وزر <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border font-sans font-bold text-xs">P</kbd> للإيقاف
              </div>

              {/* أزرار التحكم للجوال */}
              <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto mb-6">
                <div />
                <button
                  onClick={() => handleDirection('up')}
                  className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all"
                >
                  ⬆️
                </button>
                <div />
                <button
                  onClick={() => handleDirection('left')}
                  className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all"
                >
                  ⬅️
                </button>
                <button
                  onClick={() => handleDirection('down')}
                  className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all"
                >
                  ⬇️
                </button>
                <button
                  onClick={() => handleDirection('right')}
                  className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all"
                >
                  ➡️
                </button>
              </div>
            </>
          )}

          {gameOver && (
            <div className="text-center animate-fade-in">
              <div className="text-3xl font-bold mb-2 text-red-500">انتهت اللعبة!</div>
              {isNewRecord && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-4 animate-bounce">
                  🎊 رقم قياسي جديد! 🎊
                </div>
              )}
              <div className="text-2xl mb-6">النقاط النهائية: {score}</div>
              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all mb-3 shadow-md"
              >
                🔄 العب مرة أخرى
              </button>
              <button
                onClick={() => router.push('/games')}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
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