import Link from 'next/link';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { UserDropdown } from '@/components/auth/UserDropdown';
import { Logo } from '@/components/ui/Logo';
import { NavLinks } from '@/components/ui/NavLinks';
import { getFeaturedServices } from '@/lib/services/db';

// Force SSR for all marketing pages (uses cookies for auth)
export const dynamic = 'force-dynamic';

/**
 * Get user initials from email or name
 */
function getInitials(email: string, firstName?: string | null, lastName?: string | null): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  // Use first two chars of email
  return email.slice(0, 2).toUpperCase();
}

/**
 * Marketing Layout
 * Used for all public-facing pages
 * Includes header with navigation and footer
 * Shows different auth buttons based on login state
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const isLoggedIn = !!user;
  
  // Fetch featured services for navbar dropdown
  const featuredServices = await getFeaturedServices(4);
  
  let initials = '';
  let isAdmin = false;
  if (user) {
    const profile = await getUserProfile(user.id);
    initials = getInitials(user.email!, profile?.first_name, profile?.last_name);
    isAdmin = profile?.role === 'admin';
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Logo href="/" size="md" />

            {/* Navigation Links */}
            <NavLinks featuredServices={featuredServices.map(s => ({
              slug: s.slug,
              name: s.name,
              icon: s.icon,
              short_description: s.short_description,
            }))} />

            {/* Auth Buttons - Dynamic based on login state */}
            <div className="flex items-center gap-3">
              {isLoggedIn && user ? (
                <>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Admin
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      My Projects
                    </Link>
                  )}
                  <UserDropdown email={user.email!} initials={initials} />
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all cursor-pointer"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-white">Product</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Resources
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-white">Company</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/affiliates" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Affiliates
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-white">Legal</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/privacy-policy" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-sm font-semibold text-white">Stay Updated</h3>
              <p className="mt-4 text-sm text-slate-400">
                Get the latest AI voice generation tips and updates.
              </p>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-800/50 pt-8">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} AI TextSpeak. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
