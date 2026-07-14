import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  try {
    const { userId, avatar } = await req.json();

    if (!userId || !avatar) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar }
    });

    return NextResponse.json({ success: true, avatar: updatedUser.avatar });
  } catch (error) {
    console.error('Error updating avatar:', error);
    return NextResponse.json({ error: 'فشل في تحديث الشخصية' }, { status: 500 });
  }
}