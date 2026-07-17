// src/app/api/user/me/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionCookie.value },
      select: {
        id: true,
        username: true,
        email: true,
        playerLevel: true,
        totalPoints: true,
        streakDays: true,
        avatar: true
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب البيانات' }, { status: 500 });
  }
}