'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type Difficulty = 'easy' | 'medium' | 'hard';
type Direction = 'up' | 'down' | 'left' | 'right';
type FoodType = 'apple' | 'star' | 'bolt' | 'ice' | 'poison';
type GameMode = 'classic' | 'survival' | 'timeattack' | 'nowalls' | 'hardmode';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
  color: string;
}

interface SnakeSegment {
  x: number;
  y: number;
}

interface Food {
  x: number;
  y: number;
  type: FoodType;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { speed: number; emoji: string; label: string; color: string }> = {
  easy: { speed: 180, emoji: '😊', label: 'سهل', color: 'bg-green-500' },
  medium: { speed: 130, emoji: '😐', label: 'متوسط', color: 'bg-yellow-500' },
  hard: { speed: 90, emoji: '😈', label: 'صعب', color: 'bg-red-500' },
};

const FOOD_CONFIG: Record<FoodType, { emoji: string; points: number; color: string }> = {
  apple: { emoji: '🍎', points: 10, color: '#ff6b6b' },
  star: { emoji: '⭐', points: 30, color: '#ffd93d' },
  bolt: { emoji: '⚡', points: 0, color: '#4d96ff' },
  ice: { emoji: '❄️', points: 0, color: '#8ecae6' },
  poison: { emoji: '💀', points: 0, color: '#6c757d' },
};

const MODE_CONFIG: Record<GameMode, { label: string; emoji: string; description: string }> = {
  classic: { label: 'Classic', emoji: '🎯', description: 'الوضع التقليدي' },
  survival: { label: 'Survival', emoji: '🛡️', description: 'يزيد الصعوبة تدريجيًا' },
  timeattack: { label: 'Time Attack', emoji: '⏱️', description: 'وقت محدود' },
  nowalls: { label: 'No Walls', emoji: '↔️', description: 'عبور من الطرف الآخر' },
  hardmode: { label: 'Hard Mode', emoji: '🔥', description: 'أسرع وأصعب' },
};

const SOUND_KEY = 'game-sound-muted';
const DIFFICULTY_KEY = 'snake-difficulty';
const MODE_KEY = 'snake-mode';

export default function SnakeGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shakeRef = useRef<HTMLDivElement | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [mode, setMode] = useState<GameMode>('classic');
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [muted, setMuted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timeAlive, setTimeAlive] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const GRID_SIZE = 20;
  const CELL_SIZE = 20;
  const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
  const TIME_LIMIT = 120;

  const directionRef = useRef({ dx: 1, dy: 0, nextDx: 1, nextDy: 0 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const foodPulseRef = useRef(0);
  const snakeRef = useRef<SnakeSegment[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<Food>({ x: 15, y: 15, type: 'apple' });
  const effectsRef = useRef<{ speedBoostUntil: number; slowUntil: number }>({
    speedBoostUntil: 0,
    slowUntil: 0,
  });
  const timeAliveRef = useRef(0);

  const playSafe = useCallback((name: Parameters<typeof playSound>[0]) => {
    if (!muted) playSound(name);
  }, [muted]);

  const levelFromScore = (s: number) => Math.floor(s / 50) + 1;
  const isNoWalls = mode === 'nowalls';
  const isTimeAttack = mode === 'timeattack';

  const getCurrentSpeed = () => {
    let baseSpeed = DIFFICULTY_CONFIG[difficulty].speed;
    if (mode === 'hardmode') baseSpeed -= 25;
    if (mode === 'survival') baseSpeed -= (level - 1) * 3;
    const levelBonus = (level - 1) * 8;
    const speedBoost = Date.now() < effectsRef.current.speedBoostUntil ? 20 : 0;
    const slowDown = Date.now() < effectsRef.current.slowUntil ? -20 : 0;
    return Math.max(40, baseSpeed - levelBonus - speedBoost + slowDown);
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#ffffff') => {
    floatingTextsRef.current.push({ x, y, text, alpha: 1, vy: -0.25, color });
  };

  const flashShake = () => {
    const el = shakeRef.current;
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  };

  const handleDirection = useCallback((dir: Direction) => {
    if (isPaused || countdown !== null) return;
    const d = directionRef.current;
    if (dir === 'up' && d.dy === 0) { d.nextDx = 0; d.nextDy = -1; }
    if (dir === 'down' && d.dy === 0) { d.nextDx = 0; d.nextDy = 1; }
    if (dir === 'left' && d.dx === 0) { d.nextDx = -1; d.nextDy = 0; }
    if (dir === 'right' && d.dx === 0) { d.nextDx = 1; d.nextDy = 0; }
  }, [isPaused, countdown]);

  const createParticles = (x: number, y: number, color = '#ff6b6b') => {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      particlesRef.current.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
      });
    }
  };

  const generateFood = (snake: SnakeSegment[]) => {
    const types: FoodType[] = ['apple', 'star', 'bolt', 'ice', 'poison'];
    let newFood: Food;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
        type: types[Math.floor(Math.random() * types.length)],
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    foodRef.current = newFood;
  };

  const endRound = () => {
    setGameOver(true);
    setIsPlaying(false);
    setIsPaused(false);
    flashShake();
    playSafe('wrong');

    try {
      const key = `snake_highscore_${difficulty}_${mode}`;
      const currentHigh = parseInt(localStorage.getItem(key) || '0', 10);
      if (score > currentHigh) {
        localStorage.setItem(key, score.toString());
        setHighScore(score);
        setIsNewRecord(true);
        playSafe('achievement');
      } else {
        setIsNewRecord(false);
      }
    } catch {}
  };

  useEffect(() => {
    try {
      const savedMute = localStorage.getItem(SOUND_KEY);
      if (savedMute) setMuted(savedMute === 'true');
      const savedDifficulty = localStorage.getItem(DIFFICULTY_KEY) as Difficulty | null;
      if (savedDifficulty && savedDifficulty in DIFFICULTY_CONFIG) setDifficulty(savedDifficulty);
      const savedMode = localStorage.getItem(MODE_KEY) as GameMode | null;
      if (savedMode && savedMode in MODE_CONFIG) setMode(savedMode);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`snake_highscore_${difficulty}_${mode}`);
      setHighScore(saved ? parseInt(saved, 10) : 0);
    } catch {
      setHighScore(0);
    }
  }, [difficulty, mode]);

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
    if (!isPlaying || gameOver || countdown !== null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let intervalId = 0;
    let animationFrameId = 0;
    let timeId = 0;
    let timeAttackId = 0;

    const draw = () => {
      const snake = snakeRef.current;
      const food = foodRef.current;

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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

      foodPulseRef.current += 0.15;
      const pulseFactor = Math.sin(foodPulseRef.current) * 1.5;
      const foodCfg = FOOD_CONFIG[food.type];
      ctx.fillStyle = foodCfg.color;
      ctx.beginPath();
      ctx.roundRect(
        food.x * CELL_SIZE + 1 - pulseFactor / 2,
        food.y * CELL_SIZE + 1 - pulseFactor / 2,
        CELL_SIZE - 2 + pulseFactor,
        CELL_SIZE - 2 + pulseFactor,
        4
      );
      ctx.fill();

      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(foodCfg.emoji, food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2 + 1);

      snake.forEach((segment, index) => {
        const isHead = index === 0;
        ctx.fillStyle = isHead ? '#4ecdc4' : '#45b7aa';
        ctx.beginPath();
        ctx.roundRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2, isHead ? 8 : 6);
        ctx.fill();

        if (isHead) {
          ctx.fillStyle = '#fff';
          const { dx, dy } = directionRef.current;
          let eyeX1 = 0, eyeY1 = 0, eyeX2 = 0, eyeY2 = 0;

          if (dx !== 0) {
            eyeX1 = segment.x * CELL_SIZE + (dx > 0 ? 12 : 4);
            eyeY1 = segment.y * CELL_SIZE + 4;
            eyeX2 = segment.x * CELL_SIZE + (dx > 0 ? 12 : 4);
            eyeY2 = segment.y * CELL_SIZE + 12;
          } else {
            eyeX1 = segment.x * CELL_SIZE + 4;
            eyeY1 = segment.y * CELL_SIZE + (dy > 0 ? 12 : 4);
            eyeX2 = segment.x * CELL_SIZE + 12;
            eyeY2 = segment.y * CELL_SIZE + (dy > 0 ? 12 : 4);
          }

          ctx.beginPath();
          ctx.arc(eyeX1, eyeY1, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eyeX2, eyeY2, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(eyeX1, eyeY1, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eyeX2, eyeY2, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      floatingTextsRef.current = floatingTextsRef.current
        .map(t => ({ ...t, y: t.y + t.vy, alpha: t.alpha - 0.03 }))
        .filter(t => t.alpha > 0);

      floatingTextsRef.current.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ft.text, ft.x * CELL_SIZE + CELL_SIZE / 2, ft.y * CELL_SIZE);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    const move = () => {
      if (isPaused) return;

      const snake = snakeRef.current;
      const food = foodRef.current;

      directionRef.current.dx = directionRef.current.nextDx;
      directionRef.current.dy = directionRef.current.nextDy;
      const { dx, dy } = directionRef.current;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      if (isNoWalls) {
        if (head.x < 0) head.x = GRID_SIZE - 1;
        if (head.x >= GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = GRID_SIZE - 1;
        if (head.y >= GRID_SIZE) head.y = 0;
      } else {
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          endRound();
          return;
        }
      }

      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endRound();
        return;
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        const foodCfg = FOOD_CONFIG[food.type];

        if (food.type === 'apple' || food.type === 'star') {
          setScore(s => s + foodCfg.points);
          addFloatingText(food.x, food.y, `+${foodCfg.points}`, foodCfg.color);
          createParticles(food.x, food.y, foodCfg.color);
          playSafe('correct');
        }

        if (food.type === 'bolt') {
          effectsRef.current.speedBoostUntil = Date.now() + 6000;
          addFloatingText(food.x, food.y, '⚡ SPEED', foodCfg.color);
          createParticles(food.x, food.y, foodCfg.color);
          playSafe('powerup');
        }

        if (food.type === 'ice') {
          effectsRef.current.slowUntil = Date.now() + 6000;
          addFloatingText(food.x, food.y, '❄️ SLOW', foodCfg.color);
          createParticles(food.x, food.y, foodCfg.color);
          playSafe('powerup');
        }

        if (food.type === 'poison') {
          if (snake.length > 2) snake.pop();
          if (snake.length > 2) snake.pop();
          setScore(s => Math.max(0, s - 10));
          addFloatingText(food.x, food.y, '-10', foodCfg.color);
          createParticles(food.x, food.y, foodCfg.color);
          playSafe('wrong');
        }

        generateFood(snake);
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
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };

      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleDirection(dir);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    intervalId = window.setInterval(move, getCurrentSpeed());
    animationFrameId = requestAnimationFrame(draw);
    timeId = window.setInterval(() => {
      if (!isPaused) {
        timeAliveRef.current += 1;
        setTimeAlive(timeAliveRef.current);
      }
    }, 1000);

    if (isTimeAttack) {
      timeAttackId = window.setInterval(() => {
        if (timeAliveRef.current >= TIME_LIMIT) endRound();
      }, 500);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(intervalId);
      clearInterval(timeId);
      clearInterval(timeAttackId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, gameOver, isPaused, difficulty, countdown, mode, level, score, handleDirection]);

  useEffect(() => {
    setLevel(levelFromScore(score));
  }, [score]);

  useEffect(() => {
    if (isPlaying && countdown !== null) {
      const id = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return 3;
          if (prev === 1) {
            clearInterval(id);
            setTimeout(() => setCountdown(null), 250);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [isPlaying, countdown]);

  const startGame = () => {
    directionRef.current = { dx: 1, dy: 0, nextDx: 1, nextDy: 0 };
    snakeRef.current = [{ x: 10, y: 10 }];
    foodRef.current = { x: 15, y: 15, type: 'apple' };
    generateFood(snakeRef.current);
    setScore(0);
    setLevel(1);
    setTimeAlive(0);
    timeAliveRef.current = 0;
    setGameOver(false);
    setIsPaused(false);
    setIsNewRecord(false);
    setIsPlaying(true);
    setShowStartScreen(false);
    setCountdown(3);
    setShowSettings(false);
    floatingTextsRef.current = [];
    particlesRef.current = [];
    effectsRef.current = { speedBoostUntil: 0, slowUntil: 0 };
    playSafe('click');
  };

  const selectDifficulty = (level: Difficulty) => {
    setDifficulty(level);
    try {
      localStorage.setItem(DIFFICULTY_KEY, level);
    } catch {}
  };

  const selectMode = (m: GameMode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
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

  const toggleFullscreen = async () => {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await el.requestFullscreen?.();
    }
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-2xl font-bold text-gray-500">⏳ جارٍ التحميل...</div>;
  }

  if (showStartScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-center gap-3 mb-6 relative">
              <h1 className="text-4xl font-bold text-center">🐍 لعبة الثعبان</h1>
              <button onClick={toggleMute} className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-xl">
                {muted ? '🔇' : '🔊'}
              </button>
            </div>

            <div className="text-center mb-8">
              <p className="text-xl text-gray-600 mb-6">وجّه الثعبان لأكل الطعام دون أن يصطدم بنفسه أو بالجدار!</p>

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

              <div className="grid grid-cols-2 gap-3 mb-6">
                {(Object.keys(MODE_CONFIG) as GameMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => selectMode(m)}
                    className={`p-3 rounded-xl font-bold transition-all ${
                      mode === m ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-1">{MODE_CONFIG[m].emoji}</div>
                    <div>{MODE_CONFIG[m].label}</div>
                    <div className="text-xs opacity-80">{MODE_CONFIG[m].description}</div>
                  </button>
                ))}
              </div>

              {highScore > 0 && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-6">
                  <div className="text-sm">أعلى نتيجة لهذا الوضع</div>
                  <div className="text-2xl font-bold">{highScore}</div>
                </div>
              )}

              <button onClick={startGame} className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-xl font-bold text-xl hover:from-green-600 hover:to-teal-700 transition-all shadow-md">
                🎮 ابدأ اللعبة
              </button>

              <button onClick={() => router.push('/games')} className="w-full mt-3 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all">
                🏠 العودة للألعاب
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div ref={shakeRef} className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-center gap-3 mb-6 relative">
            <h1 className="text-4xl font-bold text-center">🐍 لعبة الثعبان</h1>
            <button onClick={toggleMute} className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-xl">
              {muted ? '🔇' : '🔊'}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="text-2xl font-bold text-blue-600">النقاط: {score}</div>
            <div className="flex gap-2 items-center flex-wrap">
              <button onClick={() => setIsPaused(p => !p)} className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                {isPaused ? '▶️ استئناف' : '⏸️ إيقاف (P)'}
              </button>
              <button onClick={toggleFullscreen} className="bg-gray-800 text-white px-4 py-1 rounded-full text-sm font-bold">
                ⛶ Fullscreen
              </button>
              <button onClick={() => setShowSettings(v => !v)} className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                ⚙️ Settings
              </button>
              <span className={`${DIFFICULTY_CONFIG[difficulty].color} text-white px-3 py-1 rounded-full text-sm font-bold`}>
                {DIFFICULTY_CONFIG[difficulty].emoji} {DIFFICULTY_CONFIG[difficulty].label}
              </span>
            </div>
          </div>

          {showSettings && (
            <div className="bg-gray-50 border rounded-2xl p-4 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(MODE_CONFIG) as GameMode[]).map(m => (
                  <button key={m} onClick={() => selectMode(m)} className={`p-3 rounded-xl font-bold ${mode === m ? 'bg-purple-600 text-white' : 'bg-white hover:bg-gray-100'}`}>
                    {MODE_CONFIG[m].emoji} {MODE_CONFIG[m].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
            <div className="bg-gray-100 rounded-xl p-3 text-center"><div className="text-gray-500">Score</div><div className="text-xl font-bold">{score}</div></div>
            <div className="bg-gray-100 rounded-xl p-3 text-center"><div className="text-gray-500">High Score</div><div className="text-xl font-bold">{highScore}</div></div>
            <div className="bg-gray-100 rounded-xl p-3 text-center"><div className="text-gray-500">Level</div><div className="text-xl font-bold">{level}</div></div>
            <div className="bg-gray-100 rounded-xl p-3 text-center"><div className="text-gray-500">Speed</div><div className="text-xl font-bold">{getCurrentSpeed()} ms</div></div>
            <div className="bg-gray-100 rounded-xl p-3 text-center"><div className="text-gray-500">Time</div><div className="text-xl font-bold">{timeAlive}s</div></div>
          </div>

          <div className="flex justify-center mb-4 relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="border-4 border-purple-500 rounded-lg touch-none shadow-inner"
              style={{ width: '100%', maxWidth: CANVAS_SIZE, height: 'auto' }}
            />
            {isPaused && !gameOver && (
              <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center text-white backdrop-blur-sm">
                <div className="text-4xl font-bold mb-2">⏸️ اللعبة متوقفة</div>
                <div className="text-sm opacity-80">اضغط P للاستمرار</div>
              </div>
            )}
            {countdown !== null && !gameOver && (
              <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-white text-7xl font-bold backdrop-blur-sm">
                {countdown === 0 ? 'GO!' : countdown}
              </div>
            )}
          </div>

          {isPlaying && !gameOver && (
            <>
              <div className="text-center text-sm text-gray-500 mb-4">استخدم الأسهم أو السحب للتحرك، وزر P للإيقاف</div>

              <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto mb-6" dir="ltr">
                <div />
                <button onClick={() => handleDirection('up')} className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all">⬆️</button>
                <div />
                <button onClick={() => handleDirection('left')} className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all">⬅️</button>
                <div />
                <button onClick={() => handleDirection('right')} className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all">➡️</button>
                <div />
                <button onClick={() => handleDirection('down')} className="bg-purple-100 hover:bg-purple-200 rounded-xl py-3 text-2xl transition-all">⬇️</button>
                <div />
              </div>
            </>
          )}

          {gameOver && (
            <div className="text-center animate-fade-in">
              <div className="text-3xl font-bold mb-2 text-red-500">انتهت اللعبة!</div>
              {isNewRecord && <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-4 animate-bounce">🎊 رقم قياسي جديد! 🎊</div>}
              <div className="bg-gray-100 rounded-xl p-4 mb-4 text-right">
                <div>Score: {score}</div>
                <div>High Score: {highScore}</div>
                <div>Level: {level}</div>
                <div>Speed: {getCurrentSpeed()} ms</div>
                <div>Time: {timeAlive}s</div>
              </div>
              <button onClick={startGame} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all mb-3 shadow-md">
                🔄 العب مرة أخرى
              </button>
              <button onClick={() => router.push('/games')} className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all">
                🏠 العودة للألعاب
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .shake {
          animation: shake 0.25s linear;
        }
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-6px); }
          100% { transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}