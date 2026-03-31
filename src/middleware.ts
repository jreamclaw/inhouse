import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/splash', '/login', '/signup', '/forgot-password', '/role-selection', '/auth'];

// Routes that authenticated users should NOT be able to access
const AUTH_ONLY_ROUTES = ['/login', '/signup', '/forgot-password'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets')
  ) {
    return NextResponse.next();
  }

  // Root path: let page.tsx handle it (it does server-side auth check)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Create a mutable response to carry updated cookies
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // First apply to request so downstream server components see them
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Rebuild response with updated request, then set all cookies with options
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

  // Use getUser() which authenticates the token by contacting the Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // --- AUTHENTICATED USER ---
  if (isAuthenticated) {
    // If authenticated user lands on auth-only routes, forward them to correct destination
    if (isAuthOnlyRoute(pathname)) {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete')
        .eq('id', user.id)
        .single();

      let destination = '/role-selection';

      if (profileData) {
        const { role, onboarding_complete, vendor_onboarding_complete } = profileData as {
          role: string | null;
          onboarding_complete: boolean;
          vendor_onboarding_complete: boolean;
        };

        if (!role) {
          destination = '/role-selection';
        } else if (role === 'customer') {
          destination = onboarding_complete ? '/home-feed' : '/onboarding';
        } else if (role === 'chef') {
          if (!vendor_onboarding_complete) {
            destination = '/vendor-onboarding';
          } else {
            destination = '/chef-menu';
          }
        }
      }

      const destUrl = request.nextUrl.clone();
      destUrl.pathname = destination;
      const redirectResponse = NextResponse.redirect(destUrl);
      // Copy updated auth cookies to the redirect response
      response.cookies.getAll().forEach(({ name, value }) => {
        redirectResponse.cookies.set(name, value);
      });
      return redirectResponse;
    }

    // Authenticated user accessing a protected route — allow through
    return response;
  }

  // --- UNAUTHENTICATED USER ---

  // Allow public routes for unauthenticated users
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Redirect unauthenticated users trying to access protected routes → login
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
};

