import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Logo } from '@/components/ui/Logo';

interface DashboardHeaderProps {
  email: string;
  isAdmin?: boolean;
}

export function DashboardHeader({ email, isAdmin = false }: DashboardHeaderProps) {
  return (
    <header className={`sticky top-0 z-50 border-b ${isAdmin ? 'border-red-500/20 bg-slate-950/95' : 'border-slate-800/50 bg-slate-950/80'} backdrop-blur-xl`}>
      <nav className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Logo href="/" size="md" />
            {isAdmin && (
              <span className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400">
                ADMIN
              </span>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">{email}</span>
            {isAdmin && (
              <Link
                href="/dashboard"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                User View
              </Link>
            )}
            {!isAdmin && (
              <Link
                href="/admin"
                className="text-sm text-red-400 hover:text-red-300 transition-colors hidden"
                id="admin-link"
              >
                Admin
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
