import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

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