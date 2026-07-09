'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type Square = 'X' | 'O' | null;
type Difficulty = 'easy' | 'medium' | 'hard';

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // صفوف
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // أعمدة
  [0, 4, 8], [2, 4, 6]             // أقطار
];

const SCORES_KEY = 'tictactoe-scores';
const SOUND_KEY = 'tictactoe-sound-muted';

type Scores = { player: number; computer: number; draws: number; bestStreak: number };

export default function TicTacToeGame() {
  const router = useRouter();
  const [board, setBoard] = useState<Square[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState<Scores>({ player: 0, computer: 0, draws: 0, bestStreak: 0 });
  const [streak, setStreak] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isThinking, setIsThinking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [checking, setChecking] = useState(true);

  // تشغيل الصوت مع مراعاة كتم الصوت
  const playSafe = useCallback((name: Parameters<typeof playSound>[0]) => {
    if (!muted) playSound(name);
  }, [muted]);

  // تحميل النتائج المحفوظة وتفضيل الصوت
  useEffect(() => {
    try {
      const savedScores = localStorage.getItem(SCORES_KEY);
      if (savedScores) setScores(JSON.parse(savedScores));
      const savedMute = localStorage.getItem(SOUND_KEY);
      if (savedMute) setMuted(savedMute === 'true');
    } catch {
      // تجاهل أخطاء القراءة
    }
  }, []);

  // حفظ النتائج عند تغيّرها
  useEffect(() => {
    try {
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    } catch {
      // تجاهل أخطاء الكتابة
    }
  }, [scores]);

  // التحقق من أن اللعبة مفتوحة
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }

    fetch(`/api/badges?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.unlockedGames?.includes('tictactoe')) {
          alert('🔒 يجب فتح شهادة المستوى 2 أولاً!');
          router.push('/games');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  // التحقق من الفائز
  const checkWinner = (squares: Square[]): { winner: string | null; line: number[] | null } => {
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    return { winner: null, line: null };
  };

  // ذكاء الكمبيوتر - سهل
  const getEasyMove = (squares: Square[]): number => {
    const available = squares.map((s, i) => s === null ? i : -1).filter(i => i !== -1);
    return available[Math.floor(Math.random() * available.length)];
  };

  // ذكاء الكمبيوتر - متوسط
  const getMediumMove = (squares: Square[]): number => {
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (squares[a] === 'O' && squares[b] === 'O' && squares[c] === null) return c;
      if (squares[a] === 'O' && squares[c] === 'O' && squares[b] === null) return b;
      if (squares[b] === 'O' && squares[c] === 'O' && squares[a] === null) return a;
    }
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (squares[a] === 'X' && squares[b] === 'X' && squares[c] === null) return c;
      if (squares[a] === 'X' && squares[c] === 'X' && squares[b] === null) return b;
      if (squares[b] === 'X' && squares[c] === 'X' && squares[a] === null) return a;
    }
    if (squares[4] === null) return 4;
    const corners = [0, 2, 6, 8].filter(i => squares[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    return getEasyMove(squares);
  };

  // ذكاء الكمبيوتر - صعب (Minimax مع مراعاة عدد الحركات)
  // يفضّل الفوز الأسرع، ويؤخر الخسارة قدر الإمكان
  const minimax = (squares: Square[], isMaximizing: boolean, depth: number): number => {
    const { winner } = checkWinner(squares);
    if (winner === 'O') return 10 - depth;
    if (winner === 'X') return depth - 10;
    if (squares.every(s => s !== null)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'O';
          const score = minimax(squares, false, depth + 1);
          squares[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'X';
          const score = minimax(squares, true, depth + 1);
          squares[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getHardMove = (squares: Square[]): number => {
    // أول حركة على لوحة فارغة: زاوية عشوائية لتنويع الألعاب مع البقاء بلا هزيمة
    if (squares.every(s => s === null)) {
      const corners = [0, 2, 6, 8];
      return corners[Math.floor(Math.random() * corners.length)];
    }

    let bestScore = -Infinity;
    let bestMoves: number[] = [];

    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = 'O';
        const score = minimax(squares, false, 0);
        squares[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [i];
        } else if (score === bestScore) {
          bestMoves.push(i);
        }
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  };

  // حركة الكمبيوتر
  const computerMove = (currentBoard: Square[]) => {
    setIsThinking(true);

    setTimeout(() => {
      let move = -1;

      switch (difficulty) {
        case 'easy':
          move = getEasyMove(currentBoard);
          break;
        case 'medium':
          move = getMediumMove(currentBoard);
          break;
        case 'hard':
          move = getHardMove([...currentBoard]);
          break;
      }

      if (move !== -1) {
        const newBoard = [...currentBoard];
        newBoard[move] = 'O';
        setBoard(newBoard);
        setLastMove(move);
        playSafe('click');

        const { winner: w, line } = checkWinner(newBoard);
        if (w) {
          setWinner(w);
          setWinningLine(line);
          setStreak(0);
          setScores(s => ({ ...s, computer: s.computer + 1 }));
          playSafe('wrong');
        } else if (newBoard.every(s => s !== null)) {
          setWinner('draw');
          setScores(s => ({ ...s, draws: s.draws + 1 }));
        } else {
          setIsXNext(true);
        }
      }
      setIsThinking(false);
    }, 600);
  };

  // حركة اللاعب
  const handleClick = (index: number) => {
    if (board[index] || winner || isThinking || !isXNext) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setLastMove(index);
    playSafe('correct');

    const { winner: w, line } = checkWinner(newBoard);
    if (w) {
      setWinner(w);
      setWinningLine(line);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScores(s => ({
        ...s,
        player: s.player + 1,
        bestStreak: Math.max(s.bestStreak, newStreak),
      }));
      playSafe('achievement');
    } else if (newBoard.every(s => s !== null)) {
      setWinner('draw');
      setScores(s => ({ ...s, draws: s.draws + 1 }));
    } else {
      setIsXNext(false);
      computerMove(newBoard);
    }
  };

  // إعادة اللعبة
  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
    setLastMove(null);
  };

  // إعادة ضبط كل شيء
  const confirmResetAll = () => {
    resetGame();
    setScores({ player: 0, computer: 0, draws: 0, bestStreak: 0 });
    setStreak(0);
    setShowResetConfirm(false);
  };

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_KEY, String(next));
      } catch {
        // تجاهل
      }
      return next;
    });
  };

  const difficultyMeta: Record<Difficulty, { emoji: string; label: string; activeClass: string }> = {
    easy: { emoji: '😊', label: 'سهل', activeClass: 'bg-green-500 text-white scale-105 ring-2 ring-offset-2 ring-green-400' },
    medium: { emoji: '😐', label: 'متوسط', activeClass: 'bg-yellow-500 text-white scale-105 ring-2 ring-offset-2 ring-yellow-400' },
    hard: { emoji: '😈', label: 'صعب', activeClass: 'bg-red-500 text-white scale-105 ring-2 ring-offset-2 ring-red-400' },
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" dir="rtl">
        <div className="text-2xl font-bold text-gray-500 animate-pulse">⏳ جارٍ التحميل...</div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-center mb-6">⭕ إكس أو</h1>

            {scores.bestStreak > 0 && (
              <div className="text-center mb-4">
                <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-bold">
                  🔥 أفضل سلسلة فوز: {scores.bestStreak}
                </span>
              </div>
            )}

            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-xl text-gray-600 mb-6">اختر مستوى الصعوبة</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {(Object.keys(difficultyMeta) as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    aria-pressed={difficulty === level}
                    className={`p-4 rounded-xl font-bold transition-all ${
                      difficulty === level
                        ? difficultyMeta[level].activeClass
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
                  >
                    <div className="text-3xl mb-2">{difficultyMeta[level].emoji}</div>
                    <div>{difficultyMeta[level].label}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setGameStarted(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                🎮 ابدأ اللعبة
              </button>
            </div>

            <button
              onClick={() => router.push('/games')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              🏠 العودة للألعاب
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-center gap-3 mb-6 relative">
            <h1 className="text-4xl font-bold text-center">⭕ إكس أو</h1>
            <button
              onClick={toggleMute}
              aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
              className="absolute left-0 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>

          {/* لوحة النقاط */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{scores.player}</div>
              <div className="text-sm text-gray-600">أنت (X)</div>
            </div>
            <div className="bg-gray-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-gray-600">{scores.draws}</div>
              <div className="text-sm text-gray-600">تعادل</div>
            </div>
            <div className="bg-red-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{scores.computer}</div>
              <div className="text-sm text-gray-600">الكمبيوتر (O)</div>
            </div>
          </div>

          {streak > 1 && (
            <div className="text-center mb-4">
              <span className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-bold">
                🔥 سلسلة فوز: {streak}
              </span>
            </div>
          )}

          {/* مستوى الصعوبة */}
          <div className="text-center mb-4">
            <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-bold">
              {difficultyMeta[difficulty].emoji} {difficultyMeta[difficulty].label}
            </span>
          </div>

          {/* حالة اللعبة */}
          <div className="text-center mb-6 h-12 flex items-center justify-center">
            {winner === null && !isThinking && (
              <div className="text-2xl font-bold text-blue-600">🎯 دورك!</div>
            )}
            {isThinking && (
              <div className="text-2xl font-bold text-orange-600 animate-pulse">
                🤔 الكمبيوتر يفكر...
              </div>
            )}
            {winner === 'X' && (
              <div className="text-3xl font-bold text-green-600 animate-bounce">
                🎉 فزت!
              </div>
            )}
            {winner === 'O' && (
              <div className="text-3xl font-bold text-red-600">
                😢 الكمبيوتر فاز!
              </div>
            )}
            {winner === 'draw' && (
              <div className="text-3xl font-bold text-gray-600">
                🤝 تعادل!
              </div>
            )}
          </div>

          {/* لوحة اللعب */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
            {board.map((square, index) => {
              const isWinning = winningLine?.includes(index);
              const isLast = lastMove === index;

              return (
                <button
                  key={index}
                  onClick={() => handleClick(index)}
                  disabled={!!square || !!winner || isThinking}
                  aria-label={square ? `خانة ${index + 1}: ${square}` : `خانة ${index + 1}: فارغة`}
                  className={`aspect-square rounded-2xl text-6xl font-bold transition-all transform ${
                    isWinning
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 scale-110 animate-pulse'
                      : square
                      ? 'bg-white border-4 border-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                  } ${isLast && !isWinning ? 'ring-4 ring-blue-400' : ''} focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300`}
                >
                  {square === 'X' && (
                    <span key={`x-${index}`} className="text-blue-600 inline-block animate-[pop_0.25s_ease-out]">
                      {square}
                    </span>
                  )}
                  {square === 'O' && (
                    <span key={`o-${index}`} className="text-red-600 inline-block animate-[pop_0.25s_ease-out]">
                      {square}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* الأزرار */}
          <div className="flex gap-3">
            {winner && (
              <button
                onClick={resetGame}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-teal-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                🔄 جولة جديدة
              </button>
            )}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              🎯 إعادة البدء
            </button>
            <button
              onClick={() => router.push('/games')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              🏠 العودة
            </button>
          </div>
        </div>
      </div>

      {/* نافذة تأكيد إعادة الضبط الكامل */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold mb-2">إعادة ضبط كل شيء؟</h2>
            <p className="text-gray-600 mb-6">سيتم مسح جميع النقاط وسلسلة الفوز نهائيًا.</p>
            <div className="flex gap-3">
              <button
                onClick={confirmResetAll}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                نعم، أعد الضبط
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pop {
          0% { transform: scale(0.3); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
