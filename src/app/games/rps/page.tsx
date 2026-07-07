"use client"

import { useState } from 'react'
import Link from 'next/link'

const choices = [
  { name: 'حجر', emoji: '🪨' },
  { name: 'ورقة', emoji: '📄' },
  { name: 'مقص', emoji: '✂️' },
]

export default function RPSGame() {
  const [player, setPlayer] = useState<number | null>(null)
  const [computer, setComputer] = useState<number | null>(null)
  const [result, setResult] = useState('')
  const [score, setScore] = useState({ player: 0, computer: 0 })

  const play = (i: number) => {
    const c = Math.floor(Math.random() * 3)
    setPlayer(i)
    setComputer(c)

    if (i === c) {
      setResult('🤝 تعادل!')
    } else if ((i === 0 && c === 2) || (i === 1 && c === 0) || (i === 2 && c === 1)) {
      setResult('🎉 فزت!')
      setScore(s => ({ ...s, player: s.player + 1 }))
    } else {
      setResult('😢 خسرت!')
      setScore(s => ({ ...s, computer: s.computer + 1 }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 to-pink-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">✂️ حجر ورقة مقص</h1>
        <div className="flex justify-around mb-4">
          <div className="text-xl font-bold">🧑 {score.player}</div>
          <div className="text-xl font-bold">🤖 {score.computer}</div>
        </div>

        <div className="flex justify-around my-6">
          <div className="text-center">
            <div className="text-6xl mb-2">{player !== null ? choices[player].emoji : '❓'}</div>
            <div className="font-bold">أنت</div>
          </div>
          <div className="text-4xl self-center">⚔️</div>
          <div className="text-center">
            <div className="text-6xl mb-2">{computer !== null ? choices[computer].emoji : '❓'}</div>
            <div className="font-bold">الكمبيوتر</div>
          </div>
        </div>

        {result && <p className="text-2xl font-bold mb-4">{result}</p>}

        <div className="grid grid-cols-3 gap-3">
          {choices.map((c, i) => (
            <button
              key={i}
              onClick={() => play(i)}
              className="bg-gradient-to-br from-red-400 to-pink-500 text-white p-4 rounded-xl text-4xl hover:scale-105 transition"
            >
              {c.emoji}
            </button>
          ))}
        </div>

        <Link href="/dashboard" className="mt-4 inline-block text-gray-500 hover:text-gray-700">
          ⬅️ رجوع
        </Link>
      </div>
    </div>
  )
}