const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  sender?: { name: string; email: string };
  replyTo?: { email: string; name?: string };
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  console.log('[Brevo] Attempting to send email to:', JSON.stringify(params.to, null, 2));
  
  if (!BREVO_API_KEY) {
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

  console.log('[Brevo] API key present, length:', BREVO_API_KEY.length);

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
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

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






