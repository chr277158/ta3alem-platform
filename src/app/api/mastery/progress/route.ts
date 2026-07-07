import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SUBJECTS = ['math', 'science', 'body', 'environment', 
                  'arabic', 'french', 'islamic', 'history'];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // جلب تقدم جميع المواد
    const allProgress = await prisma.subjectProgress.findMany({
      where: { userId }
    });

    // تحويل إلى object سهل الاستخدام
    const progress: any = {};
    allProgress.forEach(p => {
      progress[`${p.subject}_${p.level}`] = {
        mastered: p.mastered,
        bestScore: p.bestScore,
        attempts: p.attempts
      };
    });

    // حساب المستوى الحالي
    let currentLevel = 1;
    for (let level = 1; level <= 5; level++) {
      const masteredCount = allProgress.filter(
        p => p.level === level && p.mastered
      ).length;
      
      if (masteredCount < SUBJECTS.length) {
        currentLevel = level;
        break;
      }
      currentLevel = level + 1;
    }

    return NextResponse.json({ progress, currentLevel });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: 'فشل في جلب التقدم' }, { status: 500 });
  }
}