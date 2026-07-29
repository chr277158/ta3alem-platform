'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGameCompanion } from '@/hooks/useGameCompanion';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const subject = params.subject as string;
  const companion = useGameCompanion();

  const [user, setUser] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const scoreRef = useRef(score);
  const heartsRef = useRef(hearts);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    heartsRef.current = hearts;
  }, [hearts]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/user/me', { credentials: 'include' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          await fetchQuestions();
        }
      } catch (error) {
        console.error('خطأ في التحقق:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`/api/game/questions?subject=${subject}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
      setLoading(false);
    } catch (error) {
      console.error('خطأ في جلب الأسئلة:', error);
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (selectedAnswer) return;

    setSelectedAnswer(answer);
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;

    if (isCorrect) {
      setScore((prev) => prev + 10);
      companion.celebrateCorrectAnswer();
    } else {
      setHearts((prev) => prev - 1);
      companion.encourageWrongAnswer();

      // تحذير عند نفاذ المحاولات
      if (heartsRef.current - 1 <= 1) {
        companion.warnLowHearts(heartsRef.current - 1);
      }
    }

    setShowExplanation(true);

    setTimeout(async () => {
      if (heartsRef.current <= 1 && !isCorrect) {
        await finishGame();
      } else if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setShowExplanation(false);
      } else {
        await finishGame();
      }
    }, 2000);
  };

  const finishGame = async () => {
    try {
      await fetch('/api/game/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          score: scoreRef.current,
          heartsLost: 3 - heartsRef.current,
        }),
      });

      // احتفال عند إنهاء اللعبة بنجاح
      if (scoreRef.current >= 50) {
        companion.celebrateLevelComplete(scoreRef.current);
      } else {
        companion.encourageContinue();
      }

      // تأخير بسيط قبل الانتقال للسماح بالاحتفال
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('خطأ في إنهاء اللعبة:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-bold">جاري تحميل الأسئلة...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-bold">لا توجد أسئلة متاحة</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* شريط المعلومات */}
        <div className="flex justify-between items-center mb-6 bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-2xl">❤️</span>
            <span className="text-xl font-bold">{hearts}</span>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">السؤال</p>
            <p className="text-lg font-bold">
              {currentQuestionIndex + 1} / {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{score}</span>
            <span className="text-2xl">⭐</span>
          </div>
        </div>

        {/* السؤال */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-6 text-center">{currentQuestion.question}</h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correctAnswer;
              const showResult = selectedAnswer !== null;

              let buttonClass =
                'w-full p-4 rounded-lg text-right font-medium transition-all ';

              if (showResult) {
                if (isCorrect) {
                  buttonClass += 'bg-green-500 text-white';
                } else if (isSelected) {
                  buttonClass += 'bg-red-500 text-white';
                } else {
                  buttonClass += 'bg-gray-100 text-gray-700';
                }
              } else {
                buttonClass += 'bg-blue-100 hover:bg-blue-200 text-gray-800';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  disabled={selectedAnswer !== null}
                  className={buttonClass}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* الشرح */}
          {showExplanation && currentQuestion.explanation && (
            <div className="mt-6 p-4 bg-yellow-50 border-r-4 border-yellow-400 rounded">
              <p className="font-bold text-yellow-800 mb-2">💡 الشرح:</p>
              <p className="text-yellow-700">{currentQuestion.explanation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}