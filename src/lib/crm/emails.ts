/**
 * CRM Email Templates
 * 
 * Email templates for automated CRM campaigns
 */

import { sendEmail } from '@/lib/email/brevo';

// Base email template wrapper
function wrapEmailTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">

<!-- Logo -->
<tr><td align="center" style="padding-bottom:30px;">
<a href="https://www.aitextspeak.com" style="text-decoration:none;">
<h1 style="margin:0;font-size:28px;font-weight:bold;"><span style="color:#f59e0b;">AI</span><span style="color:#ffffff;">TextSpeak</span></h1>
</a>
</td></tr>

<!-- Main Content -->
<tr><td style="background-color:#1e293b;border-radius:16px;padding:40px;">
${content}
</td></tr>

<!-- Footer -->
<tr><td align="center" style="padding-top:30px;">
<p style="margin:0 0 10px;font-size:12px;color:#64748b;">
<a href="https://www.aitextspeak.com/help" style="color:#94a3b8;text-decoration:none;">Help</a> · 
<a href="https://www.aitextspeak.com/privacy-policy" style="color:#94a3b8;text-decoration:none;">Privacy</a> · 
<a href="https://www.aitextspeak.com/terms-of-service" style="color:#94a3b8;text-decoration:none;">Terms</a>
</p>
<p style="margin:0;font-size:12px;color:#64748b;">© ${new Date().getFullYear()} AI TextSpeak. All rights reserved.</p>
<p style="margin:10px 0 0;font-size:11px;color:#475569;">
You're receiving this because you signed up for AI TextSpeak.<br>
<a href="https://www.aitextspeak.com/dashboard/settings" style="color:#64748b;">Manage email preferences</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// CTA Button component
function ctaButton(text: string, href: string, color: 'primary' | 'secondary' = 'primary'): string {
  const bgColor = color === 'primary' 
    ? 'background:linear-gradient(to right,#f59e0b,#ea580c);' 
    : 'background:#3b82f6;';
  return `<table width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center" style="padding:20px 0;">
<a href="${href}" style="display:inline-block;${bgColor}color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;box-shadow:0 4px 15px rgba(245,158,11,0.3);">${text}</a>
</td></tr>
</table>`;
}

// ============================================
// ONBOARDING EMAILS
// ============================================

/**
 * Welcome email for new free signups
 */
export async function sendWelcomeFreeEmail(params: {
  email: string;
  firstName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">👋</span>
<h2 style="margin:15px 0 0;font-size:28px;color:#ffffff;">Welcome to AI TextSpeak!</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
Thank you for joining AI TextSpeak! You now have access to our powerful text-to-speech technology with <strong style="color:#f59e0b;">5,000 free characters</strong> to get you started.
</p>

<div style="background:#0f172a;border-radius:12px;padding:20px;margin:25px 0;">
<h3 style="margin:0 0 15px;font-size:16px;color:#ffffff;">🎯 What you can do:</h3>
<ul style="margin:0;padding:0 0 0 20px;color:#94a3b8;line-height:1.8;">
<li>Convert text to natural-sounding speech</li>
<li>Choose from multiple English voices</li>
<li>Download audio files in MP3 format</li>
</ul>
</div>

${ctaButton('Create Your First Audio →', 'https://www.aitextspeak.com/dashboard/projects/new')}

<hr style="border:none;border-top:1px solid #334155;margin:30px 0;">

<div style="background:linear-gradient(135deg,rgba(245,158,11,0.1) 0%,rgba(234,88,12,0.1) 100%);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;">
<h3 style="margin:0 0 10px;font-size:16px;color:#f59e0b;">🚀 Want unlimited access?</h3>
<p style="margin:0 0 15px;font-size:14px;color:#94a3b8;line-height:1.6;">
Upgrade to Pro and unlock <strong style="color:#ffffff;">1 million characters/month</strong>, all languages, 100+ premium voices, and priority support.
</p>
<a href="https://www.aitextspeak.com/pricing" style="color:#f59e0b;font-weight:600;text-decoration:none;">View pricing →</a>
</div>
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: '👋 Welcome to AI TextSpeak - Your 5,000 Free Characters Await!',
    htmlContent: wrapEmailTemplate(content),
  });
}

/**
 * Getting started tips (sent day 2-3)
 */
export async function sendGettingStartedTipsEmail(params: {
  email: string;
  firstName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">💡</span>
<h2 style="margin:15px 0 0;font-size:24px;color:#ffffff;">Tips to Get the Most Out of AI TextSpeak</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<p style="margin:0 0 25px;font-size:16px;color:#94a3b8;line-height:1.6;">
Here are some tips to help you create amazing audio content:
</p>

<div style="margin-bottom:20px;">
<div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:15px;">
<h4 style="margin:0 0 10px;color:#22c55e;font-size:14px;">✅ TIP 1: Use Punctuation</h4>
<p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.5;">Commas and periods help create natural pauses. Use them to control pacing!</p>
</div>

<div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:15px;">
<h4 style="margin:0 0 10px;color:#3b82f6;font-size:14px;">✅ TIP 2: Try Different Voices</h4>
<p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.5;">Preview voices before generating. Each voice has unique characteristics!</p>
</div>

<div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:15px;">
<h4 style="margin:0 0 10px;color:#a855f7;font-size:14px;">✅ TIP 3: Add Pauses with Breaks</h4>
<p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.5;">Use the pause button to add 1-second breaks for dramatic effect.</p>
</div>
</div>

${ctaButton('Try These Tips Now →', 'https://www.aitextspeak.com/dashboard/projects/new')}
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: '💡 3 Tips to Create Better Audio with AI TextSpeak',
    htmlContent: wrapEmailTemplate(content),
  });
}

/**
 * First project reminder (no project after 24h)
 */
export async function sendFirstProjectReminderEmail(params: {
  email: string;
  firstName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">🎙️</span>
<h2 style="margin:15px 0 0;font-size:24px;color:#ffffff;">Ready to Create Your First Audio?</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
We noticed you haven't created your first audio project yet. Don't worry - it only takes 30 seconds!
</p>

<div style="background:#0f172a;border-radius:12px;padding:25px;margin:25px 0;text-align:center;">
<p style="margin:0 0 15px;color:#ffffff;font-size:18px;font-weight:600;">Your 5,000 free characters are waiting! 🎁</p>
<p style="margin:0;color:#94a3b8;font-size:14px;">Try converting this sample text:</p>
<p style="margin:15px 0 0;color:#f59e0b;font-style:italic;font-size:14px;">"Welcome to AI TextSpeak. Transform your text into natural speech!"</p>
</div>

${ctaButton('Create Your First Audio →', 'https://www.aitextspeak.com/dashboard/projects/new')}

<p style="margin:20px 0 0;font-size:14px;color:#64748b;text-align:center;">
Need help? Reply to this email or visit our <a href="https://www.aitextspeak.com/help" style="color:#f59e0b;">Help Center</a>
</p>
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: '🎙️ Your First Audio Project is Waiting!',
    htmlContent: wrapEmailTemplate(content),
  });
}

// ============================================
// CONVERSION EMAILS
// ============================================

/**
 * Character limit warning (80% used)
 */
export async function sendCharacterLimitWarningEmail(params: {
  email: string;
  firstName?: string;
  usedCharacters: number;
  limitCharacters: number;
}): Promise<{ success: boolean; error?: string }> {
  const percentUsed = Math.round((params.usedCharacters / params.limitCharacters) * 100);
  
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">⚡</span>
<h2 style="margin:15px 0 0;font-size:24px;color:#ffffff;">You've Used ${percentUsed}% of Your Characters!</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
You're on a roll! You've used <strong style="color:#f59e0b;">${params.usedCharacters.toLocaleString()}</strong> of your <strong>${params.limitCharacters.toLocaleString()}</strong> monthly characters.
</p>

<!-- Progress Bar -->
<div style="background:#0f172a;border-radius:12px;padding:20px;margin:25px 0;">
<div style="display:flex;justify-content:space-between;margin-bottom:10px;">
<span style="color:#94a3b8;font-size:14px;">Used</span>
<span style="color:#f59e0b;font-size:14px;font-weight:600;">${percentUsed}%</span>
</div>
<div style="background:#334155;border-radius:8px;height:12px;overflow:hidden;">
<div style="background:linear-gradient(to right,#f59e0b,#ea580c);height:100%;width:${percentUsed}%;border-radius:8px;"></div>
</div>
<p style="margin:10px 0 0;color:#64748b;font-size:12px;text-align:center;">
${(params.limitCharacters - params.usedCharacters).toLocaleString()} characters remaining
</p>
</div>

<div style="background:linear-gradient(135deg,rgba(245,158,11,0.1) 0%,rgba(234,88,12,0.1) 100%);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;">
<h3 style="margin:0 0 10px;font-size:16px;color:#f59e0b;">🚀 Need More Characters?</h3>
<p style="margin:0 0 15px;font-size:14px;color:#94a3b8;line-height:1.6;">
Upgrade to Pro for <strong style="color:#ffffff;">1,000,000 characters/month</strong> - that's 2,000x more!
</p>
${ctaButton('Upgrade to Pro', 'https://www.aitextspeak.com/pricing')}
</div>
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: `⚡ You've used ${percentUsed}% of your characters - Time to upgrade?`,
    htmlContent: wrapEmailTemplate(content),
  });
}

/**
 * Character limit reached (100%)
 */
export async function sendCharacterLimitReachedEmail(params: {
  email: string;
  firstName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">🛑</span>
<h2 style="margin:15px 0 0;font-size:24px;color:#ffffff;">You've Hit Your Character Limit</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
You've used all your free characters for this month. But don't worry - you have options!
</p>

<div style="background:#0f172a;border-radius:12px;padding:25px;margin:25px 0;">
<table width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="padding:15px;border-bottom:1px solid #334155;">
<span style="color:#94a3b8;font-size:14px;">Option 1</span><br>
<span style="color:#ffffff;font-size:16px;font-weight:600;">Wait for Reset</span><br>
<span style="color:#64748b;font-size:13px;">Your characters reset on the 1st of next month</span>
</td>
</tr>
<tr>
<td style="padding:15px;">
<span style="color:#f59e0b;font-size:14px;">Option 2 ⭐</span><br>
<span style="color:#ffffff;font-size:16px;font-weight:600;">Upgrade to Pro</span><br>
<span style="color:#64748b;font-size:13px;">Get 1,000,000 characters instantly + all premium features</span>
</td>
</tr>
</table>
</div>

${ctaButton('Upgrade Now & Keep Creating →', 'https://www.aitextspeak.com/pricing')}

<div style="text-align:center;margin-top:25px;">
<p style="margin:0;color:#64748b;font-size:14px;">
Or get <strong style="color:#f59e0b;">lifetime access</strong> for a one-time payment!
</p>
</div>
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: '🛑 Character Limit Reached - Upgrade to Keep Creating',
    htmlContent: wrapEmailTemplate(content),
  });
}

/**
 * Inactive user re-engagement
 */
export async function sendInactiveUserEmail(params: {
  email: string;
  firstName?: string;
  daysInactive: number;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">👀</span>
<h2 style="margin:15px 0 0;font-size:24px;color:#ffffff;">We Miss You!</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
It's been ${params.daysInactive} days since we last saw you. Your text-to-speech projects are waiting!
</p>

<div style="background:#0f172a;border-radius:12px;padding:25px;margin:25px 0;text-align:center;">
<p style="margin:0 0 10px;color:#f59e0b;font-size:48px;font-weight:bold;">🎁</p>
<p style="margin:0 0 5px;color:#ffffff;font-size:18px;font-weight:600;">Your free characters are still available!</p>
<p style="margin:0;color:#64748b;font-size:14px;">Don't let them go to waste</p>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
Here are some ideas to get you started:
</p>

<ul style="margin:0 0 25px;padding:0 0 0 20px;color:#94a3b8;line-height:1.8;">
<li>Create voiceovers for your videos</li>
<li>Generate audio for your blog posts</li>
<li>Make professional-sounding podcasts</li>
<li>Build engaging social media content</li>
</ul>

${ctaButton('Come Back & Create →', 'https://www.aitextspeak.com/dashboard')}
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: `👀 We miss you! Your free characters are waiting`,
    htmlContent: wrapEmailTemplate(content),
  });
}

/**
 * High engagement user - upgrade push
 */
export async function sendHighEngagementUpgradeEmail(params: {
  email: string;
  firstName?: string;
  projectCount: number;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">🔥</span>
<h2 style="margin:15px 0 0;font-size:24px;color:#ffffff;">You're a Power User!</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
Wow! You've created <strong style="color:#f59e0b;">${params.projectCount} projects</strong> with AI TextSpeak. You're clearly getting great value from our platform!
</p>

<div style="background:linear-gradient(135deg,rgba(34,197,94,0.1) 0%,rgba(22,163,74,0.1) 100%);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:25px;margin:25px 0;text-align:center;">
<p style="margin:0 0 10px;color:#22c55e;font-size:14px;font-weight:600;">SPECIAL OFFER FOR POWER USERS</p>
<p style="margin:0 0 5px;color:#ffffff;font-size:24px;font-weight:bold;">Upgrade to Pro Today</p>
<p style="margin:0;color:#94a3b8;font-size:14px;">Get 2,000x more characters and unlock premium voices</p>
</div>

<table width="100%" cellspacing="0" cellpadding="0" style="margin:25px 0;">
<tr>
<td width="50%" style="padding:10px;">
<div style="background:#0f172a;border-radius:12px;padding:20px;text-align:center;">
<p style="margin:0 0 5px;color:#64748b;font-size:12px;">FREE PLAN</p>
<p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">500</p>
<p style="margin:0;color:#64748b;font-size:12px;">chars/month</p>
</div>
</td>
<td width="50%" style="padding:10px;">
<div style="background:linear-gradient(135deg,rgba(245,158,11,0.1) 0%,rgba(234,88,12,0.1) 100%);border:2px solid #f59e0b;border-radius:12px;padding:20px;text-align:center;">
<p style="margin:0 0 5px;color:#f59e0b;font-size:12px;">PRO PLAN</p>
<p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">1,000,000</p>
<p style="margin:0;color:#64748b;font-size:12px;">chars/month</p>
</div>
</td>
</tr>
</table>

${ctaButton('Upgrade to Pro →', 'https://www.aitextspeak.com/pricing')}
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: `🔥 You're a power user! Time to upgrade?`,
    htmlContent: wrapEmailTemplate(content),
  });
}

// ============================================
// RETENTION EMAILS
// ============================================

/**
 * Churn prevention (cancelled but in grace period)
 */
export async function sendChurnPreventionEmail(params: {
  email: string;
  firstName?: string;
  daysUntilExpiry: number;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">💔</span>
<h2 style="margin:15px 0 0;font-size:24px;color:#ffffff;">We're Sad to See You Go</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
We noticed you cancelled your subscription. Your Pro access will remain active for <strong style="color:#f59e0b;">${params.daysUntilExpiry} more days</strong>.
</p>

<div style="background:#0f172a;border-radius:12px;padding:25px;margin:25px 0;">
<p style="margin:0 0 15px;color:#ffffff;font-size:16px;font-weight:600;">Before you go, we'd love to know:</p>
<ul style="margin:0;padding:0 0 0 20px;color:#94a3b8;line-height:1.8;">
<li>Was there a feature missing?</li>
<li>Was the pricing not right?</li>
<li>Did you experience any issues?</li>
</ul>
<p style="margin:15px 0 0;color:#64748b;font-size:14px;">
Reply to this email - we read every response and would love to help.
</p>
</div>

<div style="background:linear-gradient(135deg,rgba(245,158,11,0.1) 0%,rgba(234,88,12,0.1) 100%);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;text-align:center;">
<p style="margin:0 0 10px;color:#ffffff;font-size:16px;font-weight:600;">Changed your mind?</p>
<p style="margin:0 0 15px;color:#94a3b8;font-size:14px;">You can reactivate anytime before your access expires.</p>
${ctaButton('Reactivate Subscription', 'https://www.aitextspeak.com/dashboard/billing')}
</div>
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: '💔 Your Pro access is ending soon...',
    htmlContent: wrapEmailTemplate(content),
  });
}

/**
 * Win-back campaign (churned 30+ days ago)
 */
export async function sendWinBackEmail(params: {
  email: string;
  firstName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">🎁</span>
<h2 style="margin:15px 0 0;font-size:24px;color:#ffffff;">We've Made Some Improvements!</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
It's been a while since you've used AI TextSpeak. We've been busy making improvements and would love to have you back!
</p>

<div style="background:#0f172a;border-radius:12px;padding:25px;margin:25px 0;">
<p style="margin:0 0 15px;color:#f59e0b;font-size:14px;font-weight:600;">✨ WHAT'S NEW</p>
<ul style="margin:0;padding:0 0 0 20px;color:#94a3b8;line-height:1.8;">
<li>New premium voices added</li>
<li>Improved audio quality</li>
<li>Faster processing times</li>
<li>Better SSML support for pauses</li>
</ul>
</div>

<div style="background:linear-gradient(135deg,rgba(34,197,94,0.1) 0%,rgba(22,163,74,0.1) 100%);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:20px;text-align:center;">
<p style="margin:0 0 10px;color:#22c55e;font-size:16px;font-weight:600;">🎉 Welcome Back Offer</p>
<p style="margin:0 0 15px;color:#94a3b8;font-size:14px;">Come back and try our improvements with your free characters!</p>
${ctaButton('Try AI TextSpeak Again →', 'https://www.aitextspeak.com/dashboard')}
</div>
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: '🎁 We miss you! Come see what\'s new at AI TextSpeak',
    htmlContent: wrapEmailTemplate(content),
  });
}

/**
 * Usage milestone celebration
 */
export async function sendMilestoneEmail(params: {
  email: string;
  firstName?: string;
  milestone: number; // 10, 50, 100, etc.
}): Promise<{ success: boolean; error?: string }> {
  const content = `
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">🎉</span>
<h2 style="margin:15px 0 0;font-size:24px;color:#ffffff;">Congratulations!</h2>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.firstName ? ` ${params.firstName}` : ''},
</p>

<div style="background:linear-gradient(135deg,rgba(245,158,11,0.1) 0%,rgba(234,88,12,0.1) 100%);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:30px;margin:25px 0;text-align:center;">
<p style="margin:0 0 10px;color:#f59e0b;font-size:72px;font-weight:bold;">${params.milestone}</p>
<p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">Projects Created! 🎊</p>
</div>

<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
You've reached an amazing milestone! Thank you for being such an active member of our community.
</p>

<p style="margin:0 0 25px;font-size:16px;color:#94a3b8;line-height:1.6;">
Keep up the great work - we can't wait to see what you create next!
</p>

${ctaButton('Create Project #${params.milestone + 1} →', 'https://www.aitextspeak.com/dashboard/projects/new')}
`;

  return sendEmail({
    to: [{ email: params.email, name: params.firstName }],
    subject: `🎉 Amazing! You've created ${params.milestone} projects!`,
    htmlContent: wrapEmailTemplate(content),
  });
}

// Export all CRM email types
export type CRMEmailType = 
  | 'welcome_free'
  | 'getting_started_tips'
  | 'first_project_reminder'
  | 'character_limit_warning'
  | 'character_limit_reached'
  | 'inactive_user'
  | 'high_engagement_upgrade'
  | 'churn_prevention'
  | 'win_back'
  | 'milestone';

