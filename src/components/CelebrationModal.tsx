'use client';

import { useEffect, useState } from 'react';
import Confetti from './Confetti'; // ← استيراد المكون المخصص

interface Badge {
  displayName: string;
  icon: string;
  gamesUnlocked: string;
}

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[];
  pointsEarned?: number;
}

const GAME_NAMES: Record<string, string> = {
  snake: '🐍 الثعبان',
  memory: '🧠 الذاكرة',
  tictactoe: '⭕ إكس أو',
  whack: '🎯 اضرب الخلد',
  '2048': '🔢 2048',
  rps: '✂️ حجر ورقة مقص',
  hangman: '📝 تخمين الكلمة',
  simon: '🎵 سايمون',
  pong: '🏓 بينج بونج',
  breakout: '🧱 Breakout',
  maze: '🏰 المتاهة',
  draw: '🎨 الرسم',
  puzzle: '🧩 البازل',
  quiz: '❓ الكويز'
};

export default function CelebrationModal({ 
  isOpen, 
  onClose, 
  badges,
  pointsEarned = 0 
}: CelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      setAnimationStep(0);
      
      // تسلسل حركي
      setTimeout(() => setAnimationStep(1), 100);
      setTimeout(() => setAnimationStep(2), 600);
      setTimeout(() => setAnimationStep(3), 1200);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const gamesUnlocked: string[] = [];
  badges.forEach(badge => {
    const games = JSON.parse(badge.gamesUnlocked);
    gamesUnlocked.push(...games);
  });

  return (
    <>
      {showConfetti && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          numberOfPieces={400}
          gravity={0.3}
          recycle={false}
        />
      )}

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div 
          className={`bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden transition-all duration-700 ${
            animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          {/* Header مع تأثير التوهج */}
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            <div className="relative z-10">
              <div 
                className={`text-8xl mb-4 transition-all duration-500 ${
                  animationStep >= 2 ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
                }`}
              >
                🎉
              </div>
              <h2 className="text-4xl font-bold text-white mb-2">مبروك!</h2>
              <p className="text-white/90 text-lg">لقد حققت إنجازاً رائعاً</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* الشارات المكتسبة */}
            <div 
              className={`mb-6 transition-all duration-700 delay-300 ${
                animationStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
            >
              <h3 className="text-2xl font-bold mb-4 text-center">🏆 الشهادات المكتسبة</h3>
              <div className="space-y-3">
                {badges.map((badge, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 flex items-center gap-4 animate-bounce"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <div className="text-5xl">{badge.icon}</div>
                    <div className="flex-1">
                      <div className="font-bold text-xl">{badge.displayName}</div>
                      <div className="text-sm text-gray-600">
                        تم فتح: {JSON.parse(badge.gamesUnlocked).map(g => GAME_NAMES[g]).join(' + ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* النقاط المكتسبة */}
            {pointsEarned > 0 && (
              <div 
                className={`bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl p-4 mb-6 text-center transition-all duration-700 delay-500 ${
                  animationStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
              >
                <div className="text-3xl font-bold text-blue-600">+{pointsEarned} نقطة</div>
                <div className="text-sm text-gray-600">نقاط مكتسبة</div>
              </div>
            )}

            {/* الألعاب المفتوحة */}
            <div 
              className={`bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 mb-6 transition-all duration-700 delay-700 ${
                animationStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
            >
              <h4 className="font-bold text-lg mb-3 text-center">🎮 الألعاب الجديدة</h4>
              <div className="grid grid-cols-2 gap-3">
                {gamesUnlocked.map((game, index) => (
                  <div
                    key={game}
                    className="bg-white rounded-lg p-3 text-center shadow-md hover:scale-105 transition-transform"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="text-2xl mb-1">{GAME_NAMES[game]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* زر الإغلاق */}
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg"
            >
              🚀 متابعة المغامرة
            </button>
          </div>
        </div>
      </div>
    </>
  );
}