import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SUBJECTS = ['math', 'science', 'body', 'environment', 
                  'arabic', 'french', 'islamic', 'history'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, subject, level, score, totalQuestions, heartsLost, hintsUsed } = body;

    console.log('🎮 Game finish attempt:', { userId, subject, level, score, totalQuestions });

    if (!userId || !subject || !level || score === undefined) {
      return NextResponse.json(
        { success: false, error: 'المعاملات المطلوبة: userId, subject, level, score' },
        { status: 400 }
      );
    }

    // التحقق من وجود المستخدم
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log('❌ User not found:', userId);
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // 1. حفظ نتيجة اللعبة
    const gameResult = await prisma.gameResult.create({
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

    console.log('✅ Game result saved:', gameResult.id);

    // 2. تحديث تقدم المادة
    const isMastered = score === 5; // 5/5 فقط = إتقان
    
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
        data: {
          userId,
          subject,
          level: parseInt(level),
          bestScore: score,
          mastered: isMastered,
          attempts: 1
        }
      });
    }

    console.log('✅ Subject progress updated');

    // 3. التحقق من شهادات الإتقان
    const newBadges = await checkMasteryBadges(userId);
    
    // 4. تحديث المستوى العام للطفل
    await updateUserLevel(userId);

    // 5. تحديث النقاط
    const pointsEarned = score * 10 + (score === 5 ? 50 : 0);
    await prisma.user.update({
      where: { id: userId },
      data: { totalPoints: { increment: pointsEarned } }
    });

    console.log('✅ Points updated:', pointsEarned);

    return NextResponse.json({ 
      success: true,
      gameResult,
      newBadges,
      pointsEarned,
      showCelebration: newBadges.length > 0
    });
  } catch (error) {
    console.error('❌ Error finishing game:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'فشل في حفظ النتيجة',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function checkMasteryBadges(userId: string) {
  const newBadges = [];
  
  const badges = await prisma.badge.findMany();
  const earnedBadgeIds = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true }
  });
  const earnedIds = new Set(earnedBadgeIds.map(b => b.badgeId));

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;

    let earned = false;

    if (badge.isFinalBadge) {
      const allMastered = await prisma.subjectProgress.count({
        where: { userId, mastered: true }
      });
      earned = allMastered >= (SUBJECTS.length * 5);
    } else {
      const masteredInLevel = await prisma.subjectProgress.count({
        where: { 
          userId, 
          level: badge.requiredLevel, 
          mastered: true 
        }
      });
      earned = masteredInLevel >= SUBJECTS.length;
    }

    if (earned) {
      await prisma.userBadge.create({
        data: { userId, badgeId: badge.id }
      });
      newBadges.push(badge);
      console.log('🏆 Badge earned:', badge.displayName);
    }
  }

  return newBadges;
}

async function updateUserLevel(userId: string) {
  let highestMasteredLevel = 0;
  
  for (let level = 5; level >= 1; level--) {
    const count = await prisma.subjectProgress.count({
      where: { userId, level, mastered: true }
    });
    if (count >= SUBJECTS.length) {
      highestMasteredLevel = level;
      break;
    }
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { playerLevel: highestMasteredLevel + 1 }
  });
}