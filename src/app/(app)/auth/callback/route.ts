import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Check if user has a profile, create one if not
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        let isNewUser = false;

        // Create profile if it doesn't exist (for OAuth users)
        if (!profile) {
          isNewUser = true;
          const userMetadata = user.user_metadata;
          const adminClient = createAdminClient();
          
          await adminClient.from('profiles').insert({
            id: user.id,
            email: user.email!,
            first_name: userMetadata?.full_name?.split(' ')[0] || userMetadata?.name?.split(' ')[0] || null,
            last_name: userMetadata?.full_name?.split(' ').slice(1).join(' ') || null,
            avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null,
          });
          
          // Create a welcome project for new OAuth users (using admin client to bypass RLS)
          try {
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
              console.error('Failed to create welcome project for OAuth user:', projectError);
            }
            
            // If we created a project and user isn't going to a specific page, redirect to the project
            if (project && next === '/dashboard') {
              // Add OAuth tracking params for client-side analytics
              return NextResponse.redirect(
                `${origin}/dashboard/projects/${project.id}?oauth=google&new_user=1&user_id=${user.id}`
              );
            }
          } catch (projectError) {
            // Don't fail auth if project creation fails
            console.error('Failed to create welcome project for OAuth user:', projectError);
          }
        }

        // Add OAuth tracking params for client-side analytics
        const separator = next.includes('?') ? '&' : '?';
        const trackingParams = `oauth=google${isNewUser ? '&new_user=1' : ''}&user_id=${user.id}`;
        return NextResponse.redirect(`${origin}${next}${separator}${trackingParams}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/signin?error=Could not authenticate`);
}



