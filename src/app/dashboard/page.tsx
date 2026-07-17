'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ تم تعريف المتغير الذي كان يسبب انهيار الصفحة
  const [unlockedGamesCount, setUnlockedGamesCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // ✅ نستخدم credentials: 'include' لإرسال كوكيز الجلسة تلقائياً
        const res = await fetch('/api/user/me', {
          credentials: 'include'
        });

        if (res.status === 401 || res.status === 404) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          
          // ✅ حساب آمن لعدد الألعاب المفتوحة (يمنع الخطأ حتى لو لم تُرجع الـ API الشارات بعد)
          if (data.user.badges && Array.isArray(data.user.badges)) {
            const games = new Set();
            data.user.badges.forEach((ub: any) => {
              const unlocked = JSON.parse(ub.badge.gamesUnlocked || '[]');
              unlocked.forEach((game: string) => games.add(game));
            });
            setUnlockedGamesCount(games.size);
          } else {
            setUnlockedGamesCount(0); // قيمة افتراضية آمنة
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-2xl font-bold text-blue-600 animate-pulse">جاري تحميل لوحة التحكم...</div>
      </div>
    );
  }

  if (!user) {
    return null; // سيتم إعادة التوجيه تلقائياً عبر الـ useEffect
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        {/* بطاقة الترحيب والإحصائيات */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
          <h1 className="text-4xl font-bold text-center mb-8">🎓 مرحباً، {user.username}!</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-100 p-6 rounded-2xl text-center">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-sm text-gray-600 font-bold">المستوى الحالي</div>
              <div className="text-3xl font-bold text-blue-600">{user.playerLevel}</div>
            </div>
            <div className="bg-purple-100 p-6 rounded-2xl text-center">
              <div className="text-4xl mb-2">⭐</div>
              <div className="text-sm text-gray-600 font-bold">مجموع النقاط</div>
              <div className="text-3xl font-bold text-purple-600">{user.totalPoints}</div>
            </div>
            <div className="bg-green-100 p-6 rounded-2xl text-center">
              <div className="text-4xl mb-2">🔥</div>
              <div className="text-sm text-gray-600 font-bold">أيام الاستمرار</div>
              <div className="text-3xl font-bold text-green-600">{user.streakDays}</div>
            </div>
          </div>

          {/* قسم اختيار المواد */}
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">اختر مادة للبدء 🎮</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'الرياضيات', icon: '🔢', subject: 'math' },
              { name: 'الإيقاظ العلمي', icon: '🔬', subject: 'science' },
              { name: 'جسم الإنسان', icon: '🫀', subject: 'body' },
              { name: 'البيئة', icon: '🌿', subject: 'environment' }, // ✅ تم إصلاح الخطأ الإملائي "الب يئة"
              { name: 'العربية', icon: '📖', subject: 'arabic' },
              { name: 'الفرنسية', icon: '🇫🇷', subject: 'french' },
              { name: 'التربية الإسلامية', icon: '🕌', subject: 'islamic' },
              { name: 'التاريخ', icon: '📜', subject: 'history' }
            ].map((item) => (
              <button
                key={item.subject}
                // ✅ تم التعديل لاستخدام مستوى المستخدم الفعلي بدلاً من تثبيت المستوى 1
                onClick={() => router.push(`/game/${item.subject}?level=${user.playerLevel}`)}
                className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex flex-col items-center gap-2"
              >
                <div className="text-4xl">{item.icon}</div>
                <div className="text-lg font-bold">{item.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* قسم الإجراءات السريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <button
            onClick={() => router.push('/games')}
            className="bg-gradient-to-r from-pink-500 to-rose-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all relative flex flex-col items-center"
          >
            <div className="text-4xl mb-2">🎮</div>
            <div className="text-xl font-bold">الألعاب</div>
            {unlockedGamesCount > 0 && (
              <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-bold animate-bounce">
                {unlockedGamesCount}
              </div>
            )}
          </button>
          
          <button
            onClick={() => router.push('/mastery')}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex flex-col items-center"
          >
            <div className="text-4xl mb-2">📜</div>
            <div className="text-xl font-bold">شهاداتي</div>
          </button>
          
          <button
            onClick={() => router.push('/badges')}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex flex-col items-center"
          >
            <div className="text-4xl mb-2">🎖️</div>
            <div className="text-xl font-bold">الشارات</div>
          </button>
          
          <button
            onClick={() => router.push('/daily')}
            className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex flex-col items-center"
          >
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-xl font-bold">التحدي اليومي</div>
          </button>
        </div>

        {/* زر تسجيل الخروج */}
        <div className="mt-8 text-center">
          <button
            onClick={handleLogout}
            className="bg-red-100 text-red-600 px-8 py-3 rounded-xl font-bold hover:bg-red-200 transition-all"
          >
            🚪 تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}