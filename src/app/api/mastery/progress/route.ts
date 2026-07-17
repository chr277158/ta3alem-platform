import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const SUBJECTS = ['math', 'science', 'body', 'environment', 'arabic', 'french', 'islamic', 'history'];

export async function GET(req: Request) {
  try {
    // 🔑 قراءة userId من الكوكيز الآمنة
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'غير مصرح - يجب تسجيل الدخول' }, { status: 401 });
    }
    
    const userId = sessionCookie.value;

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