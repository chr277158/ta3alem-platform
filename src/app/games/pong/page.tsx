"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState({ player: 0, computer: 0 })
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!started) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 500, H = 350
    let playerY = H/2 - 40, compY = H/2 - 40
    let ballX = W/2, ballY = H/2
    let ballVX = 4, ballVY = 3
    const paddleH = 80, paddleW = 10
    let mouseY = H/2

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseY = e.clientY - rect.top
    }
    canvas.addEventListener('mousemove', handleMove)

    const loop = () => {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, W, H)

      // تحديث المضرب
      playerY = mouseY - paddleH/2
      playerY = Math.max(0, Math.min(H - paddleH, playerY))

      // الكمبيوتر يتبع الكرة
      const compCenter = compY + paddleH/2
      if (compCenter < ballY - 10) compY += 3
      else if (compCenter > ballY + 10) compY -= 3

      // الكرة
      ballX += ballVX
      ballY += ballVY

      if (ballY <= 0 || ballY >= H) ballVY *= -1

      // اصطدام بالمضارب
      if (ballX <= paddleW && ballY >= playerY && ballY <= playerY + paddleH) {
        ballVX *= -1.05
      }
      if (ballX >= W - paddleW && ballY >= compY && ballY <= compY + paddleH) {
        ballVX *= -1.05
      }

      // تسجيل النقاط
      if (ballX < 0) {
        setScore(s => ({ ...s, computer: s.computer + 1 }))
        ballX = W/2; ballY = H/2; ballVX = 4; ballVY = 3
      }
      if (ballX > W) {
        setScore(s => ({ ...s, player: s.player + 1 }))
        ballX = W/2; ballY = H/2; ballVX = -4; ballVY = 3
      }

      // الرسم
      ctx.fillStyle = '#4ecdc4'
      ctx.fillRect(0, playerY, paddleW, paddleH)
      ctx.fillStyle = '#ff6b6b'
      ctx.fillRect(W - paddleW, compY, paddleW, paddleH)
      ctx.fillStyle = '#ffe66d'
      ctx.beginPath()
      ctx.arc(ballX, ballY, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    const interval = setInterval(loop, 1000/60)
    return () => {
      clearInterval(interval)
      canvas.removeEventListener('mousemove', handleMove)
    }
  }, [started])

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 to-blue-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">🏓 بينج بونج</h1>
        <div className="flex justify-around mb-4 text-xl font-bold">
          <div>🧑 {score.player}</div>
          <div>🤖 {score.computer}</div>
        </div>

        <canvas
          ref={canvasRef}
          width={500}
          height={350}
          className="border-4 border-blue-500 rounded-lg mx-auto bg-gray-900 cursor-none"
        />

        {!started && (
          <button onClick={() => setStarted(true)} className="mt-4 bg-blue-500 text-white px-8 py-3 rounded-xl font-bold">
            ▶️ ابدأ
          </button>
        )}

        <p className="mt-2 text-sm text-gray-600">حرّك الفأرة للتحكم بالمضرب</p>

        <Link href="/dashboard" className="mt-4 inline-block text-gray-500 hover:text-gray-700">
          ⬅️ رجوع
        </Link>
      </div>
    </div>
  )
}