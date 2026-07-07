// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

    // 🔑 البحث بـ username أو email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }  // ← البحث بـ email أيضاً
        ]
      }
    });

    if (!user) {
      console.log('❌ User not found:', username);
      return NextResponse.json(
        { success: false, error: 'بيانات الدخول غير صحيحة' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log('❌ Invalid password for:', username);
      return NextResponse.json(
        { success: false, error: 'بيانات الدخول غير صحيحة' },
        { status: 401 }
      );
    }

    console.log('✅ Login successful:', username);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        playerLevel: user.playerLevel,
        totalPoints: user.totalPoints,
        streakDays: user.streakDays
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