import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Route API requests through normally
  if (url.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Define our hostnames
  const isAppDomain = hostname === 'in.indecode.in' || hostname === 'in.localhost:3000';
  const isLandingDomain = hostname === 'indecode.in' || hostname === 'www.indecode.in' || hostname === 'localhost:3000';

  if (isAppDomain) {
    if (url.pathname === '/') {
      url.pathname = '/dashboard';
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (isLandingDomain) {
    // If they go to /dashboard directly on the landing domain, we can either 404 them or let it pass
    // For now, we let standard Next.js routing handle the landing domain
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
