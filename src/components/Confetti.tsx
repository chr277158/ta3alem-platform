'use client';

import { useEffect, useRef } from 'react';

interface ConfettiProps {
  width: number;
  height: number;
  numberOfPieces?: number;
  gravity?: number;
  recycle?: boolean;
  colors?: string[];
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'square' | 'circle' | 'triangle';
}

export default function Confetti({
  width,
  height,
  numberOfPieces = 300,
  gravity = 0.3,
  recycle = false,
  colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
            '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', 
            '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722']
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // إنشاء الجسيمات
    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * -height,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: (Math.random() - 0.5) * 4,
      speedY: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      shape: ['square', 'circle', 'triangle'][Math.floor(Math.random() * 3)] as any
    });

    particlesRef.current = Array.from({ length: numberOfPieces }, createParticle);

    let startTime = Date.now();
    const duration = 5000; // 5 ثواني

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      particlesRef.current.forEach((p, i) => {
        // تحديث الموقع
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += gravity * 0.1;
        p.rotation += p.rotationSpeed;

        // إعادة تعيين إذا recycle
        if (recycle && p.y > height) {
          particlesRef.current[i] = createParticle();
          return;
        }

        // رسم الجسيم
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 1 - progress * 0.5;

        if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [width, height, numberOfPieces, gravity, recycle, colors]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width, height }}
    />
  );
}