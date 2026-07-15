import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  
  // حماية مسارات اللعبة والبيانات الحساسة
  if (request.nextUrl.pathname.startsWith('/api/game') || request.nextUrl.pathname.startsWith('/api/daily')) {
    if (!sessionCookie) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    // هنا يمكنك مستقبلاً إضافة التحقق من صحة التوكن (JWT Verification)
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/game/:path*', '/api/daily/:path*'],
};