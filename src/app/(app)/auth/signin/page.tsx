import type { Metadata } from 'next';
import Link from 'next/link';
import { SignInForm } from '@/components/auth/SignInForm';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Logo } from '@/components/ui/Logo';

export const metadata: Metadata = {
  title: 'Sign In - AI TextSpeak',
  description: 'Sign in to your AI TextSpeak account.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo - Back to Home */}
        <div className="text-center mb-8 flex justify-center">
          <Logo href="/" size="lg" />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            <p className="mt-2 text-slate-400">
              Sign in to continue to AI TextSpeak
            </p>
          </div>

          {/* Google Sign In */}
          <div className="mt-6">
            <GoogleSignInButton />
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-900 px-4 text-slate-500">or continue with email</span>
            </div>
          </div>

          {/* Sign In Form */}
          <SignInForm />

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-amber-500 hover:text-amber-400 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
