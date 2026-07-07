"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'

const emojis = ['🎮', '🎨', '🎭', '🎪', '🎯', '🎲', '🎸', '🎺']

export default function MemoryGame() {
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)

  useEffect(() => { initGame() }, [])

  const initGame = () => {
    const pairs = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
    setCards(pairs)
    setFlipped([])
    setMoves(0)
    setMatches(0)
  }

  const handleClick = (id: number) => {
    if (flipped.length === 2) return
    const card = cards[id]
    if (card.flipped || card.matched) return

    const newCards = [...cards]
    newCards[id].flipped = true
    setCards(newCards)

    const newFlipped = [...flipped, id]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      const [first, second] = newFlipped
      if (cards[first].emoji === cards[second].emoji) {
        setTimeout(() => {
          const matched = [...cards]
          matched[first].matched = true
          matched[second].matched = true
          setCards(matched)
          setFlipped([])
          setMatches(m => m + 1)
        }, 500)
      } else {
        setTimeout(() => {
          const reset = [...cards]
          reset[first].flipped = false
          reset[second].flipped = false
          setCards(reset)
          setFlipped([])
        }, 1000)
      }
    }
  }

  const won = matches === emojis.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">🧠 لعبة الذاكرة</h1>
        <p className="text-gray-600 mb-4">المحاولات: {moves} | التطابقات: {matches}/{emojis.length}</p>

        <div className="grid grid-cols-4 gap-2">
          {cards.map((card, i) => (
            <button
              key={card.id}
              onClick={() => handleClick(i)}
              className={`aspect-square rounded-xl text-3xl font-bold transition-all ${
                card.flipped || card.matched
                  ? 'bg-gradient-to-br from-yellow-200 to-orange-300'
                  : 'bg-gradient-to-br from-purple-400 to-pink-500 hover:scale-105'
              }`}
            >
              {card.flipped || card.matched ? card.emoji : '?'}
            </button>
          ))}
        </div>

        {won && (
          <div className="mt-4">
            <p className="text-2xl font-bold text-green-600 mb-2">🎉 فزت!</p>
            <button onClick={initGame} className="bg-purple-500 text-white px-8 py-3 rounded-xl font-bold">
              🔄 لعبة جديدة
            </button>
          </div>
        )}

        <Link href="/dashboard" className="mt-4 inline-block text-gray-500 hover:text-gray-700">
          ⬅️ رجوع
        </Link>
      </div>
    </div>
  )
}