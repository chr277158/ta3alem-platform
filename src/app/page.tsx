import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-100 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/90 backdrop-blur rounded-3xl p-8 text-center shadow-2xl">
        <div className="text-6xl mb-4 animate-bounce">🎒📚✨</div>
        <h1 className="text-4xl font-bold text-red-500 mb-4">
          تعلّم وألعب!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          منصة تعليمية تفاعلية للتلاميذ التونسيين
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link 
            href="/login" 
            className="bg-red-500 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-red-600 transition"
          >
            تسجيل الدخول
          </Link>
          <Link 
            href="/register" 
            className="border-2 border-red-500 text-red-500 px-8 py-4 rounded-full text-lg font-bold hover:bg-red-50 transition"
          >
            حساب جديد
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl mb-2">📚</div>
            <div className="font-bold">6 مواد</div>
          </div>
          <div>
            <div className="text-3xl mb-2">🎮</div>
            <div className="font-bold">180+ سؤال</div>
          </div>
          <div>
            <div className="text-3xl mb-2">🏆</div>
            <div className="font-bold">12 لعبة</div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            🎯 العب، تعلّم، واجمع الشارات لفتح ألعاب جديدة!
          </p>
        </div>
      </div>
    </main>
  )
}