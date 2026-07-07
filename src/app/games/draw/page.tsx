"use client"

import { useRef, useState } from 'react'
import Link from 'next/link'

export default function DrawGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(5)
  const [drawing, setDrawing] = useState(false)

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true)
    draw(e)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  const stopDraw = () => setDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const colors = ['#000000', '#ff0000', '#ffa500', '#ffff00', '#00ff00', '#0000ff', '#800080', '#ffffff']

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-2xl w-full text-center">
        <h1 className="text-3xl font-bold mb-2">🎨 الرسم الحر</h1>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-10 h-10 rounded-full border-4 ${color === c ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="mb-4">
          <label className="font-bold">حجم الفرشاة: {size}</label>
          <input
            type="range"
            min="1"
            max="30"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          className="border-4 border-purple-500 rounded-lg mx-auto bg-white cursor-crosshair"
        />

        <div className="mt-4 flex gap-3 justify-center">
          <button onClick={clear} className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold">
            🗑️ مسح
          </button>
        </div>

        <Link href="/dashboard" className="mt-4 inline-block text-gray-500 hover:text-gray-700">
          ⬅️ رجوع
        </Link>
      </div>
    </div>
  )
}