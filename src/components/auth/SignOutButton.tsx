'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/actions';

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    
    try {
      await signOut();
      router.push('/auth/signin');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
    >
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}

