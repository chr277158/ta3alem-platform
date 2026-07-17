'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CertificateCard from '@/components/CertificateCard';

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

const LEVELS_INFO = [
  { level: 1, name: 'المبتدئ', games: ['snake', 'memory'] },
  { level: 2, name: 'المتعلم', games: ['tictactoe', 'whack'] },
  { level: 3, name: 'المجتهد', games: ['rps', 'hangman'] },
  { level: 4, name: 'المتفوق', games: ['simon', 'pong'] },
  { level: 5, name: 'العبقري', games: ['snake', 'memory', 'tictactoe', 'whack', 'rps', 'hangman', 'simon', 'pong'] }
];

export default function MasteryPage() {
  const router = useRouter();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [progress, setProgress] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [router]);

  const loadProgress = async () => {
    try {
      const res = await fetch('/api/mastery/progress', {
        credentials: 'include' // ✅ إرسال الكوكيز تلقائياً
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

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
    return progress[key] || { mastered: false, bestScore: 0, attempts: 0 };
  };

  const getLevelProgress = (level: number) => {
    let mastered = 0;
    SUBJECTS.forEach(sub => {
      if (getSubjectStatus(sub.key, level).mastered) mastered++;
    });
    return mastered;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-2xl font-bold text-blue-600 animate-pulse">جاري تحميل شهاداتك...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10 no-print">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📜 سجل شهادات الإتقان</h1>
          <p className="text-gray-600">أكمل جميع المواد في كل مستوى للحصول على شهادتك وطباعتها!</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-300 transition-all">
            🏠 العودة للرئيسية
          </button>
        </div>

        <div className="space-y-12">
          {LEVELS_INFO.map((info) => {
            const masteredCount = getLevelProgress(info.level);
            const isUnlocked = info.level <= currentLevel;
            const isComplete = masteredCount === 8;
            return (
              <div key={info.level} className="scroll-mt-20">
                {!isComplete && isUnlocked && (
                  <div className="bg-white rounded-xl p-4 mb-6 shadow-md no-print">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-700">تقدم المستوى {info.level}</span>
                      <span className="text-blue-600 font-bold">{masteredCount}/8 مواد مُتقنة</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full transition-all duration-700" style={{ width: `${(masteredCount / 8) * 100}%` }}></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {SUBJECTS.map(sub => {
                        const status = getSubjectStatus(sub.key, info.level);
                        return (
                          <div key={sub.key} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${status.mastered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {sub.icon} {sub.name} {status.mastered ? '✅' : `(${status.bestScore}/5)`}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <CertificateCard
                  level={info.level}
                  levelName={`شهادة ${info.name}`}
                  isUnlocked={isUnlocked}
                  masteredCount={masteredCount}
                  gamesUnlocked={info.games}
                />
              </div>
            );
          })}
          {currentLevel > 5 && (
            <div className="mt-12">
              <CertificateCard
                level={0}
                levelName="🏆 شهادة البطل الشامل"
                isUnlocked={true}
                masteredCount={40}
                gamesUnlocked={['snake', 'memory', 'tictactoe', 'whack', 'rps', 'hangman', 'simon', 'pong']}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}