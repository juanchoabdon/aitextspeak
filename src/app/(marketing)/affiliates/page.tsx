import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Affiliate Program - AI TextSpeak',
  description: 'Earn money promoting AI TextSpeak. Join our affiliate program and earn up to 30% commission on every referral.',
  openGraph: {
    title: 'Affiliate Program - AI TextSpeak',
    description: 'Earn up to 30% commission promoting AI TextSpeak.',
    url: 'https://aitextspeak.com/affiliates',
  },
};

export default function AffiliatesPage() {
  redirect('https://affiliates.aitextspeak.com');
}

