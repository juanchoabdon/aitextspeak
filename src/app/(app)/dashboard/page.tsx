import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const metadata: Metadata = {
  title: 'Dashboard - AI TextSpeak',
  description: 'Your AI TextSpeak dashboard.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const profile = await getUserProfile(user.id);

  return (
    <div className="w-full max-w-4xl px-4 py-8">
      {/* Welcome Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome{profile?.first_name ? `, ${profile.first_name}` : ''}! 👋
            </h1>
            <p className="mt-2 text-slate-400">
              {user.email}
            </p>
            {profile?.is_legacy_user && (
              <span className="mt-2 inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
                Legacy Account Migrated ✓
              </span>
            )}
          </div>
          <SignOutButton />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Generate Speech Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">Generate Speech</h3>
          <p className="mt-2 text-sm text-slate-400">
            Convert your text to natural-sounding audio
          </p>
          <button
            className="mt-4 w-full rounded-xl bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Start Creating
          </button>
        </div>

        {/* My Audio Files Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">My Audio Files</h3>
          <p className="mt-2 text-sm text-slate-400">
            View and download your generated audio
          </p>
          <button
            className="mt-4 w-full rounded-xl bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            View Files
          </button>
        </div>

        {/* Account Settings Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">Settings</h3>
          <p className="mt-2 text-sm text-slate-400">
            Manage your account and preferences
          </p>
          <button
            className="mt-4 w-full rounded-xl bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Open Settings
          </button>
        </div>
      </div>

      {/* Usage Stats Placeholder */}
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
        <h2 className="text-xl font-semibold text-white">Usage This Month</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-400">Characters Used</p>
            <p className="mt-1 text-3xl font-bold text-white">0 <span className="text-lg text-slate-500">/ 5,000</span></p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Audio Generated</p>
            <p className="mt-1 text-3xl font-bold text-white">0 <span className="text-lg text-slate-500">files</span></p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Plan</p>
            <p className="mt-1 text-3xl font-bold text-white">Free</p>
            <Link 
              href="https://aitextspeak.com/pricing"
              className="mt-2 inline-block text-sm text-amber-500 hover:text-amber-400"
            >
              Upgrade →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

