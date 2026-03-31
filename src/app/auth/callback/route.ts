import { createClient } from '@/lib/supabase/server';
import { authDebug } from '@/lib/auth/debug';
import { resolvePostLoginRoute } from '@/lib/auth/routeResolver';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin, pathname } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home-feed';
  const requestedRole = searchParams.get('role');

  authDebug('auth-callback.entry', {
    pathname,
    sessionExists: false,
    userId: null,
    profileRole: null,
    onboardingComplete: null,
    vendorOnboardingComplete: null,
    redirectTarget: code ? next : '/login',
    requestedRole,
    hasCode: !!code,
  });

  if (code) {
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && authData?.user) {
      const userId = authData.user.id;
      const metadataRole = authData.user.user_metadata?.role;
      const role = (requestedRole === 'chef' || requestedRole === 'customer')
        ? requestedRole
        : (metadataRole === 'chef' || metadataRole === 'customer' ? metadataRole : null);

      authDebug('auth-callback.session-exchanged', {
        pathname,
        sessionExists: true,
        userId,
        profileRole: role,
        onboardingComplete: null,
        vendorOnboardingComplete: null,
        redirectTarget: next,
      });

      let { data: profile } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete')
        .eq('id', userId)
        .single();

      authDebug('auth-callback.profile-fetch', {
        pathname,
        sessionExists: true,
        userId,
        profileRole: profile?.role ?? null,
        onboardingComplete: profile?.onboarding_complete ?? null,
        vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
        redirectTarget: null,
        foundProfile: !!profile,
      });

      if (!profile) {
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

        authDebug('auth-callback.profile-created', {
          pathname,
          sessionExists: true,
          userId,
          profileRole: profile?.role ?? null,
          onboardingComplete: profile?.onboarding_complete ?? null,
          vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
          redirectTarget: null,
        });
      }

      if (role && (role === 'chef' || role === 'customer') && profile?.role !== role) {
        await supabase.from('user_profiles').update({ role }).eq('id', userId);
        if (profile) profile = { ...profile, role };

        authDebug('auth-callback.profile-role-updated', {
          pathname,
          sessionExists: true,
          userId,
          profileRole: role,
          onboardingComplete: profile?.onboarding_complete ?? null,
          vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
          redirectTarget: null,
        });
      }

      if (next === 'role-based') {
        const { destination, reason } = resolvePostLoginRoute(profile);
        authDebug('auth-callback.final-redirect', {
          pathname,
          sessionExists: true,
          userId,
          profileRole: profile?.role ?? null,
          onboardingComplete: profile?.onboarding_complete ?? null,
          vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
          redirectTarget: destination,
          reason,
        });
        return NextResponse.redirect(`${origin}${destination}`);
      }

      authDebug('auth-callback.final-redirect', {
        pathname,
        sessionExists: true,
        userId,
        profileRole: profile?.role ?? null,
        onboardingComplete: profile?.onboarding_complete ?? null,
        vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
        redirectTarget: next,
        reason: 'explicit-next',
      });
      return NextResponse.redirect(`${origin}${next}`);
    }

    authDebug('auth-callback.code-exchange-failed', {
      pathname,
      sessionExists: false,
      userId: null,
      profileRole: null,
      onboardingComplete: null,
      vendorOnboardingComplete: null,
      redirectTarget: '/login',
      reason: error?.message ?? 'unknown',
    });
  }

  authDebug('auth-callback.exit-no-code', {
    pathname,
    sessionExists: false,
    userId: null,
    profileRole: null,
    onboardingComplete: null,
    vendorOnboardingComplete: null,
    redirectTarget: '/login',
    reason: 'missing-code',
  });
  return NextResponse.redirect(`${origin}/login`);
}
