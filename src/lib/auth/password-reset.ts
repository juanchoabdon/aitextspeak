'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, getPasswordResetEmailHtml } from '@/lib/email/brevo';
import crypto from 'crypto';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Request password reset - sends email via Brevo API
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!email || !email.includes('@')) {
      console.error('[Password Reset] Invalid email format:', email);
      return { success: false, error: 'Please enter a valid email address' };
    }

    const supabase = await createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    console.log('[Password Reset] Starting password reset request for:', normalizedEmail);

    // Find user by email (handle pagination since listUsers is paginated)
    let user = null;
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data, error: listUsersError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (listUsersError) {
        console.error('[Password Reset] Error listing users:', listUsersError);
        return { success: false, error: 'Something went wrong. Please try again.' };
      }

      if (!data.users || data.users.length === 0) {
        break; // No more users
      }

      // Search for user in this page
      const foundUser = data.users.find(u => u.email?.toLowerCase() === normalizedEmail);
      if (foundUser) {
        user = foundUser;
        break; // Found the user
      }

      // If we got fewer users than perPage, we've reached the end
      if (data.users.length < perPage) {
        break;
      }

      page++;
    }
    
    if (!user) {
      // Don't reveal if user exists - always say success (security best practice)
      console.log('[Password Reset] User not found for email:', normalizedEmail);
      console.log('[Password Reset] Searched through', page, 'page(s) of users');
      return { success: true };
    }

    console.log('[Password Reset] User found:', { userId: user.id, email: user.email });

    // Get user's name for personalization (using admin client to bypass RLS)
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single();

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete existing tokens for this user (using admin client to bypass RLS)
    // Type assertion needed because password_reset_tokens is not in the generated types
    await (supabase as any)
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id);

    // Store new token (using admin client to bypass RLS)
    const { error: tokenError } = await (supabase as any)
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        email: normalizedEmail,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('[Password Reset] Token error:', tokenError);
      console.error('[Password Reset] Token error details:', JSON.stringify(tokenError, null, 2));
      return { success: false, error: 'Something went wrong. Please try again.' };
    }

    console.log('[Password Reset] Token stored successfully');

    // Send email via Brevo
    const resetLink = `${SITE_URL}/auth/reset-password?token=${token}`;
    
    console.log('[Password Reset] Attempting to send email to:', normalizedEmail);
    console.log('[Password Reset] Reset link:', resetLink);
    console.log('[Password Reset] User profile:', { hasProfile: !!profile, firstName: profile?.first_name });
    console.log('[Password Reset] SITE_URL:', SITE_URL);
    console.log('[Password Reset] BREVO_API_KEY configured:', !!process.env.BREVO_API_KEY);
    
    const emailResult = await sendEmail({
      to: [{ email: normalizedEmail, name: profile?.first_name || undefined }],
      subject: 'Reset Your AI TextSpeak Password',
      htmlContent: getPasswordResetEmailHtml(resetLink, profile?.first_name || undefined),
    });

    console.log('[Password Reset] Email result:', JSON.stringify(emailResult, null, 2));

    if (!emailResult.success) {
      console.error('[Password Reset] Email failed:', emailResult.error);
      console.error('[Password Reset] Full email result:', JSON.stringify(emailResult, null, 2));
      // Clean up token if email fails (using admin client)
      await (supabase as any)
        .from('password_reset_tokens')
        .delete()
        .eq('token', token);
      return { success: false, error: emailResult.error || 'Failed to send email. Please try again.' };
    }

    console.log('[Password Reset] ✅ Email sent successfully to:', normalizedEmail);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Password Reset] Unexpected error:', errorMessage, error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Validate reset token
 */
export async function validateResetToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
  if (!token) return { valid: false, error: 'Invalid link' };

  const supabase = await createAdminClient();

  const { data, error } = await (supabase as any)
    .from('password_reset_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid or expired link' };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'This link has expired. Please request a new one.' };
  }

  if (data.used_at) {
    return { valid: false, error: 'This link has already been used.' };
  }

  return { valid: true, email: data.email };
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: 'Invalid link' };
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  const supabase = await createAdminClient();

  // Validate token
  const { data, error } = await (supabase as any)
    .from('password_reset_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    return { success: false, error: 'Invalid or expired link' };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { success: false, error: 'This link has expired.' };
  }

  if (data.used_at) {
    return { success: false, error: 'This link has already been used.' };
  }

  // Update password via Supabase Admin API
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    data.user_id,
    { password: newPassword }
  );

  if (updateError) {
    console.error('[Password Reset] Update error:', updateError);
    return { success: false, error: 'Failed to update password.' };
  }

  // Mark token as used
  await (supabase as any)
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token);

  return { success: true };
}






