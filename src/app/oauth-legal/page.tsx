'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resolvePostLoginRoute } from '@/lib/auth/routeResolver';

export default function OAuthLegalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete, terms_accepted_at, privacy_accepted_at')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.terms_accepted_at && profile?.privacy_accepted_at) {
        const { destination } = resolvePostLoginRoute(profile as any);
        router.replace(destination);
        return;
      }

      setLoading(false);
    };

    load().catch((err: any) => {
      setError(err?.message || 'Failed to load legal acceptance.');
      setLoading(false);
    });
  }, [router, supabase]);

  const handleContinue = async () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const acceptedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          terms_accepted_at: acceptedAt,
          privacy_accepted_at: acceptedAt,
          updated_at: acceptedAt,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.updateUser({
          data: {
            ...session.user.user_metadata,
            terms_accepted_at: acceptedAt,
            privacy_accepted_at: acceptedAt,
          },
        });
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const { destination } = resolvePostLoginRoute((profile || {
        role: null,
        onboarding_complete: false,
        vendor_onboarding_complete: false,
      }) as any);

      window.location.assign(destination);
    } catch (err: any) {
      setError(err?.message || 'Failed to save legal acceptance.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Preparing your account...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Before you continue</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          You need to accept the Terms of Service and Privacy Policy to finish creating your account.
        </p>

        <div className="mt-6 space-y-4">
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms-of-service" target="_blank" className="font-semibold text-primary hover:underline">
                Terms of Service
              </Link>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border"
            />
            <span>
              I agree to the{' '}
              <Link href="/privacy-policy" target="_blank" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <button
          onClick={handleContinue}
          disabled={saving}
          className="mt-6 w-full h-12 rounded-2xl bg-primary text-white text-sm font-700 hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Accept and continue'}
        </button>
      </div>
    </div>
  );
}
