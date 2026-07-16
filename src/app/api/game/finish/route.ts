import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const SUBJECTS = ['math', 'science', 'body', 'environment', 'arabic', 'french', 'islamic', 'history'];

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'غير مصرح - يجب تسجيل الدخول' }, { status: 401 });
    }
    
    const userId = sessionCookie.value;
    const body = await req.json();
    const { subject, level, score, totalQuestions, heartsLost, hintsUsed } = body;

    if (!subject || !level || score === undefined) {
      return NextResponse.json({ success: false, error: 'المعاملات المطلوبة: subject, level, score' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
    }

    await prisma.gameResult.create({
      data: { 
        userId, 
        subject, 
        level: parseInt(level),
        score: parseInt(score),
        totalQuestions: parseInt(totalQuestions),
        heartsLost: heartsLost || 0,
        hintsUsed: hintsUsed || 0
      }
    });

    const isMastered = score === 5;
    const existingProgress = await prisma.subjectProgress.findUnique({
      where: { userId_subject_level: { userId, subject, level: parseInt(level) } }
    });

    if (existingProgress) {
      await prisma.subjectProgress.update({
        where: { userId_subject_level: { userId, subject, level: parseInt(level) } },
        data: {
          bestScore: Math.max(existingProgress.bestScore, score),
          mastered: Math.max(existingProgress.bestScore, score) === 5,
          attempts: { increment: 1 }
        }
      });
    } else {
      await prisma.subjectProgress.create({
        data: { userId, subject, level: parseInt(level), bestScore: score, mastered: isMastered, attempts: 1 }
      });
    }

    const newBadges = await checkMasteryBadges(userId);
    await updateUserLevel(userId);

    const pointsEarned = score * 10 + (score === 5 ? 50 : 0);
    await prisma.user.update({
      where: { id: userId },
      data: { totalPoints: { increment: pointsEarned } }
    });

    return NextResponse.json({ 
      success: true,
      newBadges,
      pointsEarned,
      showCelebration: newBadges.length > 0
    });
  } catch (error) {
    console.error('❌ Error finishing game:', error);
    return NextResponse.json({ success: false, error: 'فشل في حفظ النتيجة', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

async function checkMasteryBadges(userId: string) {
  const newBadges = [];
  const badges = await prisma.badge.findMany();
  const earnedBadgeIds = await prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } });
  const earnedIds = new Set(earnedBadgeIds.map(b => b.badgeId));

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;
    let earned = false;

    if (badge.isFinalBadge) {
      const allMastered = await prisma.subjectProgress.count({ where: { userId, mastered: true } });
      earned = allMastered >= (SUBJECTS.length * 5);
    } else {
      const masteredInLevel = await prisma.subjectProgress.count({ where: { userId, level: badge.requiredLevel, mastered: true } });
      earned = masteredInLevel >= SUBJECTS.length;
    }

    if (earned) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      newBadges.push(badge);
    }
  }
  return newBadges;
}

async function updateUserLevel(userId: string) {
  let highestMasteredLevel = 0;
  for (let level = 5; level >= 1; level--) {
    const count = await prisma.subjectProgress.count({ where: { userId, level, mastered: true } });
    if (count >= SUBJECTS.length) {
      highestMasteredLevel = level;
      break;
    }
  }
  await prisma.user.update({ where: { id: userId }, data: { playerLevel: highestMasteredLevel + 1 } });
}