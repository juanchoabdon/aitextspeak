import type { Metadata } from 'next';
import Link from 'next/link';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Logo } from '@/components/ui/Logo';

export const metadata: Metadata = {
  title: 'Sign Up - AI TextSpeak',
  description: 'Create your AI TextSpeak account and start generating professional voiceovers.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
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
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="mt-2 text-slate-400">
              Get started with AI TextSpeak for free
            </p>
          </div>

          {/* Google Sign Up */}
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

          {/* Sign Up Form */}
          <SignUpForm />

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-slate-500">
            By signing up, you agree to our{' '}
            <Link href="/terms-of-service" className="text-amber-500 hover:text-amber-400">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="text-amber-500 hover:text-amber-400">
              Privacy Policy
            </Link>
          </p>

          {/* Sign In Link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-amber-500 hover:text-amber-400 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
