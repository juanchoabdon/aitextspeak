import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  console.log('[OAuth Callback] Starting with next:', next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Check if user has a profile, create one if not
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('[OAuth Callback] User authenticated:', user.id);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        let isNewUser = false;
        let welcomeProjectId: string | null = null;

        // Create profile if it doesn't exist (for OAuth users)
        if (!profile) {
          isNewUser = true;
          console.log('[OAuth Callback] New user detected, creating profile...');
          
          const userMetadata = user.user_metadata;
          const adminClient = createAdminClient();
          
          const { error: profileError } = await adminClient.from('profiles').insert({
            id: user.id,
            email: user.email!,
            first_name: userMetadata?.full_name?.split(' ')[0] || userMetadata?.name?.split(' ')[0] || null,
            last_name: userMetadata?.full_name?.split(' ').slice(1).join(' ') || null,
            avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null,
          });
          
          if (profileError) {
            console.error('[OAuth Callback] Failed to create profile:', profileError);
          } else {
            console.log('[OAuth Callback] Profile created successfully');
          }
          
          // Create a welcome project for new OAuth users (using admin client to bypass RLS)
          console.log('[OAuth Callback] Creating welcome project...');
          const { data: project, error: projectError } = await adminClient
            .from('projects')
            .insert({
              user_id: user.id,
              title: 'My First Project',
              project_type: 'other',
              is_legacy: false,
            })
            .select('id')
            .single();
          
          if (projectError) {
            console.error('[OAuth Callback] Failed to create welcome project:', projectError);
          } else if (project) {
            console.log('[OAuth Callback] Welcome project created:', project.id);
            welcomeProjectId = project.id;
          }
        }

        // Redirect new users to their welcome project
        if (isNewUser && welcomeProjectId) {
          console.log('[OAuth Callback] Redirecting new user to project:', welcomeProjectId);
          return NextResponse.redirect(
            `${origin}/dashboard/projects/${welcomeProjectId}?oauth=google&new_user=1&user_id=${user.id}`
          );
        }

        // Existing users or fallback: redirect to next page
        const separator = next.includes('?') ? '&' : '?';
        const trackingParams = `oauth=google${isNewUser ? '&new_user=1' : ''}&user_id=${user.id}`;
        console.log('[OAuth Callback] Redirecting to:', `${next}${separator}${trackingParams}`);
        return NextResponse.redirect(`${origin}${next}${separator}${trackingParams}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error('[OAuth Callback] Session exchange error:', error);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/signin?error=Could not authenticate`);
}



