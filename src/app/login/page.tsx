'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ✅ هذا السطر ضروري جداً!
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'بيانات الدخول غير صحيحة');
        setLoading(false);
        return;
      }

      console.log('✅ Login successful');
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎓</div>
          <h1 className="text-3xl font-bold text-gray-800">تسجيل الدخول</h1>
          <p className="text-gray-600 mt-2">مرحباً بعودتك!</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">اسم المستخدم أو البريد الإلكتروني</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="أدخل اسم المستخدم أو البريد"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">كلمة  المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="أدخل كلمة المرور"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-500 text-red-600 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {loading ? 'جاري الدخول...' : '🚀 دخول'}
          </button>
        </form>

        <div className="text-center mt-6">
          <span className="text-gray-600">ليس لديك حساب؟ </span>
          <button
            onClick={() => router.push('/register')}
            className="text-blue-600 font-bold hover:underline"
          >
            سجّل الآن
          </button>
        </div>
      </div>
    </div>
  );
}