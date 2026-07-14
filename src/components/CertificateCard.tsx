'use client';

import { useState } from 'react';

interface CertificateCardProps {
  level: number;
  levelName: string;
  isUnlocked: boolean;
  masteredCount: number;
  gamesUnlocked: string[];
}

const GAME_NAMES: Record<string, string> = {
  snake: '🐍 الثعبان', memory: '🧠 الذاكرة', tictactoe: '⭕ إكس أو',
  whack: '🎯 اضرب الخلد', '2048': '🔢 2048', rps: '✂️ حجر ورقة مقص',
  hangman: '📝 تخمين الكلمة', simon: '🎵 سايمون', pong: '🏓 بينج بونج',
  breakout: '🧱 Breakout', maze: '🏰 المتاهة', draw: '🎨 الرسم',
  puzzle: '🧩 البازل', quiz: '❓ الكويز'
};

export default function CertificateCard({ 
  level, levelName, isUnlocked, masteredCount, gamesUnlocked 
}: CertificateCardProps) {
  const [username, setUsername] = useState('بطل المنصة');
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('ar-TN'));

  // جلب اسم المستخدم عند التحميل
  useState(() => {
    const storedName = localStorage.getItem('username');
    if (storedName) setUsername(storedName);
  });

  const handlePrint = () => {
    window.print();
  };

  if (!isUnlocked) {
    return (
      <div className="bg-gray-100 rounded-2xl p-8 text-center opacity-60 border-2 border-dashed border-gray-300">
        <div className="text-6xl mb-4 grayscale">🔒</div>
        <h3 className="text-2xl font-bold text-gray-500">شهادة {levelName}</h3>
        <p className="text-gray-400 mt-2">أكمل المستوى {level - 1} لفتح هذه الشهادة</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* زر الطباعة (يختفي عند الطباعة) */}
      <button
        onClick={handlePrint}
        className="no-print absolute -top-4 -left-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all z-10 flex items-center gap-2"
        title="طباعة الشهادة"
      >
        🖨️ طباعة
      </button>

      {/* بطاقة الشهادة */}
      <div 
        className="printable-certificate bg-white rounded-2xl p-8 border-4 border-yellow-400 animate-border-glow relative overflow-hidden"
      >
        {/* زخرفة الخلفية */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-500 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-yellow-500 rounded-full translate-x-1/3 translate-y-1/3"></div>
        </div>

        {/* محتوى الشهادة */}
        <div className="relative z-10 text-center">
          <div className="text-5xl mb-2">🎓</div>
          <h2 className="text-4xl font-bold text-yellow-600 print-text-gold mb-2">شهادة إتقان</h2>
          <h3 className="text-2xl font-semibold text-gray-700 mb-6">{levelName}</h3>

          <div className="w-24 h-1 bg-yellow-400 mx-auto mb-6 rounded-full"></div>

          <p className="text-xl text-gray-600 mb-2">تشهد منصة "تعلّم وألعب" بأن التلميذ(ة):</p>
          <h1 className="text-4xl font-bold text-blue-800 mb-4 font-serif">{username}</h1>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            قد أتم بنجاح وإتقان <span className="font-bold text-green-600">جميع المواد الـ 8</span> في <span className="font-bold">المستوى {level}</span>، 
            وحصل على أعلى الدرجات، مما يؤهله لفتح ألعاب جديدة.
          </p>

          {/* الألعاب المفتوحة */}
          <div className="bg-yellow-50 rounded-xl p-4 mb-6 inline-block">
            <p className="text-sm text-gray-500 mb-2">🎁 المكافآت المفتوحة:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {gamesUnlocked.map(game => (
                <span key={game} className="bg-white px-3 py-1 rounded-full text-sm font-bold text-gray-700 shadow-sm border border-yellow-200">
                  {GAME_NAMES[game] || game}
                </span>
              ))}
            </div>
          </div>

          {/* التذييل والتوقيع */}
          <div className="flex justify-between items-end mt-12 px-8">
            <div className="text-center">
              <p className="text-gray-500 text-sm">تاريخ الإصدار</p>
              <p className="font-bold text-gray-800">{currentDate}</p>
            </div>

            {/* ختم المنصة */}
            <div className="animate-stamp">
              <div className="w-24 h-24 border-4 border-red-600 rounded-full flex items-center justify-center text-red-600 font-bold text-xs text-center p-2 transform -rotate-12 opacity-80">
                معتمد<br/>منصة تعلّم<br/>وألعب
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-sm">توقيع المدير</p>
              <p className="font-bold text-gray-800 font-serif text-xl">مدير المنصة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}