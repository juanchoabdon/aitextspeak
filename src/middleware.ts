import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/settings',
  '/billing',
];

/**
 * Auth routes (redirect if already logged in)
 */
const AUTH_ROUTES = [
  '/auth/signin',
  '/auth/signup',
];

/**
 * Get the hostname from the request
 */
function getHostname(request: NextRequest): string {
  const host = request.headers.get('host') || '';
  return host.split(':')[0]; // Remove port if present
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = getHostname(request);

  // ========================================
  // LEGACY SUBDOMAIN REDIRECT
  // Redirect app.aitextspeak.com → aitextspeak.com
  // ========================================
  if (hostname.startsWith('app.')) {
    const mainDomain = hostname.replace('app.', '');
    const newUrl = new URL(pathname, `https://${mainDomain}`);
    newUrl.search = request.nextUrl.search; // Preserve query params
    return NextResponse.redirect(newUrl, { status: 301 }); // Permanent redirect
  }

  // Update Supabase session
  const { supabaseResponse, user, profile } = await updateSession(request);

  // Check if trying to access protected route without auth
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = AUTH_ROUTES.some(route => 
    pathname.startsWith(route)
  );

  if (isAuthRoute && user) {
    // Redirect admin to /admin, regular users to /dashboard
    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
