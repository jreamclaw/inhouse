import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

/**
 * Determine the correct post-login route based on user profile fields.
 * Mirrors the client-side getPostLoginRoute logic in AuthContext.
 */
function resolveRoute(profile: {
  role: string | null;
  onboarding_complete: boolean;
  vendor_onboarding_complete: boolean;
} | null): string {
  if (!profile) {
    console.log('[Auth Callback] No profile found → /role-selection');
    return '/role-selection';
  }

  const { role, onboarding_complete, vendor_onboarding_complete } = profile;

  console.log('[Auth Callback] resolveRoute: role=', role, 'onboarding_complete=', onboarding_complete, 'vendor_onboarding_complete=', vendor_onboarding_complete);

  if (!role) {
    console.log('[Auth Callback] No role → /role-selection');
    return '/role-selection';
  }

  if (role === 'customer') {
    if (!onboarding_complete) {
      console.log('[Auth Callback] Customer onboarding incomplete → /onboarding');
      return '/onboarding';
    }
    console.log('[Auth Callback] Customer done → /home-feed');
    return '/home-feed';
  }

  if (role === 'chef') {
  if (!vendor_onboarding_complete)
  {
  console.log('[Auth Callback] Chef -> /vendor-onboarding');
  return '/vendor-onboarding';
  }
  console.log('[Auth Callback] Chef -> /chef-menu');
  return '/chef-menu';
  }

  console.log('[Auth Callback] Fallback → /home-feed');
  return '/home-feed';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home-feed';
  const requestedRole = searchParams.get('role');

  if (code) {
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && authData?.user) {
      const userId = authData.user.id;
      const metadataRole = authData.user.user_metadata?.role;
      const role = (requestedRole === 'chef' || requestedRole === 'customer')
        ? requestedRole
        : (metadataRole === 'chef' || metadataRole === 'customer' ? metadataRole : null);
      console.log('[Auth Callback] Session exchanged successfully for user:', userId);

      // Fetch the user profile
      let { data: profile } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete')
        .eq('id', userId)
        .single();

      // If profile row doesn't exist yet, create it
      if (!profile) {
        console.log('[Auth Callback] No profile row found — creating one for user:', userId);
        const userEmail = authData.user.email ?? '';
        const userMeta = authData.user.user_metadata ?? {};
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: userEmail,
            full_name: userMeta.full_name || userMeta.name || userEmail.split('@')[0],
            avatar_url: userMeta.avatar_url || userMeta.picture || '',
            username: userMeta.username || userEmail.split('@')[0],
            role: (role === 'chef' || role === 'customer') ? role : null,
            onboarding_complete: false,
            vendor_onboarding_complete: false,
          })
          .select('role, onboarding_complete, vendor_onboarding_complete')
          .single();
        profile = newProfile;
        console.log('[Auth Callback] Created new profile:', newProfile);
      }

      // If role was passed via query param (OAuth signup flow), update it
      if (role && (role === 'chef' || role === 'customer') && profile?.role !== role) {
        await supabase
          .from('user_profiles')
          .update({ role })
          .eq('id', userId);
        if (profile) {
          profile = { ...profile, role };
        }
        console.log('[Auth Callback] Updated role to:', role);
      }

      // If next is 'role-based', determine route from profile state
      if (next === 'role-based') {
        const destination = resolveRoute(profile);
        console.log('[Auth Callback] Final route decision:', destination);
        return NextResponse.redirect(`${origin}${destination}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.log('[Auth Callback] Code exchange failed:', error?.message);
  }

  return NextResponse.redirect(`${origin}/login`);
}
