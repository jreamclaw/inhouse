'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '../../lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, CheckCircle2, Circle, Settings, Wallet, Package, Plus, Trash2 } from 'lucide-react';
import { getChefReadiness } from '@/lib/chef/readiness';

type Meal = { id: string; title: string; description: string | null; price: number; category: string; available: boolean; image_url: string | null };

export default function ChefMenuPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stripeState, setStripeState] = useState<any>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  const isChef = profile?.role === 'chef';
  const vendorReady = !!profile?.vendor_onboarding_complete;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setActiveSection(params.get('section') || '');
    }
  }, []);

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
      loadChefData();
    }
  }, [authLoading, user, profile, router]);

  const loadChefData = async () => {
    if (!user) return;
    try {
      const [{ data: profileRow }, { data: mealRows }] = await Promise.all([
        supabase.from('user_profiles').select('delivery_enabled, delivery_fee, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled').eq('id', user.id).single(),
        supabase.from('meals').select('id, title, description, price, category, available, image_url').eq('chef_id', user.id).order('created_at', { ascending: false }),
      ]);
      setStripeState(profileRow || null);
      setMeals(mealRows || []);
    } finally {
      setLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    try {
      setStripeLoading(true);
      const response = await fetch('/api/stripe/connect', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload?.url) throw new Error(payload?.error || 'Unable to start Stripe setup.');
      window.location.href = payload.url;
    } catch (error) {
      console.error(error);
      setStripeLoading(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    const { error } = await supabase.from('meals').delete().eq('id', mealId);
    if (!error) setMeals((prev) => prev.filter((meal) => meal.id !== mealId));
  };

  if (authLoading || !user || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="text-sm text-muted-foreground">Checking your account...</div></div>;
  }

  if (!isChef) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="text-center"><ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-lg font-600 text-foreground">Chef Access Required</p></div></div>;
  }

  if (!vendorReady) return null;

  const readiness = getChefReadiness({
    full_name: profile?.full_name,
    username: profile?.username,
    bio: profile?.bio,
    avatar_url: profile?.avatar_url,
    cover_url: profile?.cover_url,
    location: profile?.location,
    vendor_onboarding_complete: profile?.vendor_onboarding_complete,
    mealCount: meals.length,
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
            <p className="text-sm text-muted-foreground">Finish your setup, manage your menu, and get your kitchen ready for orders.</p>
          </div>
          <Link href="/edit-profile" className="flex items-center gap-1.5 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full"><Settings className="w-4 h-4" />Edit Vendor Profile</Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4 mb-3"><div><p className="text-sm font-700 text-foreground">Chef readiness</p><p className="text-xs text-muted-foreground">{readiness.completedCount} of {readiness.totalCount} setup areas complete</p></div><div className="text-right"><p className="text-2xl font-700 text-foreground">{readiness.percent}%</p><p className="text-xs text-muted-foreground capitalize">{readiness.status.replace('-', ' ')}</p></div></div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-4"><div className="h-full bg-primary rounded-full" style={{ width: `${readiness.percent}%` }} /></div>
          <div className="space-y-3">{readiness.items.map((item) => <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"><div className="flex items-center gap-3">{item.complete ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}<span className="text-sm text-foreground">{item.label}</span></div>{!item.complete && <Link href={item.ctaHref} className="text-xs font-700 text-primary hover:underline">{item.ctaLabel}</Link>}</div>)}</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-700 text-foreground">Menu manager</p>
              <p className="text-xs text-muted-foreground">Add and manage the dishes customers will see.</p>
            </div>
            <Link href="/profile-screen?tab=menu" className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full"><Plus className="w-4 h-4" />Open menu tab</Link>
          </div>
          {meals.length === 0 ? <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No menu items yet. Tap the button below to start building your menu.</div> : <div className="space-y-3">{meals.map((meal) => <div key={meal.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"><div><p className="text-sm font-700 text-foreground">{meal.title}</p><p className="text-xs text-muted-foreground">${Number(meal.price).toFixed(2)} ? {meal.category}</p></div><button onClick={() => handleDeleteMeal(meal.id)} className="inline-flex items-center gap-1 text-xs font-700 text-red-500"><Trash2 className="w-4 h-4" />Remove</button></div>)}</div>}
          <div className="mt-4">
            <Link href="/create-post" className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full">
              <Plus className="w-4 h-4" />
              Add your first meal
            </Link>
          </div>
        </div>

        {activeSection === 'menu-manager' && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><p className="text-sm font-700 text-foreground mb-2">Menu manager</p><p className="text-xs text-muted-foreground mb-3">Use this section to build your food catalog. For now, the quick add flow routes into content creation while we finish the dedicated meal composer.</p><Link href="/create-post" className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full"><Plus className="w-4 h-4" />Add your first meal</Link></div>}

        {activeSection === 'payouts' && <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5"><div className="flex items-center gap-3 mb-2"><Wallet className="w-5 h-5 text-green-600" /><p className="text-sm font-700 text-foreground">Payout setup</p></div><p className="text-xs text-muted-foreground mb-3">Connect Stripe so you can receive payouts from customer orders.</p><button onClick={handleStripeConnect} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full"><Wallet className="w-4 h-4" />{stripeLoading ? 'Connecting...' : 'Connect Stripe'}</button></div>}

        {activeSection === 'orders' && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5"><div className="flex items-center gap-3 mb-2"><Package className="w-5 h-5 text-amber-600" /><p className="text-sm font-700 text-foreground">Orders received</p></div><p className="text-xs text-muted-foreground">This is now the correct route entry for chef order tools.</p></div>}
      </div>
    </AppLayout>
  );
}
