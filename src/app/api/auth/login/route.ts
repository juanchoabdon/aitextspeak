import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { 
  findLegacyUserByEmail, 
  verifyLegacyPassword, 
  migrateLegacyUser 
} from '@/lib/auth/legacy';
import type { AuthResult } from '@/types';

/**
 * POST /api/auth/login
 * 
 * Handles user login with support for:
 * 1. Regular Supabase authentication
 * 2. Silent legacy user migration
 * 
 * Request body:
 * {
 *   email: string
 *   password: string
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   user?: { id: string, email: string }
 *   isLegacyMigration?: boolean
 *   error?: string
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<AuthResult>> {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = await createClient();

    // ========================================
    // STEP 1: Try regular Supabase auth first
    // ========================================
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authData?.user) {
      // User exists in Supabase and password is correct
      return NextResponse.json({
        success: true,
        user: { 
          id: authData.user.id, 
          email: authData.user.email! 
        },
        isLegacyMigration: false,
      });
    }

    // ========================================
    // STEP 2: Check for legacy user
    // ========================================
    const legacyUser = await findLegacyUserByEmail(normalizedEmail);

    if (!legacyUser) {
      // No user found in either system
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ========================================
    // STEP 3: Verify legacy password
    // ========================================
    const isValidPassword = await verifyLegacyPassword(password, legacyUser.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ========================================
    // STEP 4: Migrate legacy user to Supabase
    // ========================================
    const migrationResult = await migrateLegacyUser(normalizedEmail, password);

    if (!migrationResult.success) {
      console.error('Legacy migration failed:', migrationResult.error);
      return NextResponse.json(
        { success: false, error: 'Account migration failed. Please contact support.' },
        { status: 500 }
      );
    }

    // ========================================
    // STEP 5: Sign in with newly created account
    // ========================================
    const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (newAuthError || !newAuthData?.user) {
      console.error('Post-migration login failed:', newAuthError);
      return NextResponse.json(
        { success: false, error: 'Migration succeeded but login failed. Please try again.' },
        { status: 500 }
      );
    }

    // Success! User has been migrated and logged in
    return NextResponse.json({
      success: true,
      user: { 
        id: newAuthData.user.id, 
        email: newAuthData.user.email! 
      },
      isLegacyMigration: true,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

