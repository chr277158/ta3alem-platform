'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlockedGamesCount, setUnlockedGamesCount] = useState(0);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    console.log('🔍 Dashboard - userId from localStorage:', storedUserId);
    
    if (!storedUserId) {
      console.warn('⚠️ No userId found, redirecting to login');
      router.push('/login');
      return;
    }

    setUserId(storedUserId);
    loadUnlockedGames(storedUserId);
    setLoading(false);
  }, [router]);

  const loadUnlockedGames = async (uid: string) => {
    try {
      const res = await fetch(`/api/badges?userId=${uid}`);
      const data = await res.json();
      setUnlockedGamesCount(data.unlockedGames?.length || 0);
    } catch (error) {
      console.error('Error loading games:', error);
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
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
          <h1 className="text-4xl font-bold text-center mb-8">🎓 لوحة التحكم</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'الحساب', icon: '🔢', subject: 'math' },
              { name: 'الإيقاظ العلمي', icon: '🔬', subject: 'science' },
              { name: 'جسم الإنسان', icon: '🫀', subject: 'body' },
              { name: 'البيئة', icon: '🌿', subject: 'environment' },
              { name: 'العربية', icon: '📖', subject: 'arabic' },
              { name: 'الفرنسية', icon: '🇫🇷', subject: 'french' },
              { name: 'التربية الإسلامية', icon: '🕌', subject: 'islamic' },
              { name: 'التاريخ', icon: '📜', subject: 'history' }
            ].map((item) => (
              <button
                key={item.subject}
                onClick={() => router.push(`/game/${item.subject}?level=1`)}
                className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                <div className="text-5xl mb-3">{item.icon}</div>
                <div className="text-xl font-bold">{item.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <button
            onClick={() => router.push('/games')}
            className="bg-gradient-to-r from-pink-500 to-rose-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all relative"
          >
            <div className="text-4xl mb-2">🎮</div>
            <div className="text-xl font-bold">الألعاب</div>
            {unlockedGamesCount > 0 && (
              <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-bold">
                {unlockedGamesCount}
              </div>
            )}
          </button>

          <button
            onClick={() => router.push('/mastery')}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            <div className="text-4xl mb-2">📜</div>
            <div className="text-xl font-bold">شهاداتي</div>
          </button>

          <button
            onClick={() => router.push('/badges')}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            <div className="text-4xl mb-2">🎖️</div>
            <div className="text-xl font-bold">الشارات</div>
          </button>

          <button
            onClick={() => router.push('/daily')}
            className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-xl font-bold">التحدي اليومي</div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              localStorage.removeItem('userId');
              localStorage.removeItem('username');
              router.push('/login');
            }}
            className="bg-red-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-600 transition-all"
          >
            🚪 تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}