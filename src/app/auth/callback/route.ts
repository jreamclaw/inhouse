import { createServerClient } from '@supabase/ssr';
import { authDebug } from '@/lib/auth/debug';
import { resolvePostLoginRoute } from '@/lib/auth/routeResolver';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

function normalizeNextPath(next: string | null) {
  if (!next) return 'role-based';
  if (next === 'role-based') return next;
  return next.startsWith('/') ? next : '/home-feed';
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams, origin, pathname } = url;
  const code = searchParams.get('code');
  const next = normalizeNextPath(searchParams.get('next'));

  authDebug('auth-callback.entry', {
    pathname,
    sessionExists: false,
    userId: null,
    profileRole: null,
    onboardingComplete: null,
    vendorOnboardingComplete: null,
    redirectTarget: code ? next : '/login',
    requestedRole: null,
    hasCode: !!code,
  });

  if (!code) {
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
    const loginUrl = new URL('/login', origin);
    if (next && next !== 'role-based') {
      loginUrl.searchParams.set('next', next);
    }
    return NextResponse.redirect(loginUrl);
  }

  const redirectUrlPlaceholder = new URL(next === 'role-based' ? '/home-feed' : next, origin).toString();
  const response = NextResponse.redirect(redirectUrlPlaceholder);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
            });
          });
        },
      },
    }
  );

  const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);
  const exchangedSession = authData?.session ?? null;
  const exchangedUser = authData?.user ?? exchangedSession?.user ?? null;

  authDebug('auth-callback.exchange-result', {
    pathname,
    sessionExists: !!exchangedSession,
    userId: exchangedUser?.id ?? null,
    profileRole: null,
    onboardingComplete: null,
    vendorOnboardingComplete: null,
    redirectTarget: null,
    reason: error?.message ?? null,
    hasAccessToken: !!exchangedSession?.access_token,
    hasRefreshToken: !!exchangedSession?.refresh_token,
  });

  authDebug('callback.session-result', {
    pathname,
    sessionExists: !!exchangedSession,
    userId: exchangedUser?.id ?? null,
    profileRole: null,
    onboardingComplete: null,
    vendorOnboardingComplete: null,
    redirectTarget: null,
    reason: error?.message ?? null,
  });

  if (error || !exchangedUser) {
    authDebug('auth-callback.code-exchange-failed', {
      pathname,
      sessionExists: false,
      userId: null,
      profileRole: null,
      onboardingComplete: null,
      vendorOnboardingComplete: null,
      redirectTarget: '/login',
      reason: error?.message ?? 'missing-session-after-exchange',
    });
    const loginUrl = new URL('/login', origin);
    if (next && next !== 'role-based') {
      loginUrl.searchParams.set('next', next);
    }
    return NextResponse.redirect(loginUrl);
  }

  const userId = exchangedUser.id;

  authDebug('auth-callback.session-exchanged', {
    pathname,
    sessionExists: !!exchangedSession,
    userId,
    profileRole: null,
    onboardingComplete: null,
    vendorOnboardingComplete: null,
    redirectTarget: next,
  });

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('user_profiles')
    .select('role, onboarding_complete, vendor_onboarding_complete')
    .eq('id', userId)
    .maybeSingle();

  if (profileLookupError) {
    authDebug('auth-callback.profile-fetch-error', {
      pathname,
      sessionExists: !!exchangedSession,
      userId,
      profileRole: null,
      onboardingComplete: null,
      vendorOnboardingComplete: null,
      redirectTarget: null,
      reason: profileLookupError.message,
    });
  }

  let profile = existingProfile;
  const role = existingProfile?.role ?? null;

  authDebug('auth-callback.profile-fetch', {
    pathname,
    sessionExists: !!exchangedSession,
    userId,
    profileRole: profile?.role ?? null,
    onboardingComplete: profile?.onboarding_complete ?? null,
    vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
    redirectTarget: null,
    foundProfile: !!profile,
  });

  if (!profile) {
    const userEmail = exchangedUser.email ?? '';
    const userMeta = exchangedUser.user_metadata ?? {};
    const { data: newProfile, error: profileUpsertError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email: userEmail,
        full_name: userMeta.full_name || userMeta.name || userEmail.split('@')[0],
        avatar_url: userMeta.avatar_url || userMeta.picture || '',
        username: userMeta.username || userEmail.split('@')[0],
        role: null,
        onboarding_complete: false,
        vendor_onboarding_complete: false,
      }, { onConflict: 'id' })
      .select('role, onboarding_complete, vendor_onboarding_complete')
      .maybeSingle();

    if (profileUpsertError) {
      authDebug('auth-callback.profile-create-error', {
        pathname,
        sessionExists: !!exchangedSession,
        userId,
        profileRole: null,
        onboardingComplete: null,
        vendorOnboardingComplete: null,
        redirectTarget: null,
        reason: profileUpsertError.message,
      });
    }

    profile = newProfile ?? {
      role: null,
      onboarding_complete: false,
      vendor_onboarding_complete: false,
    };

    authDebug('auth-callback.profile-created', {
      pathname,
      sessionExists: !!exchangedSession,
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
      sessionExists: !!exchangedSession,
      userId,
      profileRole: role,
      onboardingComplete: profile?.onboarding_complete ?? null,
      vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
      redirectTarget: null,
    });
  }

  authDebug('auth-callback.route-input', {
    pathname,
    sessionExists: !!exchangedSession,
    userId,
    profileRole: profile?.role ?? null,
    onboardingComplete: profile?.onboarding_complete ?? null,
    vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
    redirectTarget: next,
    profilePresent: !!profile,
  });

  const { destination, reason } = next === 'role-based'
    ? resolvePostLoginRoute(profile)
    : { destination: next, reason: 'explicit-next' };

  const redirectUrl = new URL(destination, origin).toString();

  authDebug('auth-callback.final-redirect', {
    pathname,
    sessionExists: !!exchangedSession,
    userId,
    profileRole: profile?.role ?? null,
    onboardingComplete: profile?.onboarding_complete ?? null,
    vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
    redirectTarget: destination,
    finalRedirectUrl: redirectUrl,
    reason,
  });

  response.headers.set('Location', redirectUrl);
  return response;
}
