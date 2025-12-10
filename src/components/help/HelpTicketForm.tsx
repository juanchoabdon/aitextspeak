'use client';

import { useState } from 'react';
import { submitSupportTicket } from '@/lib/support/actions';

const CATEGORIES = [
  { value: 'general', label: 'General Question' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'account', label: 'Account Help' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'bug', label: 'Report a Bug' },
  { value: 'other', label: 'Other' },
];

interface HelpTicketFormProps {
  prefillEmail?: string;
  prefillName?: string;
}

export function HelpTicketForm({ prefillEmail, prefillName }: HelpTicketFormProps = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      category: formData.get('category') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    };

    try {
      const result = await submitSupportTicket(data);

      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || 'Failed to submit ticket');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Ticket Submitted!</h3>
        <p className="text-slate-400 mb-6">
          Thank you for reaching out. We&apos;ll get back to you within 24 hours.
        </p>
        <button
          onClick={() => {
            setIsSuccess(false);
            setError(null);
          }}
          className="text-amber-500 hover:text-amber-400 font-medium"
        >
          Submit Another Ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={prefillName || ''}
            className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            defaultValue={prefillEmail || ''}
            readOnly={!!prefillEmail}
            className={`mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 ${prefillEmail ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-slate-300">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-slate-300">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="Brief description of your issue"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-300">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
          placeholder="Please describe your issue or question in detail..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/30 hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Submit Ticket
          </>
        )}
      </button>

      <p className="text-sm text-slate-500 text-center">
        We typically respond within 24 hours during business days.
      </p>
    </form>
  );
}
