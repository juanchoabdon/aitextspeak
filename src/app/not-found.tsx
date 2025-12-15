'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Custom 404 Not Found Page
 * 
 * This page is shown when a route doesn't exist.
 * It automatically redirects to the home page.
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page immediately
    router.replace('/');
  }, [router]);

  // Show a brief loading state while redirecting
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <p className="text-slate-400 mb-6">Page not found. Redirecting...</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 font-semibold text-white hover:from-amber-400 hover:to-orange-500 transition-all"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
