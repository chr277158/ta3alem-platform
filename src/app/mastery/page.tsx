'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SUBJECTS = [
  { key: 'math', name: 'الحساب', icon: '🔢' },
  { key: 'science', name: 'الإيقاظ العلمي', icon: '🔬' },
  { key: 'body', name: 'جسم الإنسان', icon: '🫀' },
  { key: 'environment', name: 'البيئة', icon: '🌿' },
  { key: 'arabic', name: 'العربية', icon: '📖' },
  { key: 'french', name: 'الفرنسية', icon: '🇫🇷' },
  { key: 'islamic', name: 'التربية الإسلامية', icon: '🕌' },
  { key: 'history', name: 'التاريخ', icon: '📜' }
];

export default function MasteryPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [progress, setProgress] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/login');
      return;
    }
    setUserId(storedUserId);
    loadProgress(storedUserId);
  }, [router]);

  const loadProgress = async (uid: string) => {
    try {
      const res = await fetch(`/api/mastery/progress?userId=${uid}`);
      const data = await res.json();
      setProgress(data.progress || {});
      setCurrentLevel(data.currentLevel || 1);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectStatus = (subject: string, level: number) => {
    const key = `${subject}_${level}`;
    const data = progress[key];
    if (!data) return { mastered: false, bestScore: 0, attempts: 0 };
    return data;
  };

  const getLevelProgress = (level: number) => {
    let mastered = 0;
    SUBJECTS.forEach(sub => {
      const status = getSubjectStatus(sub.key, level);
      if (status.mastered) mastered++;
    });
    return mastered;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">📜 شهادات الإتقان</h1>

        {/* المستوى الحالي */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-6xl mb-2">🎓</div>
            <div className="text-2xl font-bold">المستوى الحالي: {currentLevel}</div>
            <div className="text-gray-600 mt-2">
              {currentLevel <= 5 
                ? `أكمل جميع مواد المستوى ${currentLevel} للانتقال للمستوى التالي`
                : '🏆 لقد أكملت جميع المستويات!'}
            </div>
          </div>
        </div>

        {/* عرض المستويات */}
        {[1, 2, 3, 4, 5].map(level => {
          const isUnlocked = level <= currentLevel;
          const masteredCount = getLevelProgress(level);
          const isComplete = masteredCount === 8;

          return (
            <div 
              key={level}
              className={`bg-white rounded-2xl shadow-lg p-6 mb-6 ${!isUnlocked ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {level === 1 && '📜 شهادة المبتدئ'}
                  {level === 2 && '📜 شهادة المتعلم'}
                  {level === 3 && '📜 شهادة المجتهد'}
                  {level === 4 && '📜 شهادة المتفوق'}
                  {level === 5 && '📜 شهادة العبقري'}
                </h2>
                <div className="text-lg font-bold text-blue-600">
                  {masteredCount}/8
                </div>
              </div>

              {!isUnlocked && (
                <div className="text-center text-gray-500 py-4">
                  🔒 أكمل المستوى {level - 1} أولاً
                </div>
              )}

              {isUnlocked && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {SUBJECTS.map(subject => {
                      const status = getSubjectStatus(subject.key, level);
                      return (
                        <div
                          key={subject.key}
                          className={`p-4 rounded-xl border-2 ${
                            status.mastered 
                              ? 'bg-green-50 border-green-500' 
                              : status.attempts > 0
                              ? 'bg-yellow-50 border-yellow-500'
                              : 'bg-gray-50 border-gray-300'
                          }`}
                        >
                          <div className="text-3xl text-center mb-2">{subject.icon}</div>
                          <div className="text-center font-bold text-sm">{subject.name}</div>
                          <div className="text-center text-xs mt-1">
                            {status.mastered ? (
                              <span className="text-green-600">✅ مُتقن</span>
                            ) : status.attempts > 0 ? (
                              <span className="text-yellow-600">أفضل: {status.bestScore}/5</span>
                            ) : (
                              <span className="text-gray-500">لم يبدأ</span>
                            )}
                          </div>
                          {status.attempts > 0 && !status.mastered && (
                            <button
                              onClick={() => router.push(`/game/${subject.key}?level=${level}`)}
                              className="w-full mt-2 bg-blue-500 text-white py-1 rounded-lg text-xs hover:bg-blue-600"
                            >
                              إعادة المحاولة
                            </button>
                          )}
                          {!status.mastered && status.attempts === 0 && (
                            <button
                              onClick={() => router.push(`/game/${subject.key}?level=${level}`)}
                              className="w-full mt-2 bg-green-500 text-white py-1 rounded-lg text-xs hover:bg-green-600"
                            >
                              ابدأ
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isComplete && (
                    <div className="text-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl">
                      <div className="text-2xl font-bold">🎉 مبروك!</div>
                      <div>لقد حصلت على شهادة المستوى {level}</div>
                      <div className="text-sm mt-2">
                        {level === 1 && '🎁 المكافأة: 🐍 الثعبان + 🧠 الذاكرة'}
                        {level === 2 && '🎁 المكافأة: ⭕ XO + 🎯 اضرب الخلد'}
                        {level === 3 && '🎁 المكافأة: 🔢 2048 + ✂️ حجر ورقة مقص'}
                        {level === 4 && '🎁 المكافأة: 📝 تخمين الكلمة + 🎵 سايمون'}
                        {level === 5 && '🎁 المكافأة: 🏓 بونج + 🧱 Breakout'}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* البطل الشامل */}
        {currentLevel > 5 && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold mb-2">البطل الشامل</h2>
            <p className="text-xl">لقد أتقنت جميع المواد في جميع المستويات!</p>
            <div className="mt-4 text-lg">
              🎁 المكافأة: 🏰 المتاهة + 🎨 الرسم + 🧩 البازل + ❓ الكويز
            </div>
          </div>
        )}

        {/* زر العودة */}
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