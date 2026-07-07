"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'

const maze = [
  [1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,1],
  [1,0,1,0,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,0,0,0,2],
  [1,1,1,1,1,1,1,1,1,1],
]

export default function MazeGame() {
  const [pos, setPos] = useState({ x: 1, y: 1 })
  const [won, setWon] = useState(false)
  const [moves, setMoves] = useState(0)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (won) return
      let { x, y } = pos
      if (e.key === 'ArrowUp') y--
      else if (e.key === 'ArrowDown') y++
      else if (e.key === 'ArrowLeft') x--
      else if (e.key === 'ArrowRight') x++
      else return

      if (maze[y]?.[x] && maze[y][x] !== 1) {
        setPos({ x, y })
        setMoves(m => m + 1)
        if (maze[y][x] === 2) setWon(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [pos, won])

  const restart = () => { setPos({ x: 1, y: 1 }); setWon(false); setMoves(0) }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-teal-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">🏰 المتاهة</h1>
        <p className="text-gray-600 mb-4">الحركات: {moves}</p>

        <div className="inline-grid gap-0 bg-gray-800 p-2 rounded-lg" style={{ gridTemplateColumns: 'repeat(10, 30px)' }}>
          {maze.map((row, y) => row.map((cell, x) => {
            const isPlayer = pos.x === x && pos.y === y
            return (
              <div
                key={`${x}-${y}`}
                className={`w-[30px] h-[30px] flex items-center justify-center text-xl ${
                  cell === 1 ? 'bg-gray-700' : 'bg-white'
                }`}
              >
                {isPlayer ? '🧑' : cell === 2 ? '🏁' : ''}
              </div>
            )
          }))}
        </div>

        {won && (
          <div className="mt-4">
            <p className="text-2xl font-bold text-green-600">🎉 وصلت!</p>
            <button onClick={restart} className="mt-2 bg-green-500 text-white px-8 py-3 rounded-xl font-bold">
              🔄 متاهة جديدة
            </button>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-600">استخدم الأسهم للتحرك</p>

        <Link href="/dashboard" className="mt-4 inline-block text-gray-500 hover:text-gray-700">
          ⬅️ رجوع
        </Link>
      </div>
    </div>
  )
}