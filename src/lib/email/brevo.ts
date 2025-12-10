const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  sender?: { name: string; email: string };
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!BREVO_API_KEY) {
    console.error('[Brevo] API key not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: params.sender || { name: 'AI TextSpeak', email: 'noreply@aitextspeak.com' },
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('[Brevo] Error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Brevo] Error:', error);
    return { success: false, error: 'Failed to send email' };
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
