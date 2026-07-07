import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, score, totalQuestions } = body;

    console.log('🎯 Daily finish attempt:', { userId, score, totalQuestions });

    if (!userId || score === undefined) {
      return NextResponse.json(
        { success: false, error: 'المعاملات المطلوبة: userId, score' },
        { status: 400 }
      );
    }

    // التحقق من وجود المستخدم
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // ✅ تحديث تاريخ آخر تحدي يومي
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log('📅 Saving lastDailyDate:', today);
    
    await prisma.user.update({
      where: { id: userId },
      data: { 
        lastDailyDate: today,
        totalPoints: { increment: score * 15 }, // 15 نقطة لكل إجابة صحيحة
        streakDays: { increment: 1 }
      }
    });

    console.log('✅ Daily challenge completed and saved');

    return NextResponse.json({ 
      success: true,
      pointsEarned: score * 15
    });
  } catch (error) {
    console.error('❌ Error finishing daily challenge:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'فشل في حفظ نتيجة التحدي اليومي',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}