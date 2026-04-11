'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { reverseGeocode } from '@/lib/location/geocode';
import { getCurrentRuntimeLocation, RuntimeLocationError } from '@/lib/location/runtime';
import { authDebug } from '@/lib/auth/debug';
import AppLayout from '@/components/AppLayout';
import { ArrowRight, CheckCircle2, Compass, Loader2, MapPin, ShoppingBag, Sparkles, Users } from 'lucide-react';

type Role = 'chef' | 'customer';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const supabase = createClient();
  const resolvedUserId = user?.id ?? profile?.id ?? null;

  const [locationGranted, setLocationGranted] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Not added yet');
  const [locationLoading, setLocationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authDebug('onboarding.page-entry', {
      pathname: '/onboarding',
      sessionExists: !!user,
      userId: resolvedUserId,
      profileRole: profile?.role ?? null,
      onboardingComplete: profile?.onboarding_complete ?? null,
      vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
      redirectTarget: null,
      loading,
      profilePresent: !!profile,
      redirectExecuted: false,
    });

    if (loading) {
      authDebug('onboarding.waiting-for-hydration', {
        pathname: '/onboarding',
        sessionExists: !!user,
        userId: resolvedUserId,
        profileRole: profile?.role ?? null,
        onboardingComplete: profile?.onboarding_complete ?? null,
        vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
        redirectTarget: null,
        loading,
        profilePresent: !!profile,
        redirectExecuted: false,
      });
      return;
    }

    if (!user) {
      authDebug('onboarding.redirect-no-session', {
        pathname: '/onboarding',
        sessionExists: false,
        userId: null,
        profileRole: null,
        onboardingComplete: null,
        vendorOnboardingComplete: null,
        redirectTarget: '/login',
        loading,
        profilePresent: !!profile,
        redirectExecuted: true,
      });
      router.replace('/login');
      return;
    }

    if (!profile) {
      authDebug('onboarding.redirect-missing-profile', {
        pathname: '/onboarding',
        sessionExists: true,
        userId: resolvedUserId,
        profileRole: null,
        onboardingComplete: null,
        vendorOnboardingComplete: null,
        redirectTarget: '/role-selection',
        loading,
        profilePresent: false,
        redirectExecuted: true,
      });
      router.replace('/role-selection');
      return;
    }

    if (!profile.role) {
      authDebug('onboarding.redirect-missing-role', {
        pathname: '/onboarding',
        sessionExists: true,
        userId: resolvedUserId,
        profileRole: null,
        onboardingComplete: profile.onboarding_complete ?? null,
        vendorOnboardingComplete: profile.vendor_onboarding_complete ?? null,
        redirectTarget: '/role-selection',
        loading,
        profilePresent: true,
        redirectExecuted: true,
      });
      router.replace('/role-selection');
      return;
    }

    if (profile.role === 'chef') {
      authDebug('onboarding.redirect-chef', {
        pathname: '/onboarding',
        sessionExists: true,
        userId: resolvedUserId,
        profileRole: profile.role,
        onboardingComplete: profile.onboarding_complete ?? null,
        vendorOnboardingComplete: profile.vendor_onboarding_complete ?? null,
        redirectTarget: '/vendor-onboarding',
        loading,
        profilePresent: true,
        redirectExecuted: true,
      });
      router.replace('/vendor-onboarding');
      return;
    }

    if (profile.location) {
      setLocationGranted(true);
      setLocationLabel(profile.location);
    }
  }, [loading, user, profile, router, resolvedUserId]);

  const handleRequestLocation = async () => {
    setLocationLoading(true);
    setError('');

    try {
      const position = await getCurrentRuntimeLocation();
      const resolved = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      const fullAddress = resolved?.fullAddress || 'Current location';
      setLocationGranted(true);
      setLocationLabel(fullAddress);

      if (resolvedUserId) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            location: fullAddress,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            updated_at: new Date().toISOString(),
          })
          .eq('id', resolvedUserId);

        if (updateError) throw updateError;
      }
    } catch (err: any) {
      const message = err instanceof RuntimeLocationError
        ? err.message
        : (err?.message || 'We could not save your location.');
      setError(message);
      setLocationGranted(false);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (!profile?.role) {
      router.replace('/role-selection');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const existingRole = profile.role as Role;
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          onboarding_complete: true,
          location_permission_granted: locationGranted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedUserId);

      if (updateError) throw updateError;

      if (existingRole === 'chef') {
        router.replace('/vendor-onboarding');
      } else {
        router.replace('/home-feed');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading onboarding...</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <div className="rounded-[28px] border border-border bg-card overflow-hidden shadow-sm">
          <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 px-6 py-8 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome to InHouse
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight">Let&apos;s get your customer profile ready.</h1>
            <p className="mt-2 text-sm text-white/85 max-w-md">
              A couple quick steps and you&apos;ll be ready to discover local chefs, save your favorites, and start ordering.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <FeatureCard icon={<Compass className="w-5 h-5 text-primary" />} title="Discover nearby chefs" text="Find local home kitchens and fresh meals around you." />
              <FeatureCard icon={<Users className="w-5 h-5 text-primary" />} title="Follow your favorites" text="Save chefs you want to come back to later." />
              <FeatureCard icon={<ShoppingBag className="w-5 h-5 text-primary" />} title="Order faster" text="Set up your account once and get straight to the food." />
            </div>

            <div className="rounded-3xl border border-border bg-muted/30 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Location</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add your location so we can show chefs and meals near you.
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {locationGranted ? locationLabel : 'No location added yet'}
                  </p>
                </div>
                {locationGranted && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-1" />}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRequestLocation}
                  disabled={locationLoading || saving}
                  className="flex-1 h-11 rounded-2xl border border-primary/20 bg-primary/5 text-primary font-semibold hover:bg-primary/10 transition-colors disabled:opacity-60"
                >
                  {locationLoading ? 'Getting location...' : locationGranted ? 'Update location' : 'Use current location'}
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 h-11 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {saving ? 'Finishing setup...' : 'Finish setup'}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
