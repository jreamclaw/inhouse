import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolvePostLoginRoute } from '@/lib/auth/routeResolver';

const PUBLIC_ROUTES = ['/splash', '/login', '/signup', '/forgot-password', '/role-selection', '/auth'];
const AUTH_ONLY_ROUTES = ['/login', '/signup', '/forgot-password'];

function authDebug(scope: string, payload: Record<string, unknown>) {
  console.log(`[AUTH_DEBUG] ${scope}`, JSON.stringify(payload));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/favicon') || pathname.startsWith('/assets')) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
            })
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  authDebug('middleware.entry', {
    pathname,
    sessionExists: isAuthenticated,
    userId: user?.id ?? null,
    profileRole: null,
    onboardingComplete: null,
    vendorOnboardingComplete: null,
    redirectTarget: null,
  });

  if (isAuthenticated) {
    if (isAuthOnlyRoute(pathname)) {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete')
        .eq('id', user.id)
        .single();

      const { destination, reason } = resolvePostLoginRoute(profileData ?? null);

      authDebug('middleware.auth-only-redirect', {
        pathname,
        sessionExists: true,
        userId: user.id,
        profileRole: profileData?.role ?? null,
        onboardingComplete: profileData?.onboarding_complete ?? null,
        vendorOnboardingComplete: profileData?.vendor_onboarding_complete ?? null,
        redirectTarget: destination,
        reason,
      });

      const destUrl = request.nextUrl.clone();
      destUrl.pathname = destination;
      const redirectResponse = NextResponse.redirect(destUrl);
      response.cookies.getAll().forEach(({ name, value }) => {
        redirectResponse.cookies.set(name, value);
      });
      return redirectResponse;
    }

    authDebug('middleware.allow-authenticated', {
      pathname,
      sessionExists: true,
      userId: user.id,
      profileRole: null,
      onboardingComplete: null,
      vendorOnboardingComplete: null,
      redirectTarget: null,
      reason: 'authenticated-non-auth-route',
    });
    return response;
  }

  if (isPublicRoute(pathname)) {
    authDebug('middleware.allow-public', {
      pathname,
      sessionExists: false,
      userId: null,
      profileRole: null,
      onboardingComplete: null,
      vendorOnboardingComplete: null,
      redirectTarget: null,
      reason: 'public-route',
    });
    return response;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  authDebug('middleware.redirect-login', {
    pathname,
    sessionExists: false,
    userId: null,
    profileRole: null,
    onboardingComplete: null,
    vendorOnboardingComplete: null,
    redirectTarget: '/login',
    reason: 'protected-route-without-session',
  });
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};
