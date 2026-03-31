'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '../../lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, ChefHat, CheckCircle2, Circle, Settings } from 'lucide-react';
import { getChefReadiness } from '@/lib/chef/readiness';

export default function ChefMenuPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [mealCount, setMealCount] = useState(0);
  const [stripeState, setStripeState] = useState<any>(null);

  const isChef = profile?.role === 'chef';
  const vendorReady = !!profile?.vendor_onboarding_complete;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!authLoading && user && profile?.role && profile.role !== 'chef') {
      setLoading(false);
      return;
    }

    if (!authLoading && user && profile?.role === 'chef' && !profile.vendor_onboarding_complete) {
      router.replace('/vendor-onboarding');
      return;
    }

    if (!authLoading && user && profile?.role === 'chef' && profile.vendor_onboarding_complete) {
      loadChefReadinessData();
    }
  }, [authLoading, user, profile, router]);

  const loadChefReadinessData = async () => {
    if (!user) return;
    try {
      const [{ data: profileRow }, { count }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('delivery_enabled, delivery_fee, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled')
          .eq('id', user.id)
          .single(),
        supabase
          .from('meals')
          .select('*', { count: 'exact', head: true })
          .eq('chef_id', user.id),
      ]);

      setStripeState(profileRow || null);
      setMealCount(count ?? 0);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="text-sm text-muted-foreground">Checking your account...</div></div>;
  }

  if (!isChef) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="text-center"><ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-lg font-600 text-foreground">Chef Access Required</p></div></div>;
  }

  if (!vendorReady) {
    return null;
  }

  const readiness = getChefReadiness({
    full_name: profile?.full_name,
    username: profile?.username,
    bio: profile?.bio,
    avatar_url: profile?.avatar_url,
    cover_url: profile?.cover_url,
    location: profile?.location,
    vendor_onboarding_complete: profile?.vendor_onboarding_complete,
    mealCount,
    stripe_account_id: stripeState?.stripe_account_id,
    stripe_onboarding_complete: stripeState?.stripe_onboarding_complete,
    stripe_charges_enabled: stripeState?.stripe_charges_enabled,
    stripe_payouts_enabled: stripeState?.stripe_payouts_enabled,
  });

  const missingItems = readiness.items.filter((item) => !item.complete);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-700 text-foreground leading-tight">Chef Dashboard</h1>
            <p className="text-sm text-muted-foreground">Finish your setup, manage your profile, and get your kitchen ready for orders.</p>
          </div>
          <Link href="/edit-profile" className="flex items-center gap-1.5 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full">
            <Settings className="w-4 h-4" />
            Edit Vendor Profile
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-sm font-700 text-foreground">Chef readiness</p>
              <p className="text-xs text-muted-foreground">{readiness.completedCount} of {readiness.totalCount} setup areas complete</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-700 text-foreground">{readiness.percent}%</p>
              <p className="text-xs text-muted-foreground capitalize">{readiness.status.replace('-', ' ')}</p>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-4"><div className="h-full bg-primary rounded-full" style={{ width: `${readiness.percent}%` }} /></div>
          <div className="space-y-3">
            {readiness.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                <div className="flex items-center gap-3">{item.complete ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}<span className="text-sm text-foreground">{item.label}</span></div>
                {!item.complete && <Link href={item.ctaHref} className="text-xs font-700 text-primary hover:underline">{item.ctaLabel}</Link>}
              </div>
            ))}
          </div>
        </div>

        {missingItems.length > 0 ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-sm font-700 text-foreground mb-3">What to do next</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {missingItems.map((item) => (
                <Link key={item.key} href={item.ctaHref} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 hover:border-primary/30 transition-colors">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <span className="text-xs font-700 text-primary">{item.ctaLabel}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
            <p className="text-sm font-700 text-foreground">You?re chef-ready.</p>
            <p className="text-xs text-muted-foreground mt-1">Your profile, vendor setup, menu, and payouts are all in good shape.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/edit-profile" className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"><p className="text-sm font-700 text-foreground">Complete vendor profile</p><p className="text-xs text-muted-foreground mt-1">Edit business name, bio, photos, and location.</p></Link>
          <Link href="/profile-screen" className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"><p className="text-sm font-700 text-foreground">Open vendor hub</p><p className="text-xs text-muted-foreground mt-1">Manage menu, profile, and vendor tools.</p></Link>
          <button className="rounded-2xl border border-border bg-card p-4 text-left"><p className="text-sm font-700 text-foreground">Connect payout</p><p className="text-xs text-muted-foreground mt-1">Stripe setup will live here for chef payouts.</p></button>
        </div>
      </div>
    </AppLayout>
  );
}
