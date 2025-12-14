'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/brevo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

interface TicketInput {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}

interface TicketResult {
  success: boolean;
  error?: string;
  ticketId?: string;
}

export async function submitSupportTicket(input: TicketInput): Promise<TicketResult> {
  const supabase = await createClient();

  // Get current user if logged in
  const { data: { user } } = await supabase.auth.getUser();

  // Validate input
  if (!input.email || !input.subject || !input.message || !input.category) {
    return { success: false, error: 'Please fill in all required fields' };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  // Create the ticket
  const { data, error } = await (supabase as AnySupabaseClient)
    .from('support_tickets')
    .insert({
      user_id: user?.id || null,
      email: input.email,
      name: input.name || null,
      subject: input.subject,
      category: input.category,
      message: input.message,
      status: 'open',
      priority: determinePriority(input.category),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating support ticket:', error);
    return { success: false, error: 'Failed to submit ticket. Please try again.' };
  }

  // Send email notification to support team
  await sendSupportNotificationEmail(data.id, input);

  return { success: true, ticketId: data.id };
}

function determinePriority(category: string): string {
  switch (category) {
    case 'billing':
    case 'bug':
      return 'high';
    case 'technical':
    case 'account':
      return 'normal';
    default:
      return 'low';
  }
}

async function sendSupportNotificationEmail(ticketId: string, input: TicketInput) {
  const priority = determinePriority(input.category);
  const priorityColor = priority === 'high' ? '#ef4444' : priority === 'normal' ? '#f59e0b' : '#22c55e';
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:20px;">
<h1 style="margin:0;font-size:24px;font-weight:bold;"><span style="color:#f59e0b;">AI</span><span style="color:#ffffff;">TextSpeak</span> <span style="color:#64748b;">Support</span></h1>
</td></tr>
<tr><td style="background-color:#1e293b;border-radius:16px;padding:30px;">
<div style="display:flex;justify-content:space-between;margin-bottom:20px;">
<h2 style="margin:0;font-size:20px;color:#ffffff;">New Support Ticket</h2>
<span style="background-color:${priorityColor};color:#ffffff;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;text-transform:uppercase;">${priority}</span>
</div>
<table width="100%" style="margin-bottom:20px;">
<tr><td style="padding:8px 0;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">Ticket ID:</span>
<span style="color:#ffffff;font-size:14px;float:right;">${ticketId.slice(0, 8)}</span>
</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">From:</span>
<span style="color:#ffffff;font-size:14px;float:right;">${input.name || 'Anonymous'} &lt;${input.email}&gt;</span>
</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">Category:</span>
<span style="color:#f59e0b;font-size:14px;float:right;text-transform:capitalize;">${input.category}</span>
</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #334155;">
<span style="color:#64748b;font-size:14px;">Subject:</span>
<span style="color:#ffffff;font-size:14px;float:right;">${input.subject}</span>
</td></tr>
</table>
<div style="background-color:#0f172a;border-radius:8px;padding:16px;margin-top:20px;">
<p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;">Message:</p>
<p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.6;white-space:pre-wrap;">${input.message}</p>
</div>
<hr style="border:none;border-top:1px solid #334155;margin:24px 0;">
<p style="margin:0;font-size:13px;color:#64748b;">Reply directly to this email to respond to the customer at <a href="mailto:${input.email}" style="color:#f59e0b;">${input.email}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  await sendEmail({
    to: [{ email: 'support@aitextspeak.com', name: 'AI TextSpeak Support' }],
    subject: `[${priority.toUpperCase()}] ${input.category}: ${input.subject}`,
    htmlContent,
    sender: { name: 'AI TextSpeak', email: 'noreply@aitextspeak.com' },
    replyTo: { email: input.email, name: input.name || undefined },
  });
}






