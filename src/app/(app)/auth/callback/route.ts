import { createClient } from '@/lib/supabase/server';
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

        // Create profile if it doesn't exist (for OAuth users)
        if (!profile) {
          const userMetadata = user.user_metadata;
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email!,
            first_name: userMetadata?.full_name?.split(' ')[0] || userMetadata?.name?.split(' ')[0] || null,
            last_name: userMetadata?.full_name?.split(' ').slice(1).join(' ') || null,
            avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null,
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/signin?error=Could not authenticate`);
}



