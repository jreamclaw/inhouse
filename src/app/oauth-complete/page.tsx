'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolvePostLoginRoute } from '@/lib/auth/routeResolver';
import { authDebug } from '@/lib/auth/debug';
import { Loader2 } from 'lucide-react';

export default function OAuthCompletePage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState('');

  useEffect(() => {
    const finishOAuth = async () => {
      const pathname = '/oauth-complete';

      const userResult = await supabase.auth.getUser();
      console.log('OAUTH_COMPLETE_GET_USER', userResult);

      const user = userResult.data.user;
      if (userResult.error || !user) {
        const message = userResult.error?.message || 'Auth session missing after OAuth.';
        authDebug('oauth-complete.missing-user', {
          pathname,
          sessionExists: false,
          userId: null,
          profileRole: null,
          onboardingComplete: null,
          vendorOnboardingComplete: null,
          redirectTarget: '/login',
          reason: message,
        });
        setError(message);
        return;
      }

      let { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete')
        .eq('id', user.id)
        .maybeSingle();

      console.log('OAUTH_COMPLETE_PROFILE', { profile, profileError });

      if (profileError) {
        setError(profileError.message);
        return;
      }

      if (!profile) {
        const bootstrapResult = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email ?? '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            username: user.user_metadata?.username || user.email?.split('@')[0] || '',
            role: null,
            onboarding_complete: false,
            vendor_onboarding_complete: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
          .select('role, onboarding_complete, vendor_onboarding_complete')
          .maybeSingle();

        console.log('OAUTH_COMPLETE_BOOTSTRAP', bootstrapResult);

        if (bootstrapResult.error) {
          setError(bootstrapResult.error.message);
          return;
        }

        profile = bootstrapResult.data ?? {
          role: null,
          onboarding_complete: false,
          vendor_onboarding_complete: false,
        };
      }

      const { destination, reason } = resolvePostLoginRoute(profile);

      authDebug('oauth-complete.redirect', {
        pathname,
        sessionExists: true,
        userId: user.id,
        profileRole: profile?.role ?? null,
        onboardingComplete: profile?.onboarding_complete ?? null,
        vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
        redirectTarget: destination,
        reason,
      });

      window.location.assign(destination);
    };

    finishOAuth().catch((err: any) => {
      console.log('OAUTH_COMPLETE_ERROR', err?.message || err);
      setError(err?.message || 'Failed to finish Google sign in.');
    });
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Finishing sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re checking your account and sending you to the right place.
        </p>
        {error && (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
