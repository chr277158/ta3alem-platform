import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    // 🔑 قراءة userId من الكوكيز الآمنة
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'غير مصرح - يجب تسجيل الدخول' }, { status: 401 });
    }
    
    const userId = sessionCookie.value;

    // جلب جميع الشارات
    const allBadges = await prisma.badge.findMany();

    // جلب الشارات المكتسبة
    const earnedBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true }
    });

    // استخراج الألعاب المفتوحة
    const unlockedGames = new Set<string>();
    earnedBadges.forEach(({ badge }) => {
      const games = JSON.parse(badge.gamesUnlocked);
      games.forEach((game: string) => unlockedGames.add(game));
    });

    return NextResponse.json({
      allBadges,
      earnedBadges: earnedBadges.map(({ badge }) => badge),
      unlockedGames: Array.from(unlockedGames)
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: 'فشل في جلب الشارات' }, { status: 500 });
  }
}