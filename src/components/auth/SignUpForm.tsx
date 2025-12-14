'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp } from '@/lib/auth/actions';
import { trackSignupStarted, trackSignupCompleted, trackAuthError } from '@/lib/analytics/events';

function trackFirstPromoterReferral(uid: string) {
  try {
    // Best-effort: FirstPromoter script initializes window.fpr early; if unavailable just skip.
    if (typeof window !== 'undefined' && typeof window.fpr === 'function') {
      window.fpr('referral', { uid });
    }
  } catch {
    // no-op
  }
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customRedirect, setCustomRedirect] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const hasTrackedStart = useRef(false);

  useEffect(() => {
    const redirect = searchParams.get('redirect');
    const plan = searchParams.get('plan');
    
    if (redirect) {
      setCustomRedirect(redirect);
    } else if (plan && plan !== 'free') {
      // If user came from pricing with a paid plan, redirect to pricing with checkout param
      setCheckoutPlan(plan);
    }
    
    // Track signup started (only once)
    if (!hasTrackedStart.current) {
      const source = searchParams.get('source') || (plan ? 'pricing' : redirect ? 'cta' : 'direct');
      trackSignupStarted(source);
      hasTrackedStart.current = true;
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp({
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      if (result.success && result.user) {
        trackFirstPromoterReferral(result.user.id);

        // Track signup completed
        trackSignupCompleted(result.user.id, 'email', result.user.email);
        
        // Determine where to redirect
        let redirectTo: string;
        
        if (customRedirect) {
          // Custom redirect takes priority (e.g., from hero demo)
          redirectTo = customRedirect;
        } else if (checkoutPlan) {
          // Paid plan checkout flow
          redirectTo = `/pricing?checkout=${checkoutPlan}`;
        } else if (result.welcomeProjectId) {
          // New user - go directly to their first project
          redirectTo = `/dashboard/projects/${result.welcomeProjectId}`;
        } else {
          // Fallback to dashboard
          redirectTo = '/dashboard';
        }
        
        router.push(redirectTo);
        router.refresh();
      } else {
        const errorMsg = result.error || 'Failed to create account';
        setError(errorMsg);
        trackAuthError('signup', errorMsg, 'email');
      }
    } catch {
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      trackAuthError('signup', errorMsg, 'email');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-slate-300">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="John"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-slate-300">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="••••••••"
        />
        <p className="mt-1 text-xs text-slate-500">Minimum 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-lg font-semibold text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Creating account...
          </span>
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  );
}

