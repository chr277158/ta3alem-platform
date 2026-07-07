"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import * as Tone from 'tone'

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTY_SETTINGS: Record<Difficulty, { interval: number; label: string }> = {
  easy: { interval: 180, label: 'بطيء' },
  medium: { interval: 130, label: 'متوسط' },
  hard: { interval: 90, label: 'سريع' },
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [muted, setMuted] = useState(false)

  const gridSize = 20
  const canvasSize = 360
  const cellSize = canvasSize / gridSize

  const directionRef = useRef({ x: 1, y: 0 })
  const synthRef = useRef<Tone.Synth | null>(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  useEffect(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0.05, release: 0.1 },
    }).toDestination()
    synthRef.current.volume.value = -10

    ;(async () => {
      try {
        const w = window as any
        if (w.storage?.get) {
          const res = await w.storage.get('snake-high-score', false)
          if (res?.value) setHighScore(parseInt(res.value, 10) || 0)
        }
      } catch {
        // no saved score yet
      }
    })()

    return () => {
      synthRef.current?.dispose()
    }
  }, [])

  const playEat = useCallback(() => {
    if (mutedRef.current) return
    synthRef.current?.triggerAttackRelease('E5', '16n')
  }, [])

  const playGameOver = useCallback(() => {
    if (mutedRef.current) return
    const s = synthRef.current
    if (!s) return
    s.triggerAttackRelease('A3', '8n')
    setTimeout(() => s.triggerAttackRelease('D3', '8n'), 120)
    setTimeout(() => s.triggerAttackRelease('A2', '4n'), 240)
  }, [])

  const saveHighScore = async (value: number) => {
    try {
      const w = window as any
      if (w.storage?.set) await w.storage.set('snake-high-score', String(value), false)
    } catch {
      // storage unavailable
    }
  }

  const changeDirection = useCallback((dx: number, dy: number) => {
    const d = directionRef.current
    if (dx !== 0 && d.x === 0) directionRef.current = { x: dx, y: 0 }
    else if (dy !== 0 && d.y === 0) directionRef.current = { x: 0, y: dy }
  }, [])

  useEffect(() => {
    if (!started || gameOver) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let snake = [{ x: 10, y: 10 }]
    let food = { x: 15, y: 15 }
    let score = 0
    directionRef.current = { x: 1, y: 0 }

    const generateFood = () => {
      let newFood
      do {
        newFood = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize),
        }
      } while (snake.some(s => s.x === newFood.x && s.y === newFood.y))
      return newFood
    }

    const draw = () => {
      ctx.fillStyle = '#120c22'
      ctx.fillRect(0, 0, canvasSize, canvasSize)

      // خطوط شبكة خفيفة
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let i = 1; i < gridSize; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cellSize, 0)
        ctx.lineTo(i * cellSize, canvasSize)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * cellSize)
        ctx.lineTo(canvasSize, i * cellSize)
        ctx.stroke()
      }

      // الطعام المتوهج
      ctx.save()
      ctx.shadowColor = '#FF7A85'
      ctx.shadowBlur = 14
      ctx.fillStyle = '#FF4B5C'
      ctx.beginPath()
      ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2 - 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // الثعبان المتوهج
      snake.forEach((segment, i) => {
        const t = i / Math.max(snake.length - 1, 1)
        ctx.save()
        ctx.shadowColor = '#5FF0C0'
        ctx.shadowBlur = i === 0 ? 12 : 6
        ctx.fillStyle = i === 0 ? '#7FFFD4' : `rgba(79, 209, 168, ${1 - t * 0.5})`
        const r = 5
        const x = segment.x * cellSize + 1
        const y = segment.y * cellSize + 1
        const w = cellSize - 2
        const h = cellSize - 2
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + w, y, x + w, y + h, r)
        ctx.arcTo(x + w, y + h, x, y + h, r)
        ctx.arcTo(x, y + h, x, y, r)
        ctx.arcTo(x, y, x + w, y, r)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      })
    }

    const update = () => {
      const direction = directionRef.current
      const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y }

      if (
        head.x < 0 ||
        head.x >= gridSize ||
        head.y < 0 ||
        head.y >= gridSize ||
        snake.some(s => s.x === head.x && s.y === head.y)
      ) {
        playGameOver()
        setGameOver(true)
        if (score > highScore) {
          setHighScore(score)
          saveHighScore(score)
        }
        return
      }

      snake.unshift(head)

      if (head.x === food.x && head.y === food.y) {
        score += 10
        setScore(score)
        playEat()
        food = generateFood()
      } else {
        snake.pop()
      }

      draw()
    }

    const handleKey = (e: KeyboardEvent) => {
      const key = e.key
      if (key === 'ArrowUp' || key === 'w') changeDirection(0, -1)
      else if (key === 'ArrowDown' || key === 's') changeDirection(0, 1)
      else if (key === 'ArrowLeft' || key === 'a') changeDirection(-1, 0)
      else if (key === 'ArrowRight' || key === 'd') changeDirection(1, 0)
    }

    draw()
    window.addEventListener('keydown', handleKey)
    const interval = setInterval(update, DIFFICULTY_SETTINGS[difficulty].interval)

    return () => {
      window.removeEventListener('keydown', handleKey)
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, gameOver, difficulty])

  const restart = async () => {
    try {
      await Tone.start()
    } catch {
      // audio context may already be running
    }
    setScore(0)
    setGameOver(false)
    setStarted(true)
  }

  return (
    <div
      className="min-h-screen p-4 flex items-center justify-center"
      style={{
        background: 'radial-gradient(circle at 50% 0%, #1c2b24 0%, #0f1a17 55%, #0b0716 100%)',
      }}
      dir="rtl"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800&family=Tajawal:wght@400;500;700&display=swap');
        .snake-title { font-family: 'Cairo', sans-serif; }
        .snake-body { font-family: 'Tajawal', sans-serif; }
        @keyframes shakeSnake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
        .shake-anim { animation: shakeSnake 0.5s ease-in-out; }
        .dpad-btn { transition: transform 0.08s ease, background 0.08s ease; }
        .dpad-btn:active { transform: scale(0.92); background: rgba(255,255,255,0.14); }
      `}</style>

      <div
        className="rounded-3xl p-6 max-w-sm w-full text-center snake-body"
        style={{
          background: 'linear-gradient(180deg, #17251f 0%, #101a16 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setMuted(m => !m)}
            aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
            className="text-xl opacity-70 hover:opacity-100 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <h1 className="text-2xl font-extrabold snake-title" style={{ color: '#F0FFF7' }}>
            🐍 لعبة الثعبان
          </h1>
          <div style={{ width: 24 }} />
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <p className="text-lg font-bold" style={{ color: '#F0FFF7' }}>
            النقاط: <span style={{ color: '#7FFFD4' }}>{score}</span>
          </p>
          <p className="text-sm" style={{ color: 'rgba(240,255,247,0.55)' }}>
            الأفضل: {highScore}
          </p>
        </div>

        {!started && !gameOver && (
          <div className="mb-4">
            <p className="text-sm mb-2" style={{ color: 'rgba(240,255,247,0.7)' }}>
              اختر السرعة
            </p>
            <div className="flex justify-center gap-2">
              {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className="px-3 py-1.5 rounded-xl text-sm font-bold snake-body"
                  style={{
                    background: difficulty === d ? '#2FAE60' : 'rgba(255,255,255,0.06)',
                    color: difficulty === d ? '#fff' : 'rgba(240,255,247,0.75)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {DIFFICULTY_SETTINGS[d].label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className={gameOver ? 'shake-anim' : ''}
          style={{ display: 'inline-block', borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(127,255,212,0.25)' }}
        >
          <canvas ref={canvasRef} width={canvasSize} height={canvasSize} style={{ display: 'block' }} />
        </div>

        {!started && !gameOver && (
          <button
            onClick={restart}
            className="mt-4 px-8 py-3 rounded-xl font-bold snake-title"
            style={{ background: '#2FAE60', color: '#fff' }}
          >
            ▶️ ابدأ اللعبة
          </button>
        )}

        {gameOver && (
          <div className="mt-4">
            <p className="text-2xl font-bold snake-title" style={{ color: '#FF7A85' }}>
              انتهت اللعبة!
            </p>
            <p className="text-sm mb-3" style={{ color: 'rgba(240,255,247,0.7)' }}>
              نقاطك: {score} {score >= highScore && score > 0 ? '— رقم قياسي جديد 🎉' : ''}
            </p>
            <button
              onClick={restart}
              className="px-8 py-3 rounded-xl font-bold snake-title"
              style={{ background: '#2FAE60', color: '#fff' }}
            >
              🔄 إعادة
            </button>
          </div>
        )}

        {started && !gameOver && (
          <>
            <p className="mt-3 text-xs" style={{ color: 'rgba(240,255,247,0.5)' }}>
              استخدم الأسهم أو WASD أو الأزرار بالأسفل
            </p>
            <div className="mt-3 grid mx-auto" style={{ width: 132, gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              <div />
              <button className="dpad-btn" onClick={() => changeDirection(0, -1)} style={dpadStyle} aria-label="أعلى">
                ▲
              </button>
              <div />
              <button className="dpad-btn" onClick={() => changeDirection(-1, 0)} style={dpadStyle} aria-label="يسار">
                ◀
              </button>
              <button className="dpad-btn" onClick={() => changeDirection(0, 1)} style={dpadStyle} aria-label="أسفل">
                ▼
              </button>
              <button className="dpad-btn" onClick={() => changeDirection(1, 0)} style={dpadStyle} aria-label="يمين">
                ▶
              </button>
            </div>
          </>
        )}

        <div className="mt-4">
          <Link href="/dashboard" className="inline-block text-sm" style={{ color: 'rgba(240,255,247,0.45)' }}>
            ⬅️ رجوع
          </Link>
        </div>
      </div>
    </div>
  )
}

const dpadStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#F0FFF7',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}
