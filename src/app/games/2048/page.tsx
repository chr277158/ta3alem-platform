"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Grid = number[][]

const colors: Record<number, string> = {
  0: 'bg-gray-200',
  2: 'bg-yellow-100 text-gray-800',
  4: 'bg-yellow-200 text-gray-800',
  8: 'bg-orange-300 text-white',
  16: 'bg-orange-400 text-white',
  32: 'bg-orange-500 text-white',
  64: 'bg-red-500 text-white',
  128: 'bg-yellow-400 text-white',
  256: 'bg-yellow-500 text-white',
  512: 'bg-yellow-600 text-white',
  1024: 'bg-yellow-700 text-white',
  2048: 'bg-yellow-800 text-white',
}

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(initGrid())
  const [score, setScore] = useState(0)

  function initGrid(): Grid {
    const g: Grid = Array(4).fill(null).map(() => Array(4).fill(0))
    addRandom(g); addRandom(g)
    return g
  }

  function addRandom(g: Grid) {
    const empty: [number, number][] = []
    g.forEach((row, i) => row.forEach((v, j) => { if (v === 0) empty.push([i, j]) }))
    if (empty.length) {
      const [i, j] = empty[Math.floor(Math.random() * empty.length)]
      g[i][j] = Math.random() < 0.9 ? 2 : 4
    }
  }

  function move(dir: string) {
    let newGrid = grid.map(r => [...r])
    let moved = false
    let gained = 0

    const rotate = (g: Grid) => g[0].map((_, i) => g.map(row => row[i]).reverse())
    
    let rotations = { left: 0, up: 1, right: 2, down: 3 }[dir] || 0
    for (let i = 0; i < rotations; i++) newGrid = rotate(newGrid)

    for (let i = 0; i < 4; i++) {
      let row = newGrid[i].filter(v => v !== 0)
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j+1]) {
          row[j] *= 2
          gained += row[j]
          row.splice(j+1, 1)
        }
      }
      while (row.length < 4) row.push(0)
      if (row.some((v, idx) => v !== newGrid[i][idx])) moved = true
      newGrid[i] = row
    }

    for (let i = 0; i < (4 - rotations) % 4; i++) newGrid = rotate(newGrid)

    if (moved) {
      addRandom(newGrid)
      setGrid(newGrid)
      setScore(s => s + gained)
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const keys: Record<string, string> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'
      }
      if (keys[e.key]) {
        e.preventDefault()
        move(keys[e.key])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const restart = () => { setGrid(initGrid()); setScore(0) }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-orange-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">🔢 2048</h1>
        <p className="text-xl font-bold mb-4">⭐ {score}</p>

        <div className="grid grid-cols-4 gap-2 bg-gray-300 p-2 rounded-xl">
          {grid.flat().map((v, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center font-bold text-xl ${colors[v] || 'bg-purple-500 text-white'}`}
            >
              {v || ''}
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-gray-600">استخدم الأسهم للتحريك</p>
        <button onClick={restart} className="mt-4 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold">
          🔄 إعادة
        </button>

        <Link href="/dashboard" className="mt-4 inline-block text-gray-500 hover:text-gray-700">
          ⬅️ رجوع
        </Link>
      </div>
    </div>
  )
}