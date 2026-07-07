"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [level, setLevel] = useState(2)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, level })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'حدث خطأ')
      }

      // حفظ البيانات في localStorage
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // الانتقال للوحة التحكم
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🎓</div>
          <h1 className="text-3xl font-bold text-gray-800">حساب جديد</h1>
          <p className="text-gray-600 mt-2">انضم إلى منصة تعلّم وألعب</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-bold text-gray-700">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none transition"
              placeholder="أدخل اسمك"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-bold text-gray-700">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none transition"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-bold text-gray-700">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none transition"
              placeholder="6 أحرف على الأقل"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block mb-2 font-bold text-gray-700">المستوى الدراسي</label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none transition"
            >
              <option value={2}>السنة الثانية ابتدائي</option>
              <option value={3}>السنة الثالثة ابتدائي</option>
              <option value={4}>السنة الرابعة ابتدائي</option>
              <option value={5}>السنة الخامسة ابتدائي</option>
              <option value={6}>السنة السادسة ابتدائي</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-700 p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-blue-600 transition disabled:opacity-50"
          >
            {loading ? 'جاري التسجيل...' : 'تسجيل'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          لديك حساب؟{' '}
          <Link href="/login" className="text-green-600 font-bold hover:underline">
            سجل دخولك
          </Link>
        </p>
      </div>
    </main>
  )
}