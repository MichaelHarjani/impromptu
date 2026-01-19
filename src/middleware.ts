import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import { sessionOptions } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to these paths without authentication
  const publicPaths = [
    '/access',
    '/api/auth/site-login',
    '/api/auth/session',
    '/admin/login',
    '/api/auth/login',
  ];

  // Check if the path is public
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Check for site access cookie
  const cookieName = sessionOptions.cookieName || 'impromptu_session';
  const cookie = request.cookies.get(cookieName);
  
  let hasAccess = false;

  if (cookie?.value) {
    try {
      const session = await unsealData(cookie.value, {
        password: sessionOptions.password,
      }) as { siteAccessGranted?: boolean };
      
      hasAccess = session.siteAccessGranted === true;
    } catch (error) {
      // Invalid cookie, no access
      hasAccess = false;
    }
  }

  if (!hasAccess) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    } else {
      const url = request.nextUrl.clone();
      url.pathname = '/access';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
