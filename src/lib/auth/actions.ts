'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { migrateLegacyUser, findLegacyUserByEmail, verifyLegacyPassword } from './legacy';
import type { AuthResult, LoginCredentials, SignupData } from '@/types';
import { triggerAutomation } from '@/lib/crm/automations';

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
  const { email, password, firstName, lastName, deviceId } = data;
  
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }
  
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }
  
  const supabase = await createClient();
  const adminClient = createAdminClient();
  
  // Check if user already exists in legacy system
  const legacyUser = await findLegacyUserByEmail(email);
  if (legacyUser) {
    return { 
      success: false, 
      error: 'An account with this email already exists. Please sign in instead.' 
    };
  }
  
  // Check if this device has already created accounts (abuse detection)
  let isSuspicious = false;
  let deviceAccountCount = 1;
  
  if (deviceId) {
    const { data: existingDeviceAccounts, error: deviceError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId);
    
    if (!deviceError && existingDeviceAccounts && existingDeviceAccounts.length > 0) {
      // Device has already created account(s)
      isSuspicious = true;
      deviceAccountCount = existingDeviceAccounts.length + 1;
      console.log(`[SignUp] Suspicious: Device ${deviceId} has ${existingDeviceAccounts.length} existing accounts`);
    }
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
  
  // Update profile with additional data including device fingerprint
  const profileUpdate: Record<string, unknown> = {};
  if (firstName) profileUpdate.first_name = firstName;
  if (lastName) profileUpdate.last_name = lastName;
  if (deviceId) {
    profileUpdate.device_id = deviceId;
    profileUpdate.is_suspicious = isSuspicious;
    profileUpdate.device_account_count = deviceAccountCount;
  }
  
  if (Object.keys(profileUpdate).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any).from('profiles').update(profileUpdate).eq('id', authData.user.id);
    
    // Also update device_account_count for other accounts with same device
    if (deviceId && isSuspicious) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('profiles')
        .update({ 
          is_suspicious: true,
          device_account_count: deviceAccountCount 
        })
        .eq('device_id', deviceId);
    }
  }
  
  // Create a welcome project for the new user (using admin client to bypass RLS)
  let welcomeProjectId: string | undefined;
  try {
    const adminClient = createAdminClient();
    
    // Check if user already has projects (edge case)
    const { data: existingProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('user_id', authData.user.id)
      .limit(1);
    
    // Only create project if user has none
    if (!existingProjects || existingProjects.length === 0) {
      const { data: project, error: insertError } = await adminClient
        .from('projects')
        .insert({
          user_id: authData.user.id,
          title: 'My First Project',
          project_type: 'other',
          is_legacy: false,
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('Failed to create welcome project:', insertError);
      } else if (project) {
        welcomeProjectId = project.id;
        console.log('Created welcome project:', welcomeProjectId);
      }
    } else {
      // User already has projects, use the first one
      welcomeProjectId = existingProjects[0].id;
      console.log('User already has projects, using:', welcomeProjectId);
    }
  } catch (projectError) {
    // Don't fail signup if project creation fails
    console.error('Failed to create welcome project:', projectError);
  }

  // Trigger welcome email automation for free users (production only)
  if (process.env.NODE_ENV === 'production') {
    try {
      triggerAutomation('welcome_free', authData.user.id).catch(err => {
        console.error('Failed to send welcome email:', err);
      });
    } catch (emailError) {
      // Don't fail signup if email fails
      console.error('Failed to trigger welcome email:', emailError);
    }
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
