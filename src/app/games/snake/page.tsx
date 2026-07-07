'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function SnakeGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const GRID_SIZE = 20;
  const CELL_SIZE = 20;
  const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let snake = [{ x: 10, y: 10 }];
    let food = { x: 15, y: 15 };
    let dx = 1;
    let dy = 0;

    const generateFood = () => {
      food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    };

    const draw = () => {
      // خلفية
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // الطعام
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);

      // الثعبان
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#4ecdc4' : '#45b7aa';
        ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);
      });
    };

    const move = () => {
      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // التحقق من الاصطدام بالجدران
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        return;
      }

      // التحقق من الاصطدام بالجسم
      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        return;
      }

      snake.unshift(head);

      // التحقق من أكل الطعام
      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 10);
        generateFood();
      } else {
        snake.pop();
      }

      draw();
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (dy === 0) { dx = 0; dy = -1; }
          break;
        case 'ArrowDown':
          if (dy === 0) { dx = 0; dy = 1; }
          break;
        case 'ArrowLeft':
          if (dx === 0) { dx = -1; dy = 0; }
          break;
        case 'ArrowRight':
          if (dx === 0) { dx = 1; dy = 0; }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    const interval = setInterval(move, 150);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(interval);
    };
  }, [isPlaying, gameOver]);

  const startGame = () => {
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-4xl font-bold text-center mb-6">🐍 لعبة الثعبان</h1>
          
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-blue-600">النقاط: {score}</div>
          </div>

          <div className="flex justify-center mb-6">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="border-4 border-purple-500 rounded-lg"
            />
          </div>

          {!isPlaying && !gameOver && (
            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-xl font-bold text-xl hover:from-green-600 hover:to-teal-700 transition-all"
            >
              🎮 ابدأ اللعبة
            </button>
          )}

          {gameOver && (
            <div className="text-center">
              <div className="text-3xl font-bold mb-4">انتهت اللعبة!</div>
              <div className="text-2xl mb-6">النقاط النهائية: {score}</div>
              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all mb-3"
              >
                🔄 العب مرة أخرى
              </button>
              <button
                onClick={() => router.push('/games')}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
              >
                🏠 العودة للألعاب
              </button>
            </div>
          )}

          {isPlaying && !gameOver && (
            <div className="text-center text-gray-600">
              استخدم أسهم لوحة المفاتيح للتحكم
            </div>
          )}
        </div>
      </div>
    </div>
  );
}