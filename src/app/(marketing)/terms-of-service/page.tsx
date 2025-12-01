import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - AI TextSpeak',
  description: 'Read the terms and conditions for using AI TextSpeak text-to-speech services.',
  openGraph: {
    title: 'Terms of Service - AI TextSpeak',
    description: 'Terms and conditions for AI TextSpeak.',
    url: 'https://aitextspeak.com/terms-of-service',
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
        <p className="mt-4 text-slate-400">Last updated: December 1, 2024</p>

        <div className="mt-12 prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using AI TextSpeak (&quot;the Service&quot;), you agree to be bound by these 
            Terms of Service. If you do not agree to these terms, please do not use our Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            AI TextSpeak provides an AI-powered text-to-speech conversion service that transforms 
            written text into natural-sounding audio. The Service is available through our website 
            and may include additional features based on your subscription plan.
          </p>

          <h2>3. Account Registration</h2>
          <p>To use our Service, you must:</p>
          <ul>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Be at least 13 years of age (or the minimum age in your jurisdiction)</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>

          <h2>4. Subscription and Payments</h2>
          <h3>4.1 Billing</h3>
          <p>
            Paid subscriptions are billed in advance on a monthly or annual basis. You authorize 
            us to charge your payment method for all fees associated with your subscription.
          </p>
          
          <h3>4.2 Cancellation</h3>
          <p>
            You may cancel your subscription at any time. Cancellation takes effect at the end 
            of your current billing period. No refunds are provided for partial periods.
          </p>

          <h3>4.3 Price Changes</h3>
          <p>
            We reserve the right to modify pricing with 30 days&apos; notice. Changes will not affect 
            your current billing period.
          </p>

          <h2>5. Acceptable Use</h2>
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Generate content that is illegal, harmful, or violates others&apos; rights</li>
            <li>Create deepfakes or impersonate real individuals without consent</li>
            <li>Distribute malware or engage in phishing</li>
            <li>Violate intellectual property rights</li>
            <li>Circumvent usage limits or security measures</li>
            <li>Resell or redistribute the Service without authorization</li>
          </ul>

          <h2>6. Intellectual Property</h2>
          <h3>6.1 Your Content</h3>
          <p>
            You retain ownership of the text content you submit. You grant us a license to 
            process your content solely for providing the Service.
          </p>

          <h3>6.2 Generated Audio</h3>
          <p>
            Pro and Business subscribers receive a commercial license to use generated audio 
            for any lawful purpose. Free tier users may use audio for personal, non-commercial purposes.
          </p>

          <h3>6.3 Our Property</h3>
          <p>
            The Service, including its technology, branding, and documentation, is owned by 
            AI TextSpeak and protected by intellectual property laws.
          </p>

          <h2>7. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE 
            UNINTERRUPTED OR ERROR-FREE SERVICE, OR THAT RESULTS WILL MEET YOUR EXPECTATIONS.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AI TEXTSPEAK SHALL NOT BE LIABLE FOR ANY 
            INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF 
            THE SERVICE.
          </p>

          <h2>9. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless AI TextSpeak from any claims, damages, or 
            expenses arising from your use of the Service or violation of these Terms.
          </p>

          <h2>10. Termination</h2>
          <p>
            We may suspend or terminate your account for violations of these Terms or for any 
            reason with notice. Upon termination, your right to use the Service ceases immediately.
          </p>

          <h2>11. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. Continued use of the Service after changes 
            constitutes acceptance of the modified Terms.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction where AI TextSpeak is 
            incorporated, without regard to conflict of law principles.
          </p>

          <h2>13. Contact</h2>
          <p>
            For questions about these Terms, please contact us at:
          </p>
          <p>
            Email: <a href="mailto:legal@aitextspeak.com" className="text-amber-500">legal@aitextspeak.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

