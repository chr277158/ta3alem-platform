import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'غير مصرح - يجب تسجيل الدخول' }, { status: 401 });
    }

    const userId = sessionCookie.value;
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const levelParam = searchParams.get('level');

    if (!subject) {
      return NextResponse.json({ success: false, error: 'المعاملات المطلوبة: subject' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const parsedLevel = levelParam ? parseInt(levelParam, 10) : user.playerLevel || 1;
    const level = Number.isInteger(parsedLevel) && parsedLevel > 0 ? parsedLevel : 1;

    const allQuestions = await prisma.question.findMany({
      where: { subject, level }
    });

    if (allQuestions.length === 0) {
      return NextResponse.json({ success: false, error: `لا توجد أسئلة لمادة ${subject} مستوى ${level}` }, { status: 404 });
    }

    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    const questions = selected.map((q) => {
      const options = JSON.parse(q.options);
      const correctAnswer = typeof q.correctAnswer === 'number' && options[q.correctAnswer]
        ? options[q.correctAnswer]
        : String(q.correctAnswer);

      return {
        id: q.id,
        question: q.question,
        options,
        correctAnswer,
        explanation: q.explanation
      };
    });

    return NextResponse.json({ success: true, questions, total: allQuestions.length });
  } catch (error) {
    console.error('❌ Error in /api/game/questions:', error);
    return NextResponse.json({ success: false, error: 'فشل في جلب الأسئلة', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}