'use client';

import { useState } from 'react';

export type CancellationReason = 
  | 'too_expensive'
  | 'missing_features'
  | 'switched_service'
  | 'not_using'
  | 'technical_issues'
  | 'customer_service'
  | 'temporary_pause'
  | 'other';

const CANCELLATION_REASONS: { value: CancellationReason; label: string; emoji: string }[] = [
  { value: 'too_expensive', label: "It's too expensive", emoji: '💰' },
  { value: 'missing_features', label: "Missing features I need", emoji: '🔧' },
  { value: 'switched_service', label: "Switched to another service", emoji: '🔄' },
  { value: 'not_using', label: "I'm not using it enough", emoji: '📭' },
  { value: 'technical_issues', label: "Technical issues / bugs", emoji: '🐛' },
  { value: 'customer_service', label: "Customer service experience", emoji: '😞' },
  { value: 'temporary_pause', label: "Just need a break, might return", emoji: '⏸️' },
  { value: 'other', label: "Other reason", emoji: '📝' },
];

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: CancellationReason, comment: string) => Promise<void>;
  planName: string;
  periodEnd?: string | null;
}

export function CancellationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  planName,
  periodEnd 
}: CancellationModalProps) {
  const [step, setStep] = useState<'reason' | 'confirm' | 'processing'>('reason');
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReasonSelect = (reason: CancellationReason) => {
    setSelectedReason(reason);
    setError(null);
  };

  const handleContinue = () => {
    if (!selectedReason) {
      setError('Please select a reason for cancelling');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedReason) return;
    
    setStep('processing');
    setError(null);
    
    try {
      await onConfirm(selectedReason, comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      setStep('confirm');
    }
  };

  const handleClose = () => {
    setStep('reason');
    setSelectedReason(null);
    setComment('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">
            {step === 'reason' ? 'Before you go...' : 
             step === 'confirm' ? 'Confirm Cancellation' :
             'Processing...'}
          </h2>
          {step !== 'processing' && (
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'reason' && (
            <>
              <p className="text-slate-300 mb-4">
                We&apos;re sorry to see you go! Help us improve by telling us why you&apos;re cancelling:
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {CANCELLATION_REASONS.map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => handleReasonSelect(reason.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedReason === reason.value
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xl">{reason.emoji}</span>
                    <span className="font-medium">{reason.label}</span>
                    {selectedReason === reason.value && (
                      <svg className="ml-auto h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Optional comment */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Anything else you&apos;d like to share? (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us more about your experience..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
                >
                  Keep My Subscription
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 transition-colors"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Are you sure you want to cancel?
                </h3>
                <p className="text-slate-400">
                  Your <span className="text-white font-medium">{planName}</span> subscription will be cancelled.
                </p>
              </div>

              {periodEnd && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-amber-400 text-sm">
                    <span className="font-medium">Good news!</span> You&apos;ll still have access until{' '}
                    <span className="font-semibold">
                      {new Date(periodEnd).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 mb-6">
                <p className="text-sm text-slate-400 mb-1">Cancellation reason:</p>
                <p className="text-white font-medium">
                  {CANCELLATION_REASONS.find(r => r.value === selectedReason)?.emoji}{' '}
                  {CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label}
                </p>
                {comment && (
                  <p className="text-slate-400 text-sm mt-2 italic">&quot;{comment}&quot;</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('reason')}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 transition-colors"
                >
                  Cancel Subscription
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <svg className="animate-spin h-12 w-12 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-white font-medium">Cancelling your subscription...</p>
              <p className="text-slate-400 text-sm mt-2">Please wait, this may take a moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

