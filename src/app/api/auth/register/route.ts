// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, level, password } = body;
    console.log('📝 Register attempt:', { name, email, level });

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: name },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: name,
        email: email,
        password: hashedPassword,
        playerLevel: level || 1,
        totalPoints: 0,
        streakDays: 0,
        darkMode: false
      }
    });

    console.log('✅ User created:', user.id);

    // 🔑 إصدار كوكيز الجلسة فوراً بعد التسجيل
    const cookieStore = await cookies();
    cookieStore.set('session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // أسبوع
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        playerLevel: user.playerLevel,
        totalPoints: user.totalPoints
      }
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Register error:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'فشل في إنشاء الحساب' },
      { status: 500 }
    );
  }
}