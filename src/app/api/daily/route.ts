import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    console.log('📡 API /daily - userId:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

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

    // ✅ التحقق من آخر تحدي يومي
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log('📅 Today:', today, '| Last daily:', user.lastDailyDate);
    
    if (user.lastDailyDate === today) {
      console.log('⚠️ Already completed today!');
      return NextResponse.json({
        error: 'لقد أكملت التحدي اليومي اليوم! عد غداً لمحاولة جديدة 🎯',
        completed: true
      });
    }

    // جلب 3 أسئلة عشوائية من مستويات مختلفة
    const allQuestions = await prisma.question.findMany({
      where: {
        level: {
          in: [1, 2, 3]
        }
      }
    });

    if (allQuestions.length < 3) {
      return NextResponse.json(
        { error: 'لا توجد أسئلة كافية للتحدي اليومي' },
        { status: 404 }
      );
    }

    // خلط الأسئلة وأخذ 3
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    // تحويل options من JSON string إلى array
    const questions = selected.map(q => ({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));

    console.log('✅ Daily challenge ready');

    return NextResponse.json({ 
      questions,
      completed: false
    });
  } catch (error) {
    console.error('❌ Error in /api/daily:', error);
    return NextResponse.json(
      { 
        error: 'فشل في جلب التحدي اليومي',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}