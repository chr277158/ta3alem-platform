import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  
  if (
    request.nextUrl.pathname.startsWith('/api/game') || 
    request.nextUrl.pathname.startsWith('/api/daily') ||
    request.nextUrl.pathname.startsWith('/api/user')
  ) {
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'غير مصرح - يجب تسجيل الدخول أولاً' }, 
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/game/:path*', '/api/daily/:path*', '/api/user/:path*'],
};