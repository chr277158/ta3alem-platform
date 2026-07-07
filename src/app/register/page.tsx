'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, level, password })
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'فشل في إنشاء الحساب');
        setLoading(false);
        return;
      }

      // ✅ حفظ userId و username في localStorage
      console.log('✅ Register successful, saving:', data.user);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username || data.user.name);

      // الانتقال إلى لوحة التحكم
      router.push('/dashboard');
    } catch (err) {
      console.error('Register error:', err);
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
          <h1 className="text-3xl font-bold text-gray-800">إنشاء حساب جديد</h1>
          <p className="text-gray-600 mt-2">انضم إلى منصة تعلّم وألعب!</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="أدخل اسمك"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">المستوى الدراسي</label>
            <select
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value))}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              required
            >
              <option value={1}>المستوى 1 - مبتدئ</option>
              <option value={2}>المستوى 2 - متعلم</option>
              <option value={3}>المستوى 3 - مجتهد</option>
              <option value={4}>المستوى 4 - متفوق</option>
              <option value={5}>المستوى 5 - عبقري</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="6 أحرف على الأقل"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="أعد كتابة كلمة المرور"
              required
              minLength={6}
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
            {loading ? 'جاري إنشاء الحساب...' : '🚀 إنشاء حساب'}
          </button>
        </form>

        <div className="text-center mt-6">
          <span className="text-gray-600">لديك حساب بالفعل؟ </span>
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 font-bold hover:underline"
          >
            سجّل دخول
          </button>
        </div>
      </div>
    </div>
  );
}