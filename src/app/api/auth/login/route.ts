// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;
    console.log('🔐 Login attempt:', username);

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم/البريد وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'بيانات الدخول غير صحيحة' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'بيانات الدخول غير صحيحة' },
        { status: 401 }
      );
    }

    console.log('✅ Login successful:', username);

    // 🔑 إصدار كوكيز الجلسة
    const cookieStore = await cookies();
    cookieStore.set('session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // أسبوع
    });

    // ✅ نُبقي id ضمن الرد لأن بقية التطبيق (9 مسارات API + صفحات العميل)
    // لا تزال تعتمد على أن العميل يرسل userId المخزّن في localStorage.
    // (الكوكيز أعلاه لا ضرر منها، لكنها غير مقروءة بعد في أي مكان آخر)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        playerLevel: user.playerLevel,
        totalPoints: user.totalPoints,
        streakDays: user.streakDays,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل في تسجيل الدخول' },
      { status: 500 }
    );
  }
}