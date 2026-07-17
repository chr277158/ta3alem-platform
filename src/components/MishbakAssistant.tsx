'use client';
import { useState, useEffect } from 'react';

interface Message {
  id: number;
  text: string;
  type: 'tip' | 'greeting' | 'help' | 'celebration';
}

export default function MishbakAssistant() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [mood, setMood] = useState<'happy' | 'neutral' | 'thinking' | 'excited'>('neutral');

  // رسائل المساعدة والنصائح
  const tips: Message[] = [
    { id: 1, text: 'مرحباً! أنا مشبك، رفيقك في التعلم! 🎓', type: 'greeting' },
    { id: 2, text: 'هل تعلم؟ يمكنك كسب نقاط عند الإجابة الصحيحة!', type: 'tip' },
    { id: 3, text: 'جرب حل التحدي اليومي للحصول على مكافآت إضافية!', type: 'tip' },
    { id: 4, text: 'أكمل جميع المواد في مستوى واحد لفتح ألعاب جديدة!', type: 'help' },
    { id: 5, text: 'لا تنسَ مراجعة شرح السؤال بعد الإجابة!', type: 'tip' },
    { id: 6, text: 'أنت بطل! استمر في التعلم! 🌟', type: 'celebration' },
  ];

  // إظهار رسالة عشوائية كل 30 ثانية
  useEffect(() => {
    if (!isVisible) return;

    const showRandomTip = () => {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentMessage(randomTip);
      setShowMessage(true);
      setMood(randomTip.type === 'celebration' ? 'excited' : 'happy');
      
      setTimeout(() => {
        setShowMessage(false);
        setMood('neutral');
      }, 5000);
    };

    // إظهار رسالة ترحيب عند التحميل
    setTimeout(() => {
      setCurrentMessage(tips[0]);
      setShowMessage(true);
      setMood('happy');
      setTimeout(() => {
        setShowMessage(false);
        setMood('neutral');
      }, 4000);
    }, 1000);

    const interval = setInterval(showRandomTip, 30000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleMishbakClick = () => {
    triggerAnimation();
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setCurrentMessage(randomTip);
    setShowMessage(true);
    setMood('happy');
    setTimeout(() => {
      setShowMessage(false);
      setMood('neutral');
    }, 5000);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
        title="إظهار المساعد"
      >
        📎
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {/* فقاعة الرسالة */}
      {showMessage && currentMessage && (
        <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-xs animate-fadeInUp border-2 border-blue-300 relative">
          <div className="absolute bottom-[-10px] right-8 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-blue-300"></div>
          <div className="absolute bottom-[-7px] right-9 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
          <p className="text-gray-800 text-sm font-medium leading-relaxed">
            {currentMessage.text}
          </p>
          <button
            onClick={() => setShowMessage(false)}
            className="absolute top-2 left-2 text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* شخصية مشبك */}
      <div className="relative group">
        <button
          onClick={handleMishbakClick}
          className={`relative cursor-pointer transition-transform hover:scale-110 ${
            isAnimating ? 'animate-bounce' : ''
          }`}
          title="اضغط للمساعدة"
        >
          <svg
            width="80"
            height="100"
            viewBox="0 0 80 100"
            className="drop-shadow-lg"
          >
            {/* جسم المشبك */}
            <path
              d="M 40 10 Q 20 10 20 30 L 20 70 Q 20 90 40 90 Q 60 90 60 70 L 60 30 Q 60 10 40 10 Z"
              fill="url(#metalGradient)"
              stroke="#888"
              strokeWidth="2"
            />
            
            {/* الجزء الداخلي */}
            <path
              d="M 35 25 Q 30 25 30 35 L 30 65 Q 30 75 35 75 Q 40 75 40 65 L 40 35 Q 40 25 35 25 Z"
              fill="#f0f0f0"
              stroke="#999"
              strokeWidth="1"
            />

            {/* العين اليسرى */}
            <g className={mood === 'happy' || mood === 'excited' ? 'animate-blink' : ''}>
              <ellipse
                cx="32"
                cy="45"
                rx="4"
                ry="5"
                fill="white"
                stroke="#333"
                strokeWidth="1"
              />
              <circle
                cx="32"
                cy="46"
                r="2"
                fill="#333"
                className={mood === 'thinking' ? 'animate-lookAround' : ''}
              />
            </g>

            {/* العين اليمنى */}
            <g className={mood === 'happy' || mood === 'excited' ? 'animate-blink' : ''}>
              <ellipse
                cx="48"
                cy="45"
                rx="4"
                ry="5"
                fill="white"
                stroke="#333"
                strokeWidth="1"
              />
              <circle
                cx="48"
                cy="46"
                r="2"
                fill="#333"
                className={mood === 'thinking' ? 'animate-lookAround' : ''}
              />
            </g>

            {/* الحواجب */}
            <path
              d={
                mood === 'happy' || mood === 'excited'
                  ? 'M 28 38 Q 32 36 36 38'
                  : mood === 'thinking'
                  ? 'M 28 37 Q 32 39 36 37'
                  : 'M 28 38 L 36 38'
              }
              stroke="#333"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={
                mood === 'happy' || mood === 'excited'
                  ? 'M 44 38 Q 48 36 52 38'
                  : mood === 'thinking'
                  ? 'M 44 37 Q 48 39 52 37'
                  : 'M 44 38 L 52 38'
              }
              stroke="#333"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />

            {/* الفم */}
            <path
              d={
                mood === 'happy' || mood === 'excited'
                  ? 'M 35 55 Q 40 60 45 55'
                  : mood === 'thinking'
                  ? 'M 35 55 L 45 55'
                  : 'M 37 55 Q 40 57 43 55'
              }
              stroke="#333"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />

            {/* خدود وردية عند السعادة */}
            {(mood === 'happy' || mood === 'excited') && (
              <>
                <circle cx="28" cy="52" r="3" fill="#ffb3b3" opacity="0.6" />
                <circle cx="52" cy="52" r="3" fill="#ffb3b3" opacity="0.6" />
              </>
            )}

            {/* نجمة صغيرة عند الإثارة */}
            {mood === 'excited' && (
              <g className="animate-spin">
                <path
                  d="M 65 25 L 67 30 L 72 30 L 68 33 L 70 38 L 65 35 L 60 38 L 62 33 L 58 30 L 63 30 Z"
                  fill="#ffd700"
                  stroke="#ffaa00"
                  strokeWidth="0.5"
                />
              </g>
            )}

            {/* تدرج معدني */}
            <defs>
              <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0e0e0" />
                <stop offset="50%" stopColor="#c0c0c0" />
                <stop offset="100%" stopColor="#a0a0a0" />
              </linearGradient>
            </defs>
          </svg>
        </button>

        {/* زر الإخفاء */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title="إخفاء المساعد"
        >
          ✕
        </button>
      </div>
    </div>
  );
}