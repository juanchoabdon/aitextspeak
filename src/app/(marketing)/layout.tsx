import Link from 'next/link';

/**
 * Marketing Layout
 * Used for all public-facing pages on the root domain
 * Includes header with navigation and footer
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-2 text-xl font-bold"
            >
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                AI TextSpeak
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <Link 
                href="/" 
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link 
                href="/pricing" 
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Pricing
              </Link>
              <Link 
                href="/blog" 
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Blog
              </Link>
              <Link 
                href="/affiliates" 
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Affiliates
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="https://app.aitextspeak.com/auth/signin"
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="https://app.aitextspeak.com/auth/signup"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all"
              >
                Get Started
              </Link>
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
                    Blog
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

