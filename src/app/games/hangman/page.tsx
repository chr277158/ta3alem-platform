"use client"

import { useState } from 'react'
import Link from 'next/link'

const words = [
  { word: 'تونس', hint: 'بلد في شمال أفريقيا' },
  { word: 'شمس', hint: 'تشرق في الصباح' },
  { word: 'قمر', hint: 'يضيء في الليل' },
  { word: 'كتاب', hint: 'نقرأ فيه' },
  { word: 'مدرسة', hint: 'مكان التعلم' },
  { word: 'بحر', hint: 'ماء مالح' },
  { word: 'شجرة', hint: 'نبات كبير' },
  { word: 'أسد', hint: 'ملك الغابة' },
]

export default function HangmanGame() {
  const [data, setData] = useState(words[Math.floor(Math.random() * words.length)])
  const [guessed, setGuessed] = useState<string[]>([])
  const [wrong, setWrong] = useState(0)

  const letters = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('')
  const display = data.word.split('').map(l => guessed.includes(l) ? l : '_')
  const won = display.every(l => l !== '_')
  const lost = wrong >= 6

  const guess = (l: string) => {
    if (guessed.includes(l) || won || lost) return
    const newGuessed = [...guessed, l]
    setGuessed(newGuessed)
    if (!data.word.includes(l)) setWrong(w => w + 1)
  }

  const restart = () => {
    setData(words[Math.floor(Math.random() * words.length)])
    setGuessed([])
    setWrong(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-blue-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">📝 تخمين الكلمة</h1>
        <p className="text-gray-600 mb-4">💡 {data.hint}</p>

        <div className="text-4xl font-bold tracking-widest mb-4">
          {display.map((l, i) => (
            <span key={i} className="inline-block mx-1 border-b-4 border-gray-400 min-w-[40px]">
              {l}
            </span>
          ))}
        </div>

        <p className="mb-4">المحاولات الخاطئة: {'❤️'.repeat(6 - wrong)}{'🖤'.repeat(wrong)}</p>

        {won && <p className="text-2xl font-bold text-green-600 mb-4">🎉 فزت!</p>}
        {lost && <p className="text-2xl font-bold text-red-600 mb-4">😢 الكلمة: {data.word}</p>}

        <div className="grid grid-cols-7 gap-1 mb-4">
          {letters.map(l => (
            <button
              key={l}
              onClick={() => guess(l)}
              disabled={guessed.includes(l) || won || lost}
              className={`p-2 rounded-lg font-bold text-sm ${
                guessed.includes(l)
                  ? data.word.includes(l) ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  : 'bg-blue-200 hover:bg-blue-300'
              } disabled:opacity-50`}
            >
              {l}
            </button>
          ))}
        </div>

        {(won || lost) && (
          <button onClick={restart} className="bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold">
            🔄 كلمة جديدة
          </button>
        )}

        <Link href="/dashboard" className="mt-4 inline-block text-gray-500 hover:text-gray-700">
          ⬅️ رجوع
        </Link>
      </div>
    </div>
  )
}