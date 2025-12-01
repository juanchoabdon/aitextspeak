import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - AI TextSpeak',
  description: 'Learn how AI TextSpeak collects, uses, and protects your personal information.',
  openGraph: {
    title: 'Privacy Policy - AI TextSpeak',
    description: 'Learn how AI TextSpeak protects your privacy.',
    url: 'https://aitextspeak.com/privacy-policy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-4 text-slate-400">Last updated: December 1, 2024</p>

        <div className="mt-12 prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white">
          <h2>1. Introduction</h2>
          <p>
            AI TextSpeak (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
            when you use our text-to-speech service.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li>Account information (email, name, password)</li>
            <li>Payment information (processed securely by our payment providers)</li>
            <li>Text content you submit for conversion to speech</li>
            <li>Communication with our support team</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <ul>
            <li>Device and browser information</li>
            <li>IP address and location data</li>
            <li>Usage patterns and preferences</li>
            <li>Cookies and similar technologies</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul>
            <li>Provide and improve our text-to-speech services</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send service-related communications</li>
            <li>Provide customer support</li>
            <li>Analyze usage to improve our platform</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>4. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to provide our services 
            and fulfill the purposes described in this policy. Text content submitted for conversion 
            is processed and not stored beyond the generation of audio files.
          </p>

          <h2>5. Data Sharing</h2>
          <p>We may share your information with:</p>
          <ul>
            <li>Payment processors (Stripe, PayPal) for transaction processing</li>
            <li>Service providers who assist in operating our platform</li>
            <li>Legal authorities when required by law</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>

          <h2>6. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and associated data</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2>7. Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your 
            personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2>8. Cookies</h2>
          <p>
            We use cookies and similar technologies to enhance your experience, analyze usage, 
            and remember your preferences. You can control cookie settings through your browser.
          </p>

          <h2>9. Children&apos;s Privacy</h2>
          <p>
            Our service is not intended for children under 13. We do not knowingly collect 
            personal information from children under 13.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant 
            changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, please contact us at:
          </p>
          <p>
            Email: <a href="mailto:privacy@aitextspeak.com" className="text-amber-500">privacy@aitextspeak.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

