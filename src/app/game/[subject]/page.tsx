'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CelebrationModal from '@/components/CelebrationModal';
import { playSound } from '@/lib/sounds';
import Companion3D from '@/components/Companion3D';
interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function GamePage({ params }: { params: Promise<{ subject: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subject } = use(params);
  const level = parseInt(searchParams.get('level') || '1');
  const [companionMood, setCompanionMood] = useState<'happy' | 'neutral' | 'sad'>('neutral');
const [userAvatar, setUserAvatar] = useState('robot');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [newBadges, setNewBadges] = useState<any[]>([]);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ استخدام useRef لتتبع القيم الحالية
  const scoreRef = useRef(0);
  const heartsRef = useRef(3);

  useEffect(() => {
  const fetchUserData = async () => {
    const userId = localStorage.getItem('userId');
    const storedAvatar = localStorage.getItem('userAvatar');
    if (storedAvatar) setUserAvatar(storedAvatar);
    
    if (userId) {
      try {
        const res = await fetch(`/api/user/data?userId=${userId}`); // (تحتاج لإنشاء هذا الـ API البسيط أو تعديله)
        // أو ببساطة استخدم localStorage إذا حفظته عند التسجيل
      } catch (e) {}
    }
  };
  fetchUserData();
}, []);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, level]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = localStorage.getItem('userId');
      console.log('🔍 Loading questions - userId:', userId, 'subject:', subject, 'level:', level);
      
      if (!userId) {
        console.warn('⚠️ No userId found in localStorage');
        setError('يجب تسجيل الدخول أولاً');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      const url = `/api/game/questions?subject=${subject}&level=${level}&userId=${userId}`;
      console.log('📡 Fetching:', url);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('✅ Questions loaded:', data);

      if (!data.questions || data.questions.length === 0) {
        setError('لا توجد أسئلة متاحة لهذا المستوى');
        setLoading(false);
        return;
      }

      setQuestions(data.questions);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading questions:', error);
      setError(`فشل تحميل الأسئلة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      setLoading(false);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (showExplanation) return;

    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    const isCorrect = answerIndex === questions[currentQuestion].correctAnswer;

    if (isCorrect) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setCompanionMood('happy'); // 😃 الشخصية تفرح
      playSound('correct');
    } else {
      heartsRef.current -= 1;
      setHearts(heartsRef.current);
      setCompanionMood('sad'); // 😢 الشخصية تحزن
      playSound('wrong');
    }

    // الانتقال للسؤال التالي بعد 3 ثواني
    setTimeout(() => {
      setCompanionMood('neutral'); // 😐 العودة للوضع الطبيعي
      if (currentQuestion < questions.length - 1 && heartsRef.current > 0) {
        setCurrentQuestion(currentQuestion + 1);
        setShowExplanation(false);
        setSelectedAnswer(null);
      } else {
        finishGame(scoreRef.current);
      }
    }, 3000);
  };

  const finishGame = async (finalScore: number) => {
    console.log(`🏁 Finishing game with score: ${finalScore}/5`);
    setGameOver(true);
    
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const res = await fetch('/api/game/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject,
          level,
          score: finalScore,  // ✅ استخدام finalScore
          totalQuestions: questions.length,
          heartsLost: 3 - heartsRef.current,
          hintsUsed: 0
        })
      });

      const data = await res.json();
      console.log('✅ Game finished:', data);
      
      if (data.newBadges && data.newBadges.length > 0) {
        setNewBadges(data.newBadges);
        setPointsEarned(data.pointsEarned);
        setShowCelebration(true);
        playSound('achievement');
      }
    } catch (error) {
      console.error('Error finishing game:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl animate-pulse">جاري تحميل الأسئلة...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">حدث خطأ</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                loadQuestions();
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
            >
              🔄 إعادة المحاولة
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300"
            >
              🏠 العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-bounce-in">
          <div className="text-6xl mb-4">
            {scoreRef.current === 5 ? '🏆' : scoreRef.current >= 3 ? '🎉' : '💪'}
          </div>
          <h2 className="text-3xl font-bold mb-4">
            {scoreRef.current === 5 ? 'ممتاز!' : scoreRef.current >= 3 ? 'أحسنت!' : 'حاول مرة أخرى'}
          </h2>
          <div className="text-5xl font-bold text-blue-600 mb-2">
            {scoreRef.current}/{questions.length}
          </div>
          <p className="text-gray-600 mb-6">
            {scoreRef.current === 5 ? 'لقد أتقنت هذه المادة!' : 'استمر في المحاولة'}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/mastery')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              📜 عرض الشهادات
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              🏠 العودة للرئيسية
            </button>
          </div>
        </div>

        <CelebrationModal
          isOpen={showCelebration}
          onClose={() => setShowCelebration(false)}
          badges={newBadges}
          pointsEarned={pointsEarned}
        />
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto relative">
        <div className="absolute -top-4 left-4 z-20">
          <Companion3D avatarType={userAvatar} mood={companionMood} />
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`text-3xl ${i < heartsRef.current ? '' : 'opacity-30'}`}>
                  ❤️
                </span>
              ))}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {scoreRef.current}/{questions.length}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 animate-fadeInUp">
          <div className="text-sm text-gray-500 mb-2">
            السؤال {currentQuestion + 1} من {questions.length}
          </div>
          <h2 className="text-2xl font-bold mb-6">{question.question}</h2>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correctAnswer;
              
              let buttonClass = 'bg-gray-100 hover:bg-gray-200';
              
              if (showExplanation) {
                if (isCorrect) {
                  buttonClass = 'bg-green-500 text-white';
                } else if (isSelected && !isCorrect) {
                  buttonClass = 'bg-red-500 text-white';
                } else {
                  buttonClass = 'bg-gray-100 opacity-50';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={showExplanation}
                  className={`w-full p-4 rounded-xl font-bold text-right transition-all ${buttonClass}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {showExplanation && (
          <div className="bg-blue-50 border-2 border-blue-500 rounded-2xl p-6 animate-fadeInUp">
            <div className="flex items-start gap-3">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="font-bold text-lg mb-2">الشرح:</h3>
                <p className="text-gray-700">{question.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}