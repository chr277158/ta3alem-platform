// src/app/api/game/questions/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    // 🔑 قراءة userId من الكوكيز الآمنة
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'غير مصرح - يجب تسجيل الدخول' },
        { status: 401 }
      );
    }
    
    const userId = sessionCookie.value;
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const levelParam = searchParams.get('level');

    console.log('📡 API /game/questions - params:', { subject, levelParam, userId });

    if (!subject || !levelParam) {
      return NextResponse.json(
        { error: 'المعاملات المطلوبة: subject, level' },
        { status: 400 }
      );
    }

    const level = parseInt(levelParam);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const allQuestions = await prisma.question.findMany({
      where: {
        subject: subject,
        level: level
      }
    });

    console.log(`📚 Found ${allQuestions.length} questions for ${subject} level ${level}`);

    if (allQuestions.length === 0) {
      return NextResponse.json(
        { error: `لا توجد أسئلة لمادة ${subject} مستوى ${level}` },
        { status: 404 }
      );
    }

    // خلط الأسئلة وأخذ أول 5
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    const questions = selected.map(q => ({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));

    return NextResponse.json({ 
      questions,
      total: allQuestions.length
    });
  } catch (error) {
    console.error('❌ Error in /api/game/questions:', error);
    return NextResponse.json(
      {
        error: 'فشل في جلب الأسئلة',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}