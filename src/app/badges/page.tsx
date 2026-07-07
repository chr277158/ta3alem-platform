'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BadgesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    console.log('🔍 Badges - userId from localStorage:', storedUserId);
    
    if (!storedUserId) {
      console.warn('⚠️ No userId found, redirecting to login');
      setTimeout(() => router.push('/login'), 100);
      return;
    }

    setUserId(storedUserId);
    loadBadges(storedUserId);
  }, [router]);

  const loadBadges = async (uid: string) => {
    try {
      console.log('📡 Fetching badges for user:', uid);
      const res = await fetch(`/api/badges?userId=${uid}`);
      const data = await res.json();
      console.log('✅ Badges loaded:', data);
      setAllBadges(data.allBadges || []);
      setEarnedBadges(data.earnedBadges || []);
    } catch (error) {
      console.error('Error loading badges:', error);
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

  const earnedBadgeIds = new Set(earnedBadges.map((b: any) => b.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">🎖️ الشارات</h1>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
          <div className="text-2xl font-bold text-green-600">
            ✅ {earnedBadges.length} / {allBadges.length} شارة مكتسبة
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allBadges.map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.id);
            const gamesUnlocked = JSON.parse(badge.gamesUnlocked || '[]');

            return (
              <div
                key={badge.id}
                className={`p-6 rounded-2xl shadow-lg transition-all ${
                  isEarned
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <div className="text-6xl text-center mb-3">{badge.icon}</div>
                <div className="text-xl font-bold text-center mb-2">{badge.displayName}</div>
                <div className="text-sm text-center mb-3 opacity-90">{badge.description}</div>
                
                {isEarned ? (
                  <div className="bg-white/20 rounded-lg p-2 text-center text-sm">
                    <div className="font-bold mb-1">🎁 الألعاب المفتوحة:</div>
                    <div>{gamesUnlocked.length} لعبة</div>
                  </div>
                ) : (
                  <div className="bg-black/20 rounded-lg p-2 text-center text-sm">
                    🔒 لم تُفتح بعد
                  </div>
                )}
              </div>
            );
          })}
        </div>

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