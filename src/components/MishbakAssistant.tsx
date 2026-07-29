'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useMishbak, MishbakMood } from '@/context/MishbakContext';

export default function MishbakAssistant({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const { setMood, showMessage } = useMishbak();
  
  const [isVisible, setIsVisible] = useState(true);
  const [message, setMessage] = useState('');
  const [mood, setLocalMood] = useState<MishbakMood>('neutral');

  // قاموس الرسائل السياقية بناءً على المسار
  const contextualMessages: Record<string, { text: string; mood: MishbakMood }> = {
    '/dashboard': { 
      text: userName ? `أهلاً بك يا ${userName}! ماذا سنتعلم اليوم؟ 🚀` : 'أهلاً بك يا بطل! ماذا سنتعلم اليوم؟ 🚀', 
      mood: 'happy' 
    },
    '/daily': { 
      text: 'لا تنسَ تحدي اليوم للحفاظ على سلسلة انتصاراتك! 🔥', 
      mood: 'excited' 
    },
    '/mastery': { 
      text: 'ما شاء الله! انظر إلى كل هذه الشارات، أنت نجم متلألئ ✨', 
      mood: 'celebrating' 
    },
    '/badges': { 
      text: 'كل شارة جديدة هي خطوة نحو الإتقان! استمر يا بطل 🏆', 
      mood: 'happy' 
    },
    '/games': { 
      text: 'وقت المرح! استمتع باللعب الذي فتحته بجدارتك 🎮', 
      mood: 'excited' 
    },
  };

  // تحديث الرسالة تلقائياً عند تغيير الصفحة
  useEffect(() => {
    const baseRoute = '/' + pathname.split('/')[1]; // الحصول على المسار الأساسي
    const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
    
    setMessage(context.text);
    setLocalMood(context.mood);
  }, [pathname, userName]);

  // الاستجابة للأحداث المباشرة من الصفحات (مثل الإجابة الصحيحة)
  useEffect(() => {
    // يمكن إضافة مستمع لأحداث مخصصة هنا إذا لزم الأمر، لكن Context يكفي حالياً
  }, []);

  // دالة لتحديث الحالة من الخارج (عبر Context)
  useEffect(() => {
    // نستخدم رسالة مخصصة إذا تم طلبها عبر Context، وإلا نستخدم الرسالة السياقية
    const baseRoute = '/' + pathname.split('/')[1];
    const context = contextualMessages[baseRoute] || contextualMessages['/dashboard'];
    
    // ملاحظة: في تطبيق حقيقي، يمكن دمج حالة Context بشكل أفضل، 
    // هنا نبسط الأمر بجعل showMessage يتجاوز الرسالة مؤقتاً
  }, [pathname]);

  // دالة مساعدة لعرض الرسائل المؤقتة (يتم استدعاؤها من Context عبر تحديث حالة محلية إذا أردنا، 
  // لكن للأفضل، سنجعل المكون يستمع مباشرة أو نمرر props. للتبسيط، سنعتمد على نمط الرسائل المؤقتة)
  
  // أنيميشن CSS مدمج
  const animations = {
    happy: 'animate-bounce-slow',
    excited: 'animate-pulse',
    celebrating: 'animate-spin-slow',
    encouraging: 'animate-shake',
    thinking: 'animate-pulse',
    neutral: '',
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-all"
        aria-label="إظهار المساعد"
      >
        📎
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2 animate-fade-in-up">
      {/* فقاعة الرسالة */}
      <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-4 py-2 rounded-2xl rounded-bl-none shadow-lg border border-gray-200 dark:border-gray-700 max-w-xs text-sm font-medium relative">
        {message}
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
        >
          ×
        </button>
      </div>

      {/* شخصية مشبك */}
      <div className={`text-4xl cursor-pointer transition-transform duration-300 ${animations[mood] || ''}`}
           onClick={() => {
             // تفاعل عند النقر عليه
             const randomTips = [
               'هل تعلم؟ المراجعة اليومية تقوي الذاكرة! 🧠',
               'نصيحة: اقرأ السؤال جيداً قبل اختيار الإجابة 👀',
               'أنت تبلي بلاءً حسناً، استمر! 💪',
               'لا بأس من الخطأ، فهو جزء من التعلم! 🌱'
             ];
             setMessage(randomTips[Math.floor(Math.random() * randomTips.length)]);
             setLocalMood('thinking');
             setTimeout(() => setLocalMood('neutral'), 3000);
           }}
           title="انقر للحصول على نصيحة"
      >
        📎
      </div>
    </div>
  );
}