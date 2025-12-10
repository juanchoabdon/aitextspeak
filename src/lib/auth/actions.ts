'use server';

import { createClient } from '@/lib/supabase/server';
import { migrateLegacyUser, findLegacyUserByEmail, verifyLegacyPassword } from './legacy';
import type { AuthResult, LoginCredentials, SignupData } from '@/types';

/**
 * Server Action: Sign in with email and password
 * Handles both regular Supabase auth and legacy user migration
 */
export async function signIn(credentials: LoginCredentials): Promise<AuthResult> {
  const { email, password } = credentials;
  
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }
  
  const supabase = await createClient();
  
  // Step 1: Try regular Supabase auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });
  
  if (data?.user) {
    // Fetch user profile to get role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    
    const role = profile?.role || 'user';
    
    return {
      success: true,
      user: { id: data.user.id, email: data.user.email!, role },
      isLegacyMigration: false,
      redirectTo: role === 'admin' ? '/admin' : '/dashboard',
    };
  }
  
  // Step 2: If Supabase auth fails, check for legacy user
  if (error) {
    // Check if this is a legacy user that needs migration
    const legacyUser = await findLegacyUserByEmail(email);
    
    if (legacyUser) {
      // Verify legacy password
      const passwordValid = await verifyLegacyPassword(password, legacyUser.password_hash);
      
      if (passwordValid) {
        // Migrate the user
        const migrationResult = await migrateLegacyUser(email, password);
        
        if (migrationResult.success && migrationResult.userId) {
          // Now sign in with the newly created credentials
          const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password,
          });
          
          if (newAuthData?.user) {
            // Fetch user profile to get role
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase as any)
              .from('profiles')
              .select('role')
              .eq('id', newAuthData.user.id)
              .single();
            
            const role = profile?.role || 'user';
            
            return {
              success: true,
              user: { id: newAuthData.user.id, email: newAuthData.user.email!, role },
              isLegacyMigration: true,
              redirectTo: role === 'admin' ? '/admin' : '/dashboard',
            };
          }
          
          return { 
            success: false, 
            error: newAuthError?.message || 'Migration succeeded but login failed' 
          };
        }
        
        return { success: false, error: migrationResult.error || 'Migration failed' };
      }
    }
    
    // No legacy user found or password invalid
    return { success: false, error: 'Invalid email or password' };
  }
  
  return { success: false, error: 'Authentication failed' };
}

/**
 * Server Action: Sign up a new user
 * This creates a new user in Supabase Auth (not for legacy users)
 * Also creates a welcome project for new users
 */
export async function signUp(data: SignupData): Promise<AuthResult> {
  const { email, password, firstName, lastName } = data;
  
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }
  
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }
  
  const supabase = await createClient();
  
  // Check if user already exists in legacy system
  const legacyUser = await findLegacyUserByEmail(email);
  if (legacyUser) {
    return { 
      success: false, 
      error: 'An account with this email already exists. Please sign in instead.' 
    };
  }
  
  // Create new user
  const { data: authData, error } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  if (!authData.user) {
    return { success: false, error: 'Failed to create user' };
  }
  
  // Update profile with additional data if provided
  if (firstName || lastName) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('profiles').update({
      first_name: firstName,
      last_name: lastName,
    }).eq('id', authData.user.id);
  }
  
  // Create a welcome project for the new user
  let welcomeProjectId: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: project } = await (supabase as any)
      .from('projects')
      .insert({
        user_id: authData.user.id,
        title: 'My First Project',
        project_type: 'other',
        is_legacy: false,
      })
      .select('id')
      .single();
    
    welcomeProjectId = project?.id;
  } catch (projectError) {
    // Don't fail signup if project creation fails
    console.error('Failed to create welcome project:', projectError);
  }
  
  return {
    success: true,
    user: { id: authData.user.id, email: authData.user.email! },
    welcomeProjectId,
  };
}

/**
 * Server Action: Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Server Action: Request password reset email
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}
