"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import * as Tone from 'tone'

type PadId = 'red' | 'blue' | 'green' | 'yellow'
type Difficulty = 'easy' | 'medium' | 'hard'

const PADS: { id: PadId; base: string; glow: string; note: string; corner: string }[] = [
  { id: 'red', base: '#E6394A', glow: '#FF7A85', note: 'C4', corner: 'borderTopLeftRadius' },
  { id: 'blue', base: '#1C8CE0', glow: '#6FCBFF', note: 'E4', corner: 'borderTopRightRadius' },
  { id: 'green', base: '#2FAE60', glow: '#7FE3A8', note: 'G4', corner: 'borderBottomLeftRadius' },
  { id: 'yellow', base: '#E0A419', glow: '#FFD873', note: 'C5', corner: 'borderBottomRightRadius' },
]

const DIFFICULTY_SETTINGS: Record<Difficulty, { step: number; lit: number; label: string }> = {
  easy: { step: 750, lit: 500, label: 'سهل' },
  medium: { step: 550, lit: 350, label: 'متوسط' },
  hard: { step: 380, lit: 230, label: 'صعب' },
}

export default function SimonGame() {
  const [sequence, setSequence] = useState<PadId[]>([])
  const [playerSeq, setPlayerSeq] = useState<PadId[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [active, setActive] = useState<PadId | null>(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [muted, setMuted] = useState(false)
  const [started, setStarted] = useState(false)

  const synthRef = useRef<Tone.Synth | null>(null)
  const settings = DIFFICULTY_SETTINGS[difficulty]

  // Load synth + saved high score once on mount
  useEffect(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.3 },
    }).toDestination()

    ;(async () => {
      try {
        const w = window as any
        if (w.storage?.get) {
          const res = await w.storage.get('simon-high-score', false)
          if (res?.value) setHighScore(parseInt(res.value, 10) || 0)
        }
      } catch {
        // no saved score yet, that's fine
      }
    })()

    return () => {
      synthRef.current?.dispose()
    }
  }, [])

  const playNote = useCallback(
    (note: string) => {
      if (muted) return
      synthRef.current?.triggerAttackRelease(note, '8n')
    },
    [muted]
  )

  const playError = useCallback(() => {
    if (muted) return
    synthRef.current?.triggerAttackRelease('C2', '4n')
  }, [muted])

  const saveHighScore = async (value: number) => {
    try {
      const w = window as any
      if (w.storage?.set) await w.storage.set('simon-high-score', String(value), false)
    } catch {
      // storage unavailable, ignore
    }
  }

  // Play back the current sequence whenever it grows
  useEffect(() => {
    if (sequence.length === 0) return
    setIsPlaying(true)
    sequence.forEach((color, i) => {
      setTimeout(() => {
        setActive(color)
        playNote(PADS.find(p => p.id === color)!.note)
      }, i * settings.step)
      setTimeout(() => setActive(null), i * settings.step + settings.lit)
    })
    const total = (sequence.length - 1) * settings.step + settings.lit + 200
    const t = setTimeout(() => setIsPlaying(false), total)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence])

  const addToSequence = useCallback(() => {
    setSequence(prev => [...prev, PADS[Math.floor(Math.random() * 4)].id])
    setPlayerSeq([])
  }, [])

  const handleClick = (color: PadId) => {
    if (isPlaying || gameOver || !started) return
    setActive(color)
    playNote(PADS.find(p => p.id === color)!.note)
    setTimeout(() => setActive(null), 200)

    const newPlayerSeq = [...playerSeq, color]
    setPlayerSeq(newPlayerSeq)

    const idx = newPlayerSeq.length - 1
    if (newPlayerSeq[idx] !== sequence[idx]) {
      playError()
      setGameOver(true)
      if (score > highScore) {
        setHighScore(score)
        saveHighScore(score)
      }
      return
    }

    if (newPlayerSeq.length === sequence.length) {
      setScore(s => s + 1)
      setTimeout(addToSequence, 900)
    }
  }

  const start = async () => {
    try {
      await Tone.start()
    } catch {
      // audio context may already be running
    }
    setSequence([])
    setPlayerSeq([])
    setScore(0)
    setGameOver(false)
    setStarted(true)
    setTimeout(addToSequence, 500)
  }

  return (
    <div
      className="min-h-screen p-4 flex items-center justify-center"
      style={{
        background: 'radial-gradient(circle at 50% 0%, #241a3d 0%, #120c22 60%, #0b0716 100%)',
      }}
      dir="rtl"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800&family=Tajawal:wght@400;500;700&display=swap');
        .simon-title { font-family: 'Cairo', sans-serif; }
        .simon-body { font-family: 'Tajawal', sans-serif; }
        @keyframes ringPulse {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
          70% { box-shadow: 0 0 0 18px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
        .hub-pulse { animation: ringPulse 1.4s ease-out infinite; }
        .shake-anim { animation: shake 0.5s ease-in-out; }
        .pad-btn { transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease; }
        .pad-btn:disabled { cursor: not-allowed; }
      `}</style>

      <div
        className="rounded-3xl p-6 max-w-sm w-full text-center simon-body"
        style={{
          background: 'linear-gradient(180deg, #1c1530 0%, #150f26 100%)',
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
          <h1 className="text-2xl font-extrabold simon-title" style={{ color: '#F4F0FF' }}>
            🎵 سايمون يقول
          </h1>
          <div style={{ width: 24 }} />
        </div>

        <div className="flex items-center justify-center gap-4 mb-5">
          <p className="text-lg font-bold" style={{ color: '#F4F0FF' }}>
            المستوى: <span style={{ color: '#FFD873' }}>{score}</span>
          </p>
          <p className="text-sm" style={{ color: 'rgba(244,240,255,0.55)' }}>
            الأفضل: {highScore}
          </p>
        </div>

        {!started && !gameOver && (
          <div className="mb-5">
            <p className="text-sm mb-2" style={{ color: 'rgba(244,240,255,0.7)' }}>
              اختر مستوى الصعوبة
            </p>
            <div className="flex justify-center gap-2">
              {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className="px-3 py-1.5 rounded-xl text-sm font-bold simon-body"
                  style={{
                    background: difficulty === d ? '#7B5CFF' : 'rgba(255,255,255,0.06)',
                    color: difficulty === d ? '#fff' : 'rgba(244,240,255,0.75)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {DIFFICULTY_SETTINGS[d].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Circular quadrant pad */}
        <div
          className={`relative mx-auto mb-5 ${gameOver ? 'shake-anim' : ''}`}
          style={{ width: 240, height: 240 }}
        >
          <div className="grid grid-cols-2 grid-rows-2 gap-1.5 w-full h-full">
            {PADS.map(pad => {
              const isActive = active === pad.id
              return (
                <button
                  key={pad.id}
                  disabled={isPlaying || gameOver || !started}
                  onClick={() => handleClick(pad.id)}
                  aria-label={pad.id}
                  className="pad-btn"
                  style={{
                    background: isActive ? pad.glow : pad.base,
                    [pad.corner]: '100%',
                    boxShadow: isActive ? `0 0 24px 6px ${pad.glow}` : 'none',
                    transform: isActive ? 'scale(0.96)' : 'scale(1)',
                    opacity: started ? 1 : 0.55,
                    border: 'none',
                  }}
                />
              )
            })}
          </div>
          <div
            className={`absolute rounded-full flex items-center justify-center simon-title font-extrabold ${
              isPlaying ? 'hub-pulse' : ''
            }`}
            style={{
              width: 84,
              height: 84,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#150f26',
              border: '2px solid rgba(255,255,255,0.12)',
              color: '#F4F0FF',
              fontSize: 26,
            }}
          >
            {started ? score : '▶'}
          </div>
        </div>

        {gameOver && (
          <div className="mb-3">
            <p className="text-xl font-extrabold simon-title" style={{ color: '#FF7A85' }}>
              انتهت اللعبة!
            </p>
            <p className="text-sm" style={{ color: 'rgba(244,240,255,0.7)' }}>
              مستواك: {score} {score >= highScore && score > 0 ? '— رقم قياسي جديد 🎉' : ''}
            </p>
          </div>
        )}

        {(!started || gameOver) && (
          <button
            onClick={start}
            className="px-8 py-3 rounded-xl font-bold simon-title"
            style={{ background: '#7B5CFF', color: '#fff' }}
          >
            {gameOver ? '🔁 إعادة المحاولة' : '▶️ ابدأ'}
          </button>
        )}

        <div className="mt-4">
          <Link
            href="/dashboard"
            className="inline-block text-sm"
            style={{ color: 'rgba(244,240,255,0.45)' }}
          >
            ⬅️ رجوع
          </Link>
        </div>
      </div>
    </div>
  )
}
