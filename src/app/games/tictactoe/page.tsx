'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/sounds';

type Square = 'X' | 'O' | null;

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // صفوف
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // أعمدة
  [0, 4, 8], [2, 4, 6]             // أقطار
];

export default function TicTacToeGame() {
  const router = useRouter();
  const [board, setBoard] = useState<Square[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ player: 0, computer: 0, draws: 0 });
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isThinking, setIsThinking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastMove, setLastMove] = useState<number | null>(null);

  // التحقق من أن اللعبة مفتوحة
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }

    // التحقق من أن اللعبة مفتوحة
    fetch(`/api/badges?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.unlockedGames?.includes('tictactoe')) {
          alert('🔒 يجب فتح شهادة المستوى 2 أولاً!');
          router.push('/games');
        }
      });
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
    // 1. حاول الفوز
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (squares[a] === 'O' && squares[b] === 'O' && squares[c] === null) return c;
      if (squares[a] === 'O' && squares[c] === 'O' && squares[b] === null) return b;
      if (squares[b] === 'O' && squares[c] === 'O' && squares[a] === null) return a;
    }

    // 2. امنع اللاعب من الفوز
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (squares[a] === 'X' && squares[b] === 'X' && squares[c] === null) return c;
      if (squares[a] === 'X' && squares[c] === 'X' && squares[b] === null) return b;
      if (squares[b] === 'X' && squares[c] === 'X' && squares[a] === null) return a;
    }

    // 3. خذ الوسط
    if (squares[4] === null) return 4;

    // 4. خذ زاوية
    const corners = [0, 2, 6, 8].filter(i => squares[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

    // 5. حركة عشوائية
    return getEasyMove(squares);
  };

  // ذكاء الكمبيوتر - صعب (Minimax)
  const minimax = (squares: Square[], isMaximizing: boolean): number => {
    const { winner } = checkWinner(squares);
    if (winner === 'O') return 10;
    if (winner === 'X') return -10;
    if (squares.every(s => s !== null)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'O';
          const score = minimax(squares, false);
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
          const score = minimax(squares, true);
          squares[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getHardMove = (squares: Square[]): number => {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = 'O';
        const score = minimax(squares, false);
        squares[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  };

  // حركة الكمبيوتر
  const computerMove = (currentBoard: Square[]) => {
    setIsThinking(true);
    
    setTimeout(() => {
      let move: number;
      
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

      if (move !== undefined && move !== -1) {
        const newBoard = [...currentBoard];
        newBoard[move] = 'O';
        setBoard(newBoard);
        setLastMove(move);
        playSound('click');

        const { winner: w, line } = checkWinner(newBoard);
        if (w) {
          setWinner(w);
          setWinningLine(line);
          setScores(s => ({ ...s, computer: s.computer + 1 }));
          playSound('wrong');
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
    playSound('correct');

    const { winner: w, line } = checkWinner(newBoard);
    if (w) {
      setWinner(w);
      setWinningLine(line);
      setScores(s => ({ ...s, player: s.player + 1 }));
      playSound('achievement');
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
  const resetAll = () => {
    resetGame();
    setScores({ player: 0, computer: 0, draws: 0 });
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-center mb-6">⭕ إكس أو</h1>
            
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-xl text-gray-600 mb-6">اختر مستوى الصعوبة</p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => setDifficulty('easy')}
                  className={`p-4 rounded-xl font-bold transition-all ${
                    difficulty === 'easy'
                      ? 'bg-green-500 text-white scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-3xl mb-2">😊</div>
                  <div>سهل</div>
                </button>
                <button
                  onClick={() => setDifficulty('medium')}
                  className={`p-4 rounded-xl font-bold transition-all ${
                    difficulty === 'medium'
                      ? 'bg-yellow-500 text-white scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-3xl mb-2">😐</div>
                  <div>متوسط</div>
                </button>
                <button
                  onClick={() => setDifficulty('hard')}
                  className={`p-4 rounded-xl font-bold transition-all ${
                    difficulty === 'hard'
                      ? 'bg-red-500 text-white scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-3xl mb-2">😈</div>
                  <div>صعب</div>
                </button>
              </div>

              <button
                onClick={() => setGameStarted(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                🎮 ابدأ اللعبة
              </button>
            </div>

            <button
              onClick={() => router.push('/games')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
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
          <h1 className="text-4xl font-bold text-center mb-6">⭕ إكس أو</h1>
          
          {/* لوحة النقاط */}
          <div className="grid grid-cols-3 gap-4 mb-6">
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

          {/* مستوى الصعوبة */}
          <div className="text-center mb-4">
            <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-bold">
              {difficulty === 'easy' && '😊 سهل'}
              {difficulty === 'medium' && '😐 متوسط'}
              {difficulty === 'hard' && '😈 صعب'}
            </span>
          </div>

          {/* حالة اللعبة */}
          <div className="text-center mb-6">
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
                  className={`aspect-square rounded-2xl text-6xl font-bold transition-all transform ${
                    isWinning
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 scale-110 animate-pulse'
                      : square
                      ? 'bg-white border-4 border-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                  } ${isLast && !isWinning ? 'ring-4 ring-blue-400' : ''}`}
                >
                  {square === 'X' && (
                    <span className="text-blue-600">{square}</span>
                  )}
                  {square === 'O' && (
                    <span className="text-red-600">{square}</span>
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
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-teal-700 transition-all"
              >
                🔄 جولة جديدة
              </button>
            )}
            <button
              onClick={resetAll}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              🎯 إعادة البدء
            </button>
            <button
              onClick={() => router.push('/games')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              🏠 العودة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}