// src/app/api/game/questions/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const levelParam = searchParams.get('level');
    const userId = searchParams.get('userId');

    console.log('📡 API /game/questions - params:', { subject, levelParam, userId });

    if (!subject || !levelParam || !userId) {
      return NextResponse.json(
        { error: 'المعاملات المطلوبة: subject, level, userId' },
        { status: 400 }
      );
    }

    // 🔑 الحل الأساسي: تحويل level إلى number
    const level = parseInt(levelParam);

    // التحقق من وجود المستخدم
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // 🔍 استعلام مع تحويل level إلى number
    const allQuestions = await prisma.question.findMany({
      where: {
        subject: subject,
        level: level  // ← هنا level هو number الآن
      }
    });

    console.log(`📚 Found ${allQuestions.length} questions for ${subject} level ${level}`);

    if (allQuestions.length === 0) {
      // 💡 تشخيص: ما هي الأسئلة الموجودة فعلاً؟
      const allInDb = await prisma.question.groupBy({
        by: ['subject', 'level'],
        _count: { id: true }
      });
      console.log('📊 الأسئلة الموجودة في قاعدة البيانات:', allInDb);
      
      return NextResponse.json(
        { 
          error: `لا توجد أسئلة لمادة ${subject} مستوى ${level}`,
          available: allInDb
        },
        { status: 404 }
      );
    }

    // خلط الأسئلة وأخذ أول 5
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    // تحويل options من JSON string إلى array
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