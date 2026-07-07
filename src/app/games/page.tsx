'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ALL_GAMES = [
  { id: 'snake', name: 'الثعبان', icon: '🐍', color: 'from-green-400 to-green-600' },
  { id: 'memory', name: 'الذاكرة', icon: '🧠', color: 'from-purple-400 to-purple-600' },
  { id: 'tictactoe', name: 'إكس أو', icon: '⭕', color: 'from-blue-400 to-blue-600' },
  { id: 'whack', name: 'اضرب الخلد', icon: '🎯', color: 'from-yellow-400 to-yellow-600' },
  { id: '2048', name: '2048', icon: '🔢', color: 'from-orange-400 to-orange-600' },
  { id: 'rps', name: 'حجر ورقة مقص', icon: '✂️', color: 'from-pink-400 to-pink-600' },
  { id: 'hangman', name: 'تخمين الكلمة', icon: '📝', color: 'from-indigo-400 to-indigo-600' },
  { id: 'simon', name: 'سايمون', icon: '🎵', color: 'from-red-400 to-red-600' },
  { id: 'pong', name: 'بينج بونج', icon: '🏓', color: 'from-teal-400 to-teal-600' },
  { id: 'breakout', name: 'Breakout', icon: '🧱', color: 'from-cyan-400 to-cyan-600' },
  { id: 'maze', name: 'المتاهة', icon: '🏰', color: 'from-violet-400 to-violet-600' },
  { id: 'draw', name: 'الرسم', icon: '🎨', color: 'from-rose-400 to-rose-600' },
  { id: 'puzzle', name: 'البازل', icon: '🧩', color: 'from-amber-400 to-amber-600' },
  { id: 'quiz', name: 'الكويز', icon: '❓', color: 'from-lime-400 to-lime-600' }
];

export default function GamesPage() {
  const router = useRouter();
  const [unlockedGames, setUnlockedGames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }
    loadGames(userId);
  }, [router]);

  const loadGames = async (userId: string) => {
    try {
      const res = await fetch(`/api/badges?userId=${userId}`);
      const data = await res.json();
      setUnlockedGames(data.unlockedGames || []);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">🎮 الألعاب</h1>

        {unlockedGames.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-4">لا توجد ألعاب مفتوحة بعد</h2>
            <p className="text-gray-600 mb-6">
              أكمل مستويات المواد التعليمية لفتح الألعاب!
            </p>
            <button
              onClick={() => router.push('/mastery')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              📜 عرض الشهادات
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                ✅ {unlockedGames.length} / {ALL_GAMES.length} لعبة مفتوحة
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {ALL_GAMES.map((game) => {
                const isUnlocked = unlockedGames.includes(game.id);
                
                return (
                  <button
                    key={game.id}
                    onClick={() => isUnlocked && router.push(`/games/${game.id}`)}
                    disabled={!isUnlocked}
                    className={`relative p-6 rounded-2xl shadow-lg transition-all transform ${
                      isUnlocked
                        ? `bg-gradient-to-br ${game.color} text-white hover:scale-105 hover:shadow-xl cursor-pointer`
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                        <div className="text-5xl">🔒</div>
                      </div>
                    )}
                    
                    <div className="text-6xl mb-3">{game.icon}</div>
                    <div className="text-xl font-bold">{game.name}</div>
                    
                    {isUnlocked && (
                      <div className="mt-2 text-sm opacity-90">اضغط للعب</div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
          >
            🏠 العودة للرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}