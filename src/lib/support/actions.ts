'use server';

import { createClient } from '@/lib/supabase/server';

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

  // TODO: Send email notification to support team
  // await sendSupportNotification(data.id, input);

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
