"use client"

import { useState } from 'react'
import Link from 'next/link'

type Cell = 'X' | 'O' | null

export default function TicTacToeGame() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState(true)
  const [score, setScore] = useState({ player: 0, computer: 0 })

  const checkWinner = (b: Cell[]): Cell => {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ]
    for (const [a, b2, c] of lines) {
      if (b[a] && b[a] === b[b2] && b[a] === b[c]) return b[a]
    }
    return null
  }

  const computerMove = (b: Cell[]): number => {
    // محاولة الفوز
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const test = [...b]; test[i] = 'O'
        if (checkWinner(test) === 'O') return i
      }
    }
    // محاولة منع اللاعب
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const test = [...b]; test[i] = 'X'
        if (checkWinner(test) === 'X') return i
      }
    }
    // المركز
    if (!b[4]) return 4
    // زوايا
    const corners = [0,2,6,8].filter(i => !b[i])
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)]
    // أي خانة فارغة
    const empty = b.map((v, i) => v === null ? i : -1).filter(i => i !== -1)
    return empty[Math.floor(Math.random() * empty.length)]
  }

  const handleClick = (i: number) => {
    if (board[i] || checkWinner(board)) return
    const newBoard = [...board]
    newBoard[i] = 'X'
    
    const winner = checkWinner(newBoard)
    if (winner) {
      setBoard(newBoard)
      setScore(s => ({ ...s, player: s.player + 1 }))
      return
    }

    if (newBoard.every(c => c !== null)) {
      setBoard(newBoard)
      return
    }

    // دور الكمبيوتر
    setTimeout(() => {
      const comp = computerMove(newBoard)
      if (comp !== undefined && comp !== -1) {
        newBoard[comp] = 'O'
        const w = checkWinner(newBoard)
        if (w === 'O') setScore(s => ({ ...s, computer: s.computer + 1 }))
        setBoard([...newBoard])
        setIsXNext(true)
      }
    }, 500)

    setBoard(newBoard)
    setIsXNext(false)
  }

  const restart = () => {
    setBoard(Array(9).fill(null))
    setIsXNext(true)
  }

  const winner = checkWinner(board)
  const isDraw = !winner && board.every(c => c !== null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-cyan-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">⭕ إكس أو</h1>
        <div className="flex justify-around mb-4">
          <div className="text-center">
            <div className="text-2xl">🧑</div>
            <div className="font-bold">أنت (X): {score.player}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">🤖</div>
            <div className="font-bold">الكمبيوتر (O): {score.computer}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              className="aspect-square bg-gradient-to-br from-blue-200 to-cyan-200 rounded-xl text-4xl font-bold hover:scale-105 transition"
            >
              <span className={cell === 'X' ? 'text-blue-600' : 'text-red-500'}>{cell}</span>
            </button>
          ))}
        </div>

        {winner && (
          <p className="mt-4 text-2xl font-bold text-green-600">
            {winner === 'X' ? '🎉 فزت!' : '😢 الكمبيوتر فاز!'}
          </p>
        )}
        {isDraw && <p className="mt-4 text-2xl font-bold text-yellow-600">🤝 تعادل!</p>}

        {(winner || isDraw) && (
          <button onClick={restart} className="mt-4 bg-blue-500 text-white px-8 py-3 rounded-xl font-bold">
            🔄 جولة جديدة
          </button>
        )}

        <Link href="/dashboard" className="mt-4 inline-block text-gray-500 hover:text-gray-700">
          ⬅️ رجوع
        </Link>
      </div>
    </div>
  )
}