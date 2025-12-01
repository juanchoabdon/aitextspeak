import Link from 'next/link';

/**
 * App Layout
 * Used for authenticated pages on app.aitextspeak.com
 * Simpler header, no marketing footer
 */
export default function AppLayout({
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
              href="https://aitextspeak.com" 
              className="flex items-center gap-2 text-xl font-bold"
            >
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                AI TextSpeak
              </span>
            </Link>

            {/* Right side - will be populated with user menu when authenticated */}
            <div className="flex items-center gap-4">
              {/* This will be replaced with actual user menu */}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-800/50 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} AI TextSpeak
            </p>
            <div className="flex items-center gap-6">
              <Link 
                href="https://aitextspeak.com/privacy-policy" 
                className="text-sm text-slate-500 hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link 
                href="https://aitextspeak.com/terms-of-service" 
                className="text-sm text-slate-500 hover:text-white transition-colors"
              >
                Terms
              </Link>
              <Link 
                href="https://aitextspeak.com/contact" 
                className="text-sm text-slate-500 hover:text-white transition-colors"
              >
                Help
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

