import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  // مسح الكوكيز عن طريق تعيين maxAge إلى 0
  cookieStore.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true تلقائياً في Vercel (HTTPS)
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  
  return NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
}