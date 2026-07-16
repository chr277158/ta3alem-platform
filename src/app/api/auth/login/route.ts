import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'اسم المستخدم/البريد وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username: username }, { email: username }] }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set('session', String(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true في Vercel
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        playerLevel: user.playerLevel,
        totalPoints: user.totalPoints,
        streakDays: user.streakDays
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return NextResponse.json({ success: false, error: 'فشل في تسجيل الدخول' }, { status: 500 });
  }
}