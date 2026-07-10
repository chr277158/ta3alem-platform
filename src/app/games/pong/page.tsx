'use client';

import { useEffect, useRef, useState, useCallback, type TouchEvent, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'start' | 'playing' | 'paused' | 'gameover';

interface Point { x: number; y: number }
interface Ball { x: number; y: number; vx: number; vy: number }
interface Paddle { x: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
interface MatchStats { wins: number; losses: number; streak: number; bestStreak: number }

const CANVAS_W = 320;
const CANVAS_H = 460;
const PADDLE_W = 70;
const PADDLE_H = 12;
const BALL_R = 7;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 20;
const WIN_SCORE = 7;

const BASE_SPEED_Y = 210;
const BASE_SPEED_X_RANGE = 110;
const SPEED_INCREASE_FACTOR = 1.045;
const MAX_SPEED = 560;
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60 درجة
const SERVE_DELAY_MS = 600;
const PLAYER_KEYBOARD_SPEED = 420; // بكسل/ثانية

const AI_CONFIG: Record<Difficulty, { speed: number; reactionMs: number; errorPx: number; emoji: string; label: string; color: string }> = {
  easy: { speed: 160, reactionMs: 450, errorPx: 46, emoji: '😊', label: 'سهل', color: 'bg-green-500' },
  medium: { speed: 230, reactionMs: 220, errorPx: 22, emoji: '😐', label: 'متوسط', color: 'bg-yellow-500' },
  hard: { speed: 340, reactionMs: 90, errorPx: 8, emoji: '😈', label: 'صعب', color: 'bg-red-500' },
};

const EMPTY_STATS: MatchStats = { wins: 0, losses: 0, streak: 0, bestStreak: 0 };

const SOUND_KEY = 'game-sound-muted';
const DIFFICULTY_KEY = 'pingpong-difficulty';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

export default function PingPongGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState>('start');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [stats, setStats] = useState<MatchStats>(EMPTY_STATS);
  const [muted, setMuted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [matchWinner, setMatchWinner] = useState<'player' | 'ai' | null>(null);

  const ballRef = useRef<Ball>({ x: CANVAS_W / 2, y: CANVAS_H / 2, vx: 0, vy: 0 });
  const playerPaddleRef = useRef<Paddle>({ x: CANVAS_W / 2 - PADDLE_W / 2 });
  const aiPaddleRef = useRef<Paddle>({ x: CANVAS_W / 2 - PADDLE_W / 2 });
  const particlesRef = useRef<Particle[]>([]);
  const servingUntilRef = useRef(0);
  const aiLastThinkRef = useRef(0);
  const aiTargetXRef = useRef(CANVAS_W / 2);
  const pressedRef = useRef({ left: false, right: false });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const playerScoreRef = useRef(0);
  const aiScoreRef = useRef(0);
  const difficultyRef = useRef<Difficulty>('medium');
  const gameStateRef = useRef<GameState>('start');

  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const playSafe = useCallback((name: Parameters<typeof playSound>[0]) => {
    if (!muted) playSound(name);
  }, [muted]);

  // تحميل تفضيلات الصوت وآخر صعوبة مختارة
  useEffect(() => {
    try {
      const savedMute = localStorage.getItem(SOUND_KEY);
      if (savedMute) setMuted(savedMute === 'true');
      const savedDifficulty = localStorage.getItem(DIFFICULTY_KEY) as Difficulty | null;
      if (savedDifficulty && savedDifficulty in AI_CONFIG) setDifficulty(savedDifficulty);
    } catch {
      // تجاهل أخطاء القراءة
    }
  }, []);

  // تحميل إحصائيات المباريات لكل مستوى صعوبة
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pingpong_stats_${difficulty}`);
      setStats(saved ? JSON.parse(saved) : EMPTY_STATS);
    } catch {
      setStats(EMPTY_STATS);
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
        if (!data.unlockedGames?.includes('pingpong')) {
          alert('🔒 يجب فتح شهادة المستوى 3 أولاً!');
          router.push('/games');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  const spawnParticles = useCallback((point: Point, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.2;
      particlesRef.current.push({
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 350 + Math.random() * 250,
        maxLife: 600,
        color,
        size: 2 + Math.random() * 2.5,
      });
    }
  }, []);

  const resetBall = useCallback(() => {
    ballRef.current = {
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      vx: (Math.random() * 2 - 1) * BASE_SPEED_X_RANGE,
      vy: (Math.random() < 0.5 ? 1 : -1) * BASE_SPEED_Y,
    };
    servingUntilRef.current = performance.now() + SERVE_DELAY_MS;
  }, []);

  const saveStats = (newStats: MatchStats) => {
    try {
      localStorage.setItem(`pingpong_stats_${difficultyRef.current}`, JSON.stringify(newStats));
    } catch {
      // تجاهل أخطاء التخزين
    }
  };

  const endMatch = useCallback((winner: 'player' | 'ai') => {
    setGameState('gameover');
    setMatchWinner(winner);
    setStats(prev => {
      const next = { ...prev };
      if (winner === 'player') {
        next.wins++;
        next.streak++;
        next.bestStreak = Math.max(next.bestStreak, next.streak);
        playSafe('achievement');
      } else {
        next.losses++;
        next.streak = 0;
        playSafe('wrong');
      }
      saveStats(next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playSafe]);

  const handlePoint = useCallback((winner: 'player' | 'ai') => {
    if (winner === 'player') {
      playerScoreRef.current += 1;
      setPlayerScore(playerScoreRef.current);
      playSafe('correct');
      spawnParticles({ x: ballRef.current.x, y: 0 }, '#4ecdc4', 16);
    } else {
      aiScoreRef.current += 1;
      setAiScore(aiScoreRef.current);
      playSafe('wrong');
      spawnParticles({ x: ballRef.current.x, y: CANVAS_H }, '#ff6b6b', 16);
    }

    if (playerScoreRef.current >= WIN_SCORE) {
      endMatch('player');
      return;
    }
    if (aiScoreRef.current >= WIN_SCORE) {
      endMatch('ai');
      return;
    }
    resetBall();
  }, [endMatch, playSafe, resetBall, spawnParticles]);

  const bounceOffPaddle = (ball: Ball, paddleX: number, direction: 1 | -1) => {
    const hitPos = clamp((ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2), -1, 1);
    const currentSpeed = Math.hypot(ball.vx, ball.vy);
    const speed = Math.min(MAX_SPEED, currentSpeed * SPEED_INCREASE_FACTOR);
    const angle = hitPos * MAX_BOUNCE_ANGLE;
    ball.vx = speed * Math.sin(angle);
    ball.vy = direction * speed * Math.cos(angle);
  };

  // بدء مباراة جديدة
  const startGame = () => {
    playerScoreRef.current = 0;
    aiScoreRef.current = 0;
    playerPaddleRef.current = { x: CANVAS_W / 2 - PADDLE_W / 2 };
    aiPaddleRef.current = { x: CANVAS_W / 2 - PADDLE_W / 2 };
    particlesRef.current = [];
    pressedRef.current = { left: false, right: false };
    aiTargetXRef.current = CANVAS_W / 2;
    resetBall();

    setPlayerScore(0);
    setAiScore(0);
    setMatchWinner(null);
    setGameState('playing');
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
      try { localStorage.setItem(SOUND_KEY, String(next)); } catch { /* تجاهل */ }
      return next;
    });
  };

  // حلقة اللعبة الرئيسية
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const playerPaddleTop = CANVAS_H - BOTTOM_MARGIN - PADDLE_H;

    const updateAI = (now: number, delta: number) => {
      const cfg = AI_CONFIG[difficultyRef.current];
      if (now - aiLastThinkRef.current > cfg.reactionMs) {
        aiLastThinkRef.current = now;
        aiTargetXRef.current = ballRef.current.x + (Math.random() * 2 - 1) * cfg.errorPx;
      }
      const paddle = aiPaddleRef.current;
      const targetLeft = clamp(aiTargetXRef.current - PADDLE_W / 2, 0, CANVAS_W - PADDLE_W);
      const dx = targetLeft - paddle.x;
      const maxStep = (cfg.speed * delta) / 1000;
      paddle.x += clamp(dx, -maxStep, maxStep);
    };

    const updatePlayer = (delta: number) => {
      const paddle = playerPaddleRef.current;
      const step = (PLAYER_KEYBOARD_SPEED * delta) / 1000;
      if (pressedRef.current.left) paddle.x -= step;
      if (pressedRef.current.right) paddle.x += step;
      paddle.x = clamp(paddle.x, 0, CANVAS_W - PADDLE_W);
    };

    const updatePhysics = (now: number, delta: number) => {
      if (now < servingUntilRef.current) return;

      const ball = ballRef.current;
      ball.x += (ball.vx * delta) / 1000;
      ball.y += (ball.vy * delta) / 1000;

      if (ball.x - BALL_R < 0) {
        ball.x = BALL_R;
        ball.vx *= -1;
      } else if (ball.x + BALL_R > CANVAS_W) {
        ball.x = CANVAS_W - BALL_R;
        ball.vx *= -1;
      }

      const ai = aiPaddleRef.current;
      if (ball.vy < 0 && ball.y - BALL_R <= TOP_MARGIN + PADDLE_H && ball.y - BALL_R > TOP_MARGIN - 10) {
        if (ball.x + BALL_R >= ai.x && ball.x - BALL_R <= ai.x + PADDLE_W) {
          ball.y = TOP_MARGIN + PADDLE_H + BALL_R;
          bounceOffPaddle(ball, ai.x, 1);
          playSafe('click');
          spawnParticles({ x: ball.x, y: ball.y }, '#ff6b6b', 8);
        }
      }

      const player = playerPaddleRef.current;
      if (ball.vy > 0 && ball.y + BALL_R >= playerPaddleTop && ball.y + BALL_R < playerPaddleTop + PADDLE_H + 10) {
        if (ball.x + BALL_R >= player.x && ball.x - BALL_R <= player.x + PADDLE_W) {
          ball.y = playerPaddleTop - BALL_R;
          bounceOffPaddle(ball, player.x, -1);
          playSafe('click');
          spawnParticles({ x: ball.x, y: ball.y }, '#4ecdc4', 8);
        }
      }

      if (ball.y - BALL_R < 0) {
        handlePoint('player');
      } else if (ball.y + BALL_R > CANVAS_H) {
        handlePoint('ai');
      }
    };

    const updateParticles = (delta: number) => {
      particlesRef.current = particlesRef.current
        .map(p => ({ ...p, x: p.x + (p.vx * delta) / 16, y: p.y + (p.vy * delta) / 16, life: p.life - delta }))
        .filter(p => p.life > 0);
    };

    const draw = () => {
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, '#1f1f3a');
      bg.addColorStop(1, '#161629');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H / 2);
      ctx.lineTo(CANVAS_W, CANVAS_H / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ff6b6b';
      ctx.shadowColor = '#ff6b6b';
      ctx.shadowBlur = 8;
      drawRoundedRect(ctx, aiPaddleRef.current.x, TOP_MARGIN, PADDLE_W, PADDLE_H, 6);

      ctx.fillStyle = '#4ecdc4';
      ctx.shadowColor = '#4ecdc4';
      drawRoundedRect(ctx, playerPaddleRef.current.x, playerPaddleTop, PADDLE_W, PADDLE_H, 6);
      ctx.shadowBlur = 0;

      const ball = ballRef.current;
      ctx.beginPath();
      ctx.fillStyle = '#ffd93d';
      ctx.shadowColor = '#ffd93d';
      ctx.shadowBlur = 12;
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      particlesRef.current.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      if (gameStateRef.current !== 'playing') return;
      const delta = Math.min(time - lastTimeRef.current, 60);
      lastTimeRef.current = time;

      updateAI(time, delta);
      updatePlayer(delta);
      updatePhysics(time, delta);
      updateParticles(delta);
      draw();

      if (gameStateRef.current === 'playing') {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { e.preventDefault(); pressedRef.current.left = true; }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { e.preventDefault(); pressedRef.current.right = true; }
      if (e.key === ' ' || e.key.toLowerCase() === 'p') { e.preventDefault(); setGameState('paused'); }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) pressedRef.current.left = false;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) pressedRef.current.right = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      pressedRef.current = { left: false, right: false };
    };
  }, [gameState, handlePoint, playSafe, spawnParticles]);

  // استئناف عبر المسافة/P أثناء الإيقاف المؤقت
  useEffect(() => {
    if (gameState !== 'paused') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setGameState('playing');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState]);

  // تحريك المضرب عبر اللمس أو الفأرة مباشرة فوق اللوحة
  const movePaddleToClientX = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = CANVAS_W / rect.width;
    const x = (clientX - rect.left) * scale;
    playerPaddleRef.current.x = clamp(x - PADDLE_W / 2, 0, CANVAS_W - PADDLE_W);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    movePaddleToClientX(e.touches[0].clientX);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    movePaddleToClientX(e.clientX);
  };

  const pressButton = (dir: 'left' | 'right', value: boolean) => {
    pressedRef.current[dir] = value;
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" dir="rtl">
        <div className="text-2xl font-bold text-gray-500 animate-pulse">⏳ جارٍ التحميل...</div>
      </div>
    );
  }

  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-center gap-3 mb-6 relative">
              <h1 className="text-4xl font-bold text-center">🏓 بينج بونج</h1>
              <button
                onClick={toggleMute}
                aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
                className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </div>

            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🏓</div>
              <p className="text-lg text-gray-600 mb-6">
                حرّك مضربك يمينًا ويسارًا وأعد الكرة! أول من يصل إلى {WIN_SCORE} نقاط يفوز بالمباراة.
              </p>

              <div className="text-lg font-bold mb-4 text-gray-700">اختر مستوى الصعوبة</div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {(Object.keys(AI_CONFIG) as Difficulty[]).map(level => (
                  <button
                    key={level}
                    onClick={() => selectDifficulty(level)}
                    aria-pressed={difficulty === level}
                    className={`p-4 rounded-xl font-bold transition-all ${
                      difficulty === level
                        ? `${AI_CONFIG[level].color} text-white scale-105 shadow-lg`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
                  >
                    <div className="text-3xl mb-2">{AI_CONFIG[level].emoji}</div>
                    <div>{AI_CONFIG[level].label}</div>
                  </button>
                ))}
              </div>

              {(stats.wins > 0 || stats.losses > 0) && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-green-50 rounded-xl p-3">
                    <div className="text-2xl font-bold text-green-600">{stats.wins}</div>
                    <div className="text-xs text-gray-600">مباريات فزت بها</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <div className="text-2xl font-bold text-red-600">{stats.losses}</div>
                    <div className="text-xs text-gray-600">مباريات خسرتها</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-3">
                    <div className="text-2xl font-bold text-yellow-600">{stats.bestStreak}</div>
                    <div className="text-xs text-gray-600">أفضل سلسلة فوز</div>
                  </div>
                </div>
              )}

              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                🎮 ابدأ المباراة
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

  if (gameState === 'gameover') {
    const won = matchWinner === 'player';
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center">
              <div className="text-8xl mb-4 animate-bounce">{won ? '🏆' : '💪'}</div>
              <h2 className="text-3xl font-bold mb-2">{won ? 'فزت بالمباراة!' : 'خسرت المباراة، حاول مرة أخرى!'}</h2>

              {stats.streak > 1 && won && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-3 mb-4 animate-pulse">
                  🔥 سلسلة انتصارات: {stats.streak}
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6 mb-6">
                <div className="text-5xl font-bold text-blue-600">
                  {playerScore} - {aiScore}
                </div>
                <div className="text-gray-600 mt-1">أنت مقابل الكمبيوتر</div>
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

  // شاشتا اللعب والإيقاف المؤقت
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <div className="flex items-center justify-center gap-3 mb-4 relative">
            <h1 className="text-3xl font-bold text-center">🏓 بينج بونج</h1>
            <div className="absolute left-0 flex gap-2">
              <button
                onClick={toggleMute}
                aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
                className="bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 flex items-center justify-center text-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {muted ? '🔇' : '🔊'}
              </button>
              <button
                onClick={() => setGameState(s => (s === 'paused' ? 'playing' : 'paused'))}
                aria-label={gameState === 'paused' ? 'استئناف' : 'إيقاف مؤقت'}
                className="bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 flex items-center justify-center text-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {gameState === 'paused' ? '▶️' : '⏸️'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="bg-red-100 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-red-600">{aiScore}</div>
              <div className="text-xs text-gray-600">الكمبيوتر</div>
            </div>
            <span className={`${AI_CONFIG[difficulty].color} text-white px-3 py-1 rounded-full text-sm font-bold`}>
              {AI_CONFIG[difficulty].emoji} {AI_CONFIG[difficulty].label}
            </span>
            <div className="bg-blue-100 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-blue-600">{playerScore}</div>
              <div className="text-xs text-gray-600">أنت</div>
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative flex justify-center mb-4"
            onTouchMove={handleTouchMove}
            onMouseMove={handleMouseMove}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="border-4 border-purple-500 rounded-lg touch-none"
              style={{ width: '100%', maxWidth: CANVAS_W, height: 'auto' }}
            />

            {gameState === 'paused' && (
              <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center gap-4">
                <div className="text-white text-3xl font-bold">⏸️ الوقت متوقف</div>
                <button
                  onClick={() => setGameState('playing')}
                  className="bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 px-8 rounded-xl font-bold text-lg hover:from-green-600 hover:to-teal-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                >
                  ▶️ استئناف
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-gray-600 text-sm mb-4">
            اسحب إصبعك على اللوحة، أو استخدم الأسهم/A D، أو الأزرار بالأسفل — مسافة/P للإيقاف المؤقت
          </div>

          <div className="flex justify-center gap-4">
            <button
              onMouseDown={() => pressButton('left', true)}
              onMouseUp={() => pressButton('left', false)}
              onMouseLeave={() => pressButton('left', false)}
              onTouchStart={() => pressButton('left', true)}
              onTouchEnd={() => pressButton('left', false)}
              aria-label="تحريك المضرب لليسار"
              className="bg-purple-100 hover:bg-purple-200 rounded-xl px-8 py-3 text-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              ⬅️
            </button>
            <button
              onMouseDown={() => pressButton('right', true)}
              onMouseUp={() => pressButton('right', false)}
              onMouseLeave={() => pressButton('right', false)}
              onTouchStart={() => pressButton('right', true)}
              onTouchEnd={() => pressButton('right', false)}
              aria-label="تحريك المضرب لليمين"
              className="bg-purple-100 hover:bg-purple-200 rounded-xl px-8 py-3 text-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              ➡️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}