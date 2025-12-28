const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Read API key at runtime (not module load time) for serverless compatibility
function getBrevoApiKey(): string {
  return process.env.BREVO_API_KEY || '';
}

// Retry helper for transient network errors
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isTransient = 
        lastError.message?.includes('ECONNRESET') ||
        lastError.message?.includes('fetch failed') ||
        lastError.message?.includes('network') ||
        lastError.message?.includes('timeout');
      
      if (!isTransient || attempt === maxRetries) {
        throw lastError;
      }
      
      console.log(`[Brevo] Retry ${attempt}/${maxRetries} after transient error:`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError;
}

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  sender?: { name: string; email: string };
  replyTo?: { email: string; name?: string };
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  console.log('[Brevo] Attempting to send email to:', JSON.stringify(params.to, null, 2));
  
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    console.error('[Brevo] API key not configured');
    return { success: false, error: 'Email service not configured' };
  }

  if (!params.to || params.to.length === 0) {
    console.error('[Brevo] No recipients provided');
    return { success: false, error: 'No email recipients provided' };
  }

  // Validate email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const recipient of params.to) {
    if (!emailRegex.test(recipient.email)) {
      console.error('[Brevo] Invalid email address:', recipient.email);
      return { success: false, error: `Invalid email address: ${recipient.email}` };
    }
  }

  console.log('[Brevo] API key present, length:', apiKey.length);

  const sender = params.sender || { name: 'AI TextSpeak', email: 'noreply@aitextspeak.com' };
  
  if (!emailRegex.test(sender.email)) {
    console.error('[Brevo] Invalid sender email:', sender.email);
    return { success: false, error: `Invalid sender email: ${sender.email}` };
  }

  const payload: Record<string, unknown> = {
    sender: sender,
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
  };

  // Add replyTo if provided
  if (params.replyTo) {
    if (!emailRegex.test(params.replyTo.email)) {
      console.error('[Brevo] Invalid replyTo email:', params.replyTo.email);
      return { success: false, error: `Invalid replyTo email: ${params.replyTo.email}` };
    }
    payload.replyTo = params.replyTo;
  }

  console.log('[Brevo] Sender:', JSON.stringify(payload.sender, null, 2));
  console.log('[Brevo] To:', JSON.stringify(payload.to, null, 2));
  console.log('[Brevo] Subject:', payload.subject);
  if (params.replyTo) console.log('[Brevo] Reply-To:', JSON.stringify(params.replyTo, null, 2));

  try {
    const response = await withRetry(() => fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    }));

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('[Brevo] Non-JSON response:', text);
      return { success: false, error: `Unexpected response: ${text.substring(0, 100)}` };
    }

    console.log('[Brevo] Response status:', response.status);
    console.log('[Brevo] Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      const errorMessage = data.message || data.error || `HTTP ${response.status}: ${JSON.stringify(data)}`;
      console.error('[Brevo] Error response:', errorMessage);
      return { success: false, error: errorMessage };
    }

    // Brevo returns messageId on success
    if (data.messageId) {
      console.log('[Brevo] Email sent successfully! Message ID:', data.messageId);
      return { success: true };
    }

    // Some successful responses might not have messageId
    console.log('[Brevo] Email sent successfully!');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Brevo] Exception:', errorMessage, error);
    return { success: false, error: `Failed to send email: ${errorMessage}` };
  }
}

// Admin notification recipients
const ADMIN_NOTIFICATION_EMAILS = [
  { email: 'yes-ame100@gmail.com', name: 'Admin' },
  { email: 'juanchoabdons@gmail.com', name: 'Juan' },
];

export interface PaymentNotificationParams {
  type: 'new_subscription' | 'renewal' | 'lifetime' | 'one_time' | 'cancellation' | 'payment_failed';
  userEmail: string;
  userName?: string;
  amount: number;
  currency: string;
  provider: 'stripe' | 'paypal' | 'paypal_legacy';
  planName?: string;
  subscriptionId?: string;
  transactionId?: string;
  reason?: string;
}

export async function sendPaymentNotification(params: PaymentNotificationParams): Promise<{ success: boolean; error?: string }> {
  const typeLabels: Record<string, { label: string; emoji: string; color: string }> = {
    new_subscription: { label: 'New Subscription', emoji: '🎉', color: '#22c55e' },
    renewal: { label: 'Subscription Renewal', emoji: '🔄', color: '#3b82f6' },
    lifetime: { label: 'Lifetime Purchase', emoji: '⭐', color: '#f59e0b' },
    one_time: { label: 'One-Time Purchase', emoji: '💰', color: '#8b5cf6' },
    cancellation: { label: 'Subscription Cancelled', emoji: '❌', color: '#ef4444' },
    payment_failed: { label: 'Payment Failed', emoji: '⚠️', color: '#ef4444' },
  };

  const { label, emoji, color } = typeLabels[params.type] || { label: params.type, emoji: '📧', color: '#64748b' };
  
  const providerLabel = params.provider === 'paypal_legacy' ? 'PayPal (Legacy)' : 
                        params.provider === 'paypal' ? 'PayPal' : 'Stripe';

  const subject = `${emoji} ${label}: ${params.userEmail} - $${params.amount.toFixed(2)}`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:30px;">
<h1 style="margin:0;font-size:28px;font-weight:bold;"><span style="color:#f59e0b;">AI</span><span style="color:#ffffff;">TextSpeak</span></h1>
</td></tr>
<tr><td style="background-color:#1e293b;border-radius:16px;padding:40px;">
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:48px;">${emoji}</span>
<h2 style="margin:10px 0 0;font-size:24px;color:${color};">${label}</h2>
</div>
<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;border-radius:12px;padding:20px;">
<tr>
<td style="padding:12px 20px;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">User Email</span><br>
<span style="color:#ffffff;font-size:16px;font-weight:600;">${params.userEmail}</span>
</td>
</tr>
${params.userName ? `<tr>
<td style="padding:12px 20px;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">User Name</span><br>
<span style="color:#ffffff;font-size:16px;">${params.userName}</span>
</td>
</tr>` : ''}
<tr>
<td style="padding:12px 20px;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">Amount</span><br>
<span style="color:#22c55e;font-size:20px;font-weight:700;">$${params.amount.toFixed(2)} ${params.currency}</span>
</td>
</tr>
<tr>
<td style="padding:12px 20px;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">Payment Provider</span><br>
<span style="color:#ffffff;font-size:16px;">${providerLabel}</span>
</td>
</tr>
${params.planName ? `<tr>
<td style="padding:12px 20px;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">Plan</span><br>
<span style="color:#ffffff;font-size:16px;">${params.planName}</span>
</td>
</tr>` : ''}
${params.subscriptionId ? `<tr>
<td style="padding:12px 20px;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">Subscription ID</span><br>
<span style="color:#94a3b8;font-size:14px;font-family:monospace;">${params.subscriptionId}</span>
</td>
</tr>` : ''}
${params.transactionId ? `<tr>
<td style="padding:12px 20px;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">Transaction ID</span><br>
<span style="color:#94a3b8;font-size:14px;font-family:monospace;">${params.transactionId}</span>
</td>
</tr>` : ''}
${params.reason ? `<tr>
<td style="padding:12px 20px;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">Reason</span><br>
<span style="color:#ffffff;font-size:16px;">${params.reason}</span>
</td>
</tr>` : ''}
<tr>
<td style="padding:12px 20px;">
<span style="color:#64748b;font-size:14px;">Date</span><br>
<span style="color:#ffffff;font-size:16px;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</span>
</td>
</tr>
</table>
</td></tr>
<tr><td align="center" style="padding-top:30px;">
<p style="margin:0;font-size:12px;color:#64748b;">AI TextSpeak Payment Notification</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  console.log('[PaymentNotification] Sending notification for:', params.type, params.userEmail);

  return sendEmail({
    to: ADMIN_NOTIFICATION_EMAILS,
    subject,
    htmlContent,
    sender: { name: 'AI TextSpeak Payments', email: 'noreply@aitextspeak.com' },
  });
}

export interface WelcomeEmailParams {
  userEmail: string;
  userName?: string;
  planType: 'subscription' | 'lifetime';
  planName: string;
  characterLimit?: number | 'unlimited';
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  const isLifetime = params.planType === 'lifetime';
  const characterText = params.characterLimit === 'unlimited' 
    ? 'unlimited characters' 
    : params.characterLimit 
      ? `${params.characterLimit.toLocaleString()} characters per month`
      : 'your plan characters';

  const subject = isLifetime 
    ? '🎉 Welcome to AI TextSpeak - Lifetime Access Activated!'
    : '🎉 Welcome to AI TextSpeak - Your Subscription is Active!';

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">

<!-- Logo -->
<tr><td align="center" style="padding-bottom:30px;">
<h1 style="margin:0;font-size:28px;font-weight:bold;"><span style="color:#f59e0b;">AI</span><span style="color:#ffffff;">TextSpeak</span></h1>
</td></tr>

<!-- Main Content -->
<tr><td style="background-color:#1e293b;border-radius:16px;padding:40px;">

<!-- Welcome Header -->
<div style="text-align:center;margin-bottom:30px;">
<span style="font-size:60px;">🎉</span>
<h2 style="margin:15px 0 0;font-size:28px;color:#ffffff;">Welcome to AI TextSpeak!</h2>
<p style="margin:10px 0 0;font-size:16px;color:#f59e0b;">${isLifetime ? 'Lifetime Access Activated' : 'Your subscription is now active'}</p>
</div>

<!-- Greeting -->
<p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;line-height:1.6;">
Hi${params.userName ? ` ${params.userName}` : ''},
</p>

<p style="margin:0 0 25px;font-size:16px;color:#94a3b8;line-height:1.6;">
Thank you for ${isLifetime ? 'purchasing lifetime access' : 'subscribing'} to AI TextSpeak! We're thrilled to have you on board. You now have access to our powerful text-to-speech technology with ${characterText}.
</p>

<!-- Plan Info Box -->
<table width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,rgba(245,158,11,0.1) 0%,rgba(234,88,12,0.1) 100%);border:1px solid rgba(245,158,11,0.3);border-radius:12px;margin-bottom:30px;">
<tr><td style="padding:20px;">
<table width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="padding:8px 0;">
<span style="color:#94a3b8;font-size:14px;">Your Plan</span><br>
<span style="color:#f59e0b;font-size:18px;font-weight:600;">${params.planName}</span>
</td>
<td align="right" style="padding:8px 0;">
<span style="color:#94a3b8;font-size:14px;">Character Limit</span><br>
<span style="color:#22c55e;font-size:18px;font-weight:600;">${params.characterLimit === 'unlimited' ? 'Unlimited' : params.characterLimit?.toLocaleString() || 'Standard'}</span>
</td>
</tr>
</table>
</td></tr>
</table>

<!-- Quick Start Guide -->
<h3 style="margin:0 0 15px;font-size:18px;color:#ffffff;">🚀 Quick Start Guide</h3>

<table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:30px;">
<tr>
<td style="padding:12px 0;border-bottom:1px solid #334155;">
<table width="100%" cellspacing="0" cellpadding="0">
<tr>
<td width="40" style="vertical-align:top;">
<div style="width:28px;height:28px;background:#f59e0b;border-radius:50%;text-align:center;line-height:28px;color:#000;font-weight:600;">1</div>
</td>
<td style="padding-left:12px;">
<span style="color:#ffffff;font-size:15px;font-weight:500;">Create a new project</span><br>
<span style="color:#94a3b8;font-size:13px;">Click "New Project" in your dashboard to get started</span>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:12px 0;border-bottom:1px solid #334155;">
<table width="100%" cellspacing="0" cellpadding="0">
<tr>
<td width="40" style="vertical-align:top;">
<div style="width:28px;height:28px;background:#f59e0b;border-radius:50%;text-align:center;line-height:28px;color:#000;font-weight:600;">2</div>
</td>
<td style="padding-left:12px;">
<span style="color:#ffffff;font-size:15px;font-weight:500;">Enter your text</span><br>
<span style="color:#94a3b8;font-size:13px;">Paste or type the content you want to convert to speech</span>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:12px 0;border-bottom:1px solid #334155;">
<table width="100%" cellspacing="0" cellpadding="0">
<tr>
<td width="40" style="vertical-align:top;">
<div style="width:28px;height:28px;background:#f59e0b;border-radius:50%;text-align:center;line-height:28px;color:#000;font-weight:600;">3</div>
</td>
<td style="padding-left:12px;">
<span style="color:#ffffff;font-size:15px;font-weight:500;">Choose a voice</span><br>
<span style="color:#94a3b8;font-size:13px;">Select from 100+ natural-sounding AI voices</span>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:12px 0;">
<table width="100%" cellspacing="0" cellpadding="0">
<tr>
<td width="40" style="vertical-align:top;">
<div style="width:28px;height:28px;background:#f59e0b;border-radius:50%;text-align:center;line-height:28px;color:#000;font-weight:600;">4</div>
</td>
<td style="padding-left:12px;">
<span style="color:#ffffff;font-size:15px;font-weight:500;">Generate & download</span><br>
<span style="color:#94a3b8;font-size:13px;">Click generate and download your audio file</span>
</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- CTA Button -->
<table width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center" style="padding:10px 0 30px;">
<a href="https://www.aitextspeak.com/dashboard/projects/new" style="display:inline-block;background:linear-gradient(to right,#f59e0b,#ea580c);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:12px;box-shadow:0 4px 15px rgba(245,158,11,0.3);">Start Creating Audio →</a>
</td></tr>
</table>

<!-- Support Section -->
<div style="background-color:#0f172a;border-radius:12px;padding:20px;text-align:center;">
<p style="margin:0 0 10px;font-size:14px;color:#94a3b8;">Need help? We're here for you!</p>
<p style="margin:0;font-size:14px;color:#64748b;">
<a href="https://www.aitextspeak.com/help" style="color:#f59e0b;text-decoration:none;">Help Center</a> &nbsp;•&nbsp; 
<a href="mailto:support@aitextspeak.com" style="color:#f59e0b;text-decoration:none;">support@aitextspeak.com</a>
</p>
</div>

</td></tr>

<!-- Footer -->
<tr><td align="center" style="padding-top:30px;">
<p style="margin:0 0 10px;font-size:12px;color:#64748b;">Thank you for choosing AI TextSpeak!</p>
<p style="margin:0;font-size:12px;color:#64748b;">© ${new Date().getFullYear()} AI TextSpeak. All rights reserved.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  console.log('[WelcomeEmail] Sending welcome email to:', params.userEmail, 'Plan:', params.planName);

  return sendEmail({
    to: [{ email: params.userEmail, name: params.userName }],
    subject,
    htmlContent,
    sender: { name: 'AI TextSpeak', email: 'noreply@aitextspeak.com' },
  });
}

export function getPasswordResetEmailHtml(resetLink: string, userName?: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:30px;">
<h1 style="margin:0;font-size:28px;font-weight:bold;"><span style="color:#f59e0b;">AI</span><span style="color:#ffffff;">TextSpeak</span></h1>
</td></tr>
<tr><td style="background-color:#1e293b;border-radius:16px;padding:40px;">
<h2 style="margin:0 0 20px;font-size:24px;color:#ffffff;text-align:center;">Reset Your Password</h2>
<p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">Hi${userName ? ` ${userName}` : ''},</p>
<p style="margin:0 0 30px;font-size:16px;color:#94a3b8;line-height:1.6;">We received a request to reset your password. Click the button below to create a new password. This link expires in 1 hour.</p>
<table width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center" style="padding:10px 0 30px;">
<a href="${resetLink}" style="display:inline-block;background:linear-gradient(to right,#f59e0b,#ea580c);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">Reset Password</a>
</td></tr>
</table>
<p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">If you didn't request this, you can safely ignore this email.</p>
<hr style="border:none;border-top:1px solid #334155;margin:30px 0;">
<p style="margin:0;font-size:12px;color:#64748b;">If the button doesn't work, copy this link:</p>
<p style="margin:10px 0 0;font-size:12px;color:#f59e0b;word-break:break-all;">${resetLink}</p>
</td></tr>
<tr><td align="center" style="padding-top:30px;">
<p style="margin:0;font-size:12px;color:#64748b;">© ${new Date().getFullYear()} AI TextSpeak. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}






