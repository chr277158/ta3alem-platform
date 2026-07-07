'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function DailyChallengePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  const scoreRef = useRef(0);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    console.log('🔍 Daily - userId from localStorage:', storedUserId);
    
    if (!storedUserId) {
      console.warn('⚠️ No userId found, redirecting to login');
      setTimeout(() => router.push('/login'), 100);
      return;
    }

    setUserId(storedUserId);
    loadDailyChallenge(storedUserId);
  }, [router]);

  const loadDailyChallenge = async (uid: string) => {
    try {
      console.log('📡 Fetching daily challenge for user:', uid);
      const res = await fetch(`/api/daily?userId=${uid}`);
      const data = await res.json();
      console.log('✅ Daily challenge loaded:', data);
      
      if (data.completed) {
        setAlreadyCompleted(true);
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Error loading daily challenge:', error);
      setError('فشل في تحميل التحدي اليومي');
    } finally {
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
      console.log(`✅ Correct! Score: ${scoreRef.current}/3`);
      playSound('correct');
    } else {
      console.log(`❌ Wrong!`);
      playSound('wrong');
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setShowExplanation(false);
        setSelectedAnswer(null);
      } else {
        finishDailyChallenge(scoreRef.current);
      }
    }, 3000);
  };

  const finishDailyChallenge = async (finalScore: number) => {
    console.log(`🏁 Finishing daily challenge with score: ${finalScore}/3`);
    setGameOver(true);
    
    try {
      const res = await fetch('/api/daily/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          score: finalScore,
          totalQuestions: questions.length
        })
      });

      const data = await res.json();
      console.log('✅ Daily challenge finished:', data);
    } catch (error) {
      console.error('Error finishing daily challenge:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  if (alreadyCompleted || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{alreadyCompleted ? '✅' : '⚠️'}</div>
          <h2 className="text-2xl font-bold mb-4">
            {alreadyCompleted ? 'أكملت التحدي اليوم!' : 'حدث خطأ'}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            🏠 العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-bounce-in">
          <div className="text-6xl mb-4">
            {scoreRef.current === 3 ? '🏆' : scoreRef.current >= 2 ? '🎉' : '💪'}
          </div>
          <h2 className="text-3xl font-bold mb-4">
            {scoreRef.current === 3 ? 'ممتاز!' : scoreRef.current >= 2 ? 'أحسنت!' : 'حاول مرة أخرى'}
          </h2>
          <div className="text-5xl font-bold text-blue-600 mb-2">
            {scoreRef.current}/{questions.length}
          </div>
          <p className="text-gray-600 mb-6">
            {scoreRef.current === 3 ? 'لقد أكملت التحدي اليومي بنجاح!' : 'عد غداً لمحاولة جديدة'}
          </p>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            🏠 العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold mb-4">لا توجد أسئلة متاحة</h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300"
          >
            🏠 العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🎯</div>
            <h1 className="text-2xl font-bold">التحدي اليومي</h1>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-bold text-gray-600">
              السؤال {currentQuestion + 1} من {questions.length}
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