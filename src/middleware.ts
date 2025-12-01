import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
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
 * Get the hostname for multi-domain support
 */
function getHostname(request: NextRequest): string {
  const host = request.headers.get('host') || '';
  // Remove port if present (for local development)
  return host.split(':')[0];
}

/**
 * Check if the request is for the app subdomain
 */
function isAppSubdomain(hostname: string): boolean {
  return hostname.startsWith('app.') || 
         hostname === 'localhost' || // For local dev
         hostname === '127.0.0.1';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = getHostname(request);

  // Update Supabase session
  const { supabaseResponse, user } = await updateSession(request);

  // ========================================
  // APP SUBDOMAIN ROUTING
  // ========================================
  if (isAppSubdomain(hostname)) {
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
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ========================================
  // MARKETING DOMAIN ROUTING
  // ========================================
  if (!isAppSubdomain(hostname)) {
    // Redirect any /auth/* or /dashboard/* to app subdomain
    if (pathname.startsWith('/auth/') || pathname.startsWith('/dashboard')) {
      const appUrl = new URL(pathname, process.env.NEXT_PUBLIC_APP_URL);
      return NextResponse.redirect(appUrl);
    }
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
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

