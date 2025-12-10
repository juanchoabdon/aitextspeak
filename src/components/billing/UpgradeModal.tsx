'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  currentPlan?: string;
  charactersUsed?: number;
  charactersLimit?: number;
}

export function UpgradeModal({
  isOpen,
  onClose,
  title = "Upgrade Your Plan",
  message = "You've reached your monthly character limit. Upgrade to continue creating amazing voiceovers!",
  currentPlan = "Free",
  charactersUsed = 0,
  charactersLimit = 0,
}: UpgradeModalProps) {
  const router = useRouter();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    router.push('/pricing');
  };

  const percentUsed = charactersLimit > 0 ? Math.min(100, (charactersUsed / charactersLimit) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {title}
        </h2>

        {/* Current Plan Badge */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-800 text-slate-300">
            Current Plan: <span className="ml-1 text-amber-400">{currentPlan}</span>
          </span>
        </div>

        {/* Usage Bar */}
        {charactersLimit > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Characters Used</span>
              <span className="text-white">
                {charactersUsed.toLocaleString()} / {charactersLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  percentUsed >= 100 ? 'bg-red-500' : percentUsed >= 80 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>
        )}

        {/* Message */}
        <p className="text-slate-400 text-center mb-6">
          {message}
        </p>

        {/* Benefits */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-white mb-3">Upgrade to get:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Up to unlimited characters/month
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              All premium AI voices
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Commercial usage rights
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpgrade}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 font-semibold text-white hover:from-amber-400 hover:to-orange-500 transition-all"
          >
            View Upgrade Options
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-700 py-3 font-medium text-slate-400 hover:text-white hover:border-slate-600 transition-all"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}



