"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [started, setStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  useEffect(() => {
    if (!started) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 500, H = 400
    let paddleX = W/2 - 40
    let ballX = W/2, ballY = H - 50
    let ballVX = 3, ballVY = -3
    const paddleW = 80, paddleH = 10
    const brickRows = 5, brickCols = 8
    const brickW = 55, brickH = 20, brickPad = 5
    const bricks: boolean[][] = Array(brickRows).fill(null).map(() => Array(brickCols).fill(true))
    let score = 0
    let mouseX = W/2

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
    }
    canvas.addEventListener('mousemove', handleMove)

    const loop = () => {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, W, H)

      paddleX = mouseX - paddleW/2
      paddleX = Math.max(0, Math.min(W - paddleW, paddleX))

      ballX += ballVX
      ballY += ballVY

      if (ballX <= 0 || ballX >= W) ballVX *= -1
      if (ballY <= 0) ballVY *= -1

      // اصطدام بالمضرب
      if (ballY >= H - paddleH - 10 && ballX >= paddleX && ballX <= paddleX + paddleW) {
        ballVY *= -1
        ballY = H - paddleH - 11
      }

      // سقوط الكرة
      if (ballY > H) {
        setGameOver(true)
        return
      }

      // اصطدام بالطوب
      for (let r = 0; r < brickRows; r++) {
        for (let c = 0; c < brickCols; c++) {
          if (!bricks[r][c]) continue
          const bx = c * (brickW + brickPad) + 20
          const by = r * (brickH + brickPad) + 30
          if (ballX >= bx && ballX <= bx + brickW && ballY >= by && ballY <= by + brickH) {
            bricks[r][c] = false
            ballVY *= -1
            score += 10
            setScore(score)
          }
        }
      }

      // رسم الطوب
      const colors = ['#ff6b6b', '#ffa500', '#ffe66d', '#4ecdc4', '#a8edea']
      for (let r = 0; r < brickRows; r++) {
        for (let c = 0; c < brickCols; c++) {
          if (!bricks[r][c]) continue
          ctx.fillStyle = colors[r]
          ctx.fillRect(c * (brickW + brickPad) + 20, r * (brickH + brickPad) + 30, brickW, brickH)
        }
      }

      // رسم المضرب والكرة
      ctx.fillStyle = '#4ecdc4'
      ctx.fillRect(paddleX, H - paddleH - 10, paddleW, paddleH)
      ctx.fillStyle = '#ffe66d'
      ctx.beginPath()
      ctx.arc(ballX, ballY, 8, 0, Math.PI * 2)
      ctx.fill()

      // فوز؟
      if (bricks.every(row => row.every(b => !b))) {
        setGameOver(true)
        return
      }
    }

    const interval = setInterval(loop, 1000/60)
    return () => {
      clearInterval(interval)
      canvas.removeEventListener('mousemove', handleMove)
    }
  }, [started])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 to-orange-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">🧱 Breakout</h1>
        <p className="text-xl font-bold mb-4">⭐ {score}</p>

        <canvas
          ref={canvasRef}
          width={500}
          height={400}
          className="border-4 border-red-500 rounded-lg mx-auto bg-gray-900 cursor-none"
        />

        {!started && (
          <button onClick={() => setStarted(true)} className="mt-4 bg-red-500 text-white px-8 py-3 rounded-xl font-bold">
            ▶️ ابدأ
          </button>
        )}

        {gameOver && (
          <p className="mt-4 text-2xl font-bold text-green-600">انتهت اللعبة! نتيجتك: {score}</p>
        )}

        <Link href="/dashboard" className="mt-4 inline-block text-gray-500 hover:text-gray-700">
          ⬅️ رجوع
        </Link>
      </div>
    </div>
  )
}