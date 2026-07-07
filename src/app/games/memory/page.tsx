'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EMOJIS = ['🎓', '📚', '🎨', '🎵', '⚽', '🌟', '🎮', '🎪'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryGame() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false
      }));
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setGameWon(false);
  };

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2) return;
    if (cards[id].isFlipped || cards[id].isMatched) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;

      if (cards[first].emoji === cards[second].emoji) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[first].isMatched = true;
          matchedCards[second].isMatched = true;
          setCards(matchedCards);
          setFlippedCards([]);
          
          const newMatches = matches + 1;
          setMatches(newMatches);
          
          if (newMatches === EMOJIS.length) {
            setGameWon(true);
          }
        }, 500);
      } else {
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-4xl font-bold text-center mb-6">🧠 لعبة الذاكرة</h1>
          
          <div className="flex justify-between mb-6">
            <div className="text-xl font-bold text-blue-600">المحاولات: {moves}</div>
            <div className="text-xl font-bold text-green-600">التطابقات: {matches}/{EMOJIS.length}</div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`aspect-square rounded-xl text-4xl font-bold transition-all transform ${
                  card.isFlipped || card.isMatched
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 rotate-0'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:scale-105'
                } ${card.isMatched ? 'opacity-50' : ''}`}
              >
                {card.isFlipped || card.isMatched ? card.emoji : '?'}
              </button>
            ))}
          </div>

          {gameWon && (
            <div className="text-center bg-gradient-to-r from-green-400 to-teal-500 text-white p-6 rounded-2xl mb-6">
              <div className="text-3xl font-bold mb-2">🎉 مبروك!</div>
              <div className="text-xl">أكملت اللعبة في {moves} محاولة</div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={initializeGame}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              🔄 لعبة جديدة
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