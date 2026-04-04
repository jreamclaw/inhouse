'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '../../lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, CheckCircle2, Circle, Settings, Wallet, Package, Plus, Trash2, Loader2, ImagePlus, X, Clock3, DollarSign, CalendarDays } from 'lucide-react';
import { getChefReadiness } from '@/lib/chef/readiness';
import { toast } from 'sonner';
import OrdersTab from '@/app/vendor-profile/components/OrdersTab';

type ModifierOption = { id: string; label: string; priceAdd: number };
type ModifierGroup = { id: string; name: string; required: boolean; multiSelect: boolean; minSelect?: number; maxSelect?: number; options: ModifierOption[] };
type Meal = { id: string; title: string; description: string | null; price: number; category: string; available: boolean; image_url: string | null; modifier_groups?: ModifierGroup[] };
type BusinessHourRow = { day: string; open: boolean; openTime: string; closeTime: string };

const CATEGORIES = ['Starters', 'Breakfast', 'Lunch', 'Dinner', 'Desserts', 'Drinks', 'Sides'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

function defaultBusinessHours(hoursText?: string | null, closedDays: string[] = []): BusinessHourRow[] {
  const match = hoursText?.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  const openTime = match?.[1] || '10:00';
  const closeTime = match?.[2] || '21:00';
  return DAYS.map((day) => ({ day, open: !closedDays.includes(day), openTime, closeTime }));
}

function formatBusinessHours(rows: BusinessHourRow[]) {
  const openDays = rows.filter((row) => row.open).map((row) => row.day);
  const baseHours = rows.find((row) => row.open);
  if (openDays.length === 0 || !baseHours) return 'Closed all week';
  return `${openDays.join(', ')} • ${baseHours.openTime} - ${baseHours.closeTime}`;
}

function nextPayoutLabel() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const payout = new Date(now);
  payout.setDate(now.getDate() + daysUntilFriday);
  return payout.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChefMenuPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stripeState, setStripeState] = useState<any>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeSyncing, setStripeSyncing] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [showMealForm, setShowMealForm] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [mealTitle, setMealTitle] = useState('');
  const [mealDescription, setMealDescription] = useState('');
  const [mealPrice, setMealPrice] = useState('');
  const [mealCategory, setMealCategory] = useState('Dinner');
  const [mealAvailable, setMealAvailable] = useState(true);
  const [mealImageFile, setMealImageFile] = useState<File | null>(null);
  const [mealImagePreview, setMealImagePreview] = useState<string | null>(null);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [businessHoursRows, setBusinessHoursRows] = useState<BusinessHourRow[]>(defaultBusinessHours());
  const [availabilityOverride, setAvailabilityOverride] = useState<'open' | 'closed' | null>(null);
  const [savingBusinessHours, setSavingBusinessHours] = useState(false);
  const [earningsSummary, setEarningsSummary] = useState({ gross: 0, net: 0, deliveryFees: 0, completedOrders: 0, pendingPayout: 0 });

  const isChef = profile?.role === 'chef';
  const vendorReady = !!profile?.vendor_onboarding_complete;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const section = params.get('section') || 'overview';
      setActiveSection(section === 'menu-manager' ? 'menu' : section);
      if (section === 'menu-manager') setShowMealForm(true);
      if (section === 'payouts') syncStripeStatus();
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
      const [{ data: profileRow }, { data: mealRows }, { data: revenueRows }] = await Promise.all([
        supabase.from('user_profiles').select('delivery_enabled, delivery_fee, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, bio, business_hours, closed_days, availability_override').eq('id', user.id).single(),
        supabase.from('meals').select('id, title, description, price, category, available, image_url, modifier_groups').eq('chef_id', user.id).order('created_at', { ascending: false }),
        supabase.from('order_revenue').select('total, chef_earnings, delivery_fee, status').eq('chef_id', user.id),
      ]);

      setStripeState(profileRow || null);
      setMeals(mealRows || []);

      const summaryRows = (revenueRows as any[] | null) ?? [];
      const completed = summaryRows.filter((row) => row.status === 'delivered');
      const pending = summaryRows.filter((row) => row.status !== 'delivered' && row.status !== 'cancelled');
      setEarningsSummary({
        gross: completed.reduce((sum, row) => sum + Number(row.total || 0), 0),
        net: completed.reduce((sum, row) => sum + Number(row.chef_earnings || 0), 0),
        deliveryFees: completed.reduce((sum, row) => sum + Number(row.delivery_fee || 0), 0),
        completedOrders: completed.length,
        pendingPayout: pending.reduce((sum, row) => sum + Number(row.chef_earnings || 0), 0),
      });

      const structuredHours = typeof profileRow?.business_hours === 'string' ? profileRow.business_hours : null;
      const hoursFromBio = typeof profileRow?.bio === 'string' ? profileRow.bio : profile?.bio || '';
      setBusinessHoursRows(defaultBusinessHours(structuredHours || hoursFromBio, profileRow?.closed_days || []));
      setAvailabilityOverride((profileRow?.availability_override as 'open' | 'closed' | null) || null);
    } finally {
      setLoading(false);
    }
  };

  const syncStripeStatus = async () => {
    try {
      setStripeSyncing(true);
      const response = await fetch('/api/stripe/status', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to check payout status.');
      setStripeState((prev: any) => ({
        ...prev,
        stripe_account_id: payload?.stripe_account_id ?? prev?.stripe_account_id ?? null,
        stripe_onboarding_complete: !!payload?.onboarding_complete,
        stripe_charges_enabled: !!payload?.charges_enabled,
        stripe_payouts_enabled: !!payload?.payouts_enabled,
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setStripeSyncing(false);
    }
  };

  const handleStripeConnect = async () => {
    try {
      setStripeLoading(true);
      const response = await fetch('/api/stripe/connect', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload?.url) throw new Error(payload?.error || 'Unable to start Stripe setup.');
      window.location.href = payload.url;
    } catch (error: any) {
      toast.error(error?.message || 'Unable to connect Stripe right now.');
      setStripeLoading(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    const { error } = await supabase.from('meals').delete().eq('id', mealId);
    if (!error) {
      setMeals((prev) => prev.filter((meal) => meal.id !== mealId));
      toast.success('Meal removed');
    }
  };

  const handleMealImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMealImageFile(file);
    setMealImagePreview(URL.createObjectURL(file));
  };

  const resetMealForm = () => {
    setMealTitle('');
    setMealDescription('');
    setMealPrice('');
    setMealCategory('Dinner');
    setMealAvailable(true);
    setMealImageFile(null);
    setMealImagePreview(null);
    setModifierGroups([]);
    setShowMealForm(false);
  };

  const handleCreateMeal = async () => {
    if (!user) return;
    if (!mealTitle.trim()) return toast.error('Meal title is required');
    if (!mealPrice.trim()) return toast.error('Meal price is required');

    setSavingMeal(true);
    try {
      let imageUrl: string | null = null;
      if (mealImageFile) {
        const ext = mealImageFile.name.split('.').pop();
        const path = `${user.id}/meal-${Date.now()}.${ext}`;
        const upload = await supabase.storage.from('meals').upload(path, mealImageFile, { upsert: false });
        if (upload.error) throw upload.error;
        imageUrl = supabase.storage.from('meals').getPublicUrl(path).data.publicUrl;
      }

      let insertResult = await supabase
        .from('meals')
        .insert({
          chef_id: user.id,
          title: mealTitle.trim(),
          description: mealDescription.trim() || null,
          price: Number(mealPrice),
          category: mealCategory,
          available: mealAvailable,
          image_url: imageUrl,
          modifier_groups: modifierGroups,
        })
        .select('id, title, description, price, category, available, image_url, modifier_groups')
        .single();

      if (insertResult.error && String(insertResult.error.message || '').includes('modifier_groups')) {
        insertResult = await supabase
          .from('meals')
          .insert({ chef_id: user.id, title: mealTitle.trim(), description: mealDescription.trim() || null, price: Number(mealPrice), category: mealCategory, available: mealAvailable, image_url: imageUrl })
          .select('id, title, description, price, category, available, image_url')
          .single();
      }

      const { data, error } = insertResult;
      if (error) throw error;
      setMeals((prev) => [data as Meal, ...prev]);
      toast.success('Meal added to your menu');
      resetMealForm();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add meal');
    } finally {
      setSavingMeal(false);
    }
  };

  const saveBusinessHours = async () => {
    if (!user) return;
    setSavingBusinessHours(true);
    try {
      const businessHours = formatBusinessHours(businessHoursRows);
      const closedDays = businessHoursRows.filter((row) => !row.open).map((row) => row.day);
      const { error } = await supabase.from('user_profiles').update({ business_hours: businessHours, closed_days: closedDays, availability_override: availabilityOverride, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setStripeState((prev: any) => ({ ...prev, business_hours: businessHours, closed_days: closedDays, availability_override: availabilityOverride }));
      toast.success('Business hours updated');
    } catch (error: any) {
      toast.error(error?.message || 'Could not save business hours');
    } finally {
      setSavingBusinessHours(false);
    }
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
    business_hours: stripeState?.business_hours || (profile as any)?.business_hours || null,
  });

  const missingItems = readiness.items.filter((item) => !item.complete);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-700 text-foreground leading-tight">Chef Dashboard</h1>
            <p className="text-sm text-muted-foreground">Track orders, payouts, menu, and business hours from one place.</p>
          </div>
          <Link href="/edit-profile" className="flex items-center gap-1.5 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full"><Settings className="w-4 h-4" />Edit Vendor Profile</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <button onClick={() => setActiveSection('overview')} className={`rounded-2xl border p-3 text-left ${activeSection === 'overview' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}><p className="text-xs text-muted-foreground">Overview</p><p className="text-sm font-700 text-foreground mt-1">Chef home</p></button>
          <button onClick={() => setActiveSection('menu')} className={`rounded-2xl border p-3 text-left ${activeSection === 'menu' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}><p className="text-xs text-muted-foreground">Menu</p><p className="text-sm font-700 text-foreground mt-1">Manage menu</p></button>
          <button onClick={() => setActiveSection('orders')} className={`rounded-2xl border p-3 text-left ${activeSection === 'orders' ? 'border-amber-500 bg-amber-500/5' : 'border-border bg-card'}`}><p className="text-xs text-muted-foreground">Orders</p><p className="text-sm font-700 text-foreground mt-1">Incoming orders</p></button>
          <button onClick={() => { setActiveSection('payouts'); syncStripeStatus(); }} className={`rounded-2xl border p-3 text-left ${activeSection === 'payouts' ? 'border-green-500 bg-green-500/5' : 'border-border bg-card'}`}><p className="text-xs text-muted-foreground">Payouts</p><p className="text-sm font-700 text-foreground mt-1">Earnings</p></button>
          <button onClick={() => setActiveSection('hours')} className={`rounded-2xl border p-3 text-left ${activeSection === 'hours' ? 'border-blue-500 bg-blue-500/5' : 'border-border bg-card'}`}><p className="text-xs text-muted-foreground">Hours</p><p className="text-sm font-700 text-foreground mt-1">Business hours</p></button>
        </div>

        {activeSection === 'overview' && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4 mb-3"><div><p className="text-sm font-700 text-foreground">Chef readiness</p><p className="text-xs text-muted-foreground">{readiness.completedCount} of {readiness.totalCount} setup areas complete</p></div><div className="text-right"><p className="text-2xl font-700 text-foreground">{readiness.percent}%</p><p className="text-xs text-muted-foreground capitalize">{readiness.status.replace('-', ' ')}</p></div></div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-4"><div className="h-full bg-primary rounded-full" style={{ width: `${readiness.percent}%` }} /></div>
              <div className="space-y-3">{readiness.items.map((item) => <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"><div className="flex items-center gap-3">{item.complete ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}<span className="text-sm text-foreground">{item.label}</span></div>{item.key === 'payouts' && stripeSyncing ? <span className="text-xs font-700 text-amber-600">Checking payout setup...</span> : item.key === 'payouts' && item.complete ? <span className="text-xs font-700 text-green-600">Payouts connected</span> : !item.complete && <button onClick={() => item.key === 'menu' ? setShowMealForm(true) : item.key === 'payouts' ? handleStripeConnect() : router.push(item.ctaHref)} className="text-xs font-700 text-primary hover:underline">{item.ctaLabel}</button>}</div>)}</div>
            </div>
        )}

        {activeSection === 'menu' && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div><p className="text-sm font-700 text-foreground">Menu manager</p><p className="text-xs text-muted-foreground">Add and manage the dishes customers will see.</p></div>
              <button onClick={() => setShowMealForm((prev) => !prev)} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full"><Plus className="w-4 h-4" />{showMealForm ? 'Close form' : 'Add meal'}</button>
            </div>

            {showMealForm && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={mealTitle} onChange={(e) => setMealTitle(e.target.value)} placeholder="Meal title" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" />
                    <input value={mealPrice} onChange={(e) => setMealPrice(e.target.value)} placeholder="Price" inputMode="decimal" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" />
                  </div>
                  <textarea value={mealDescription} onChange={(e) => setMealDescription(e.target.value)} placeholder="Describe the dish" rows={3} className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background resize-none" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select value={mealCategory} onChange={(e) => setMealCategory(e.target.value)} className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background">{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                    <label className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background"><input type="checkbox" checked={mealAvailable} onChange={(e) => setMealAvailable(e.target.checked)} />Available for orders</label>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-700 text-foreground">Sides / drinks / extras</p><button onClick={() => setModifierGroups((prev) => [...prev, { id: makeId(), name: '', required: false, multiSelect: false, options: [{ id: makeId(), label: '', priceAdd: 0 }] }])} className="text-xs font-700 text-primary">+ Add option group</button></div>{modifierGroups.length === 0 ? <p className="text-xs text-muted-foreground">Add modifier groups for sides, drinks, and extras.</p> : modifierGroups.map((group, groupIndex) => <div key={group.id} className="rounded-xl border border-border/70 p-3 space-y-3"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input value={group.name} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, name: e.target.value } : item))} placeholder="Group name (e.g. Sides)" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" /><div className="flex gap-3"><label className="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" checked={group.required} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, required: e.target.checked } : item))} />Required</label><label className="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" checked={group.multiSelect} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, multiSelect: e.target.checked } : item))} />Multi-select</label></div></div><div className="space-y-2">{group.options.map((option, optionIndex) => <div key={option.id} className="grid grid-cols-[1fr_110px_auto] gap-2"><input value={option.label} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, options: item.options.map((opt, optIdx) => optIdx === optionIndex ? { ...opt, label: e.target.value } : opt) } : item))} placeholder="Option name" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" /><input value={option.priceAdd} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, options: item.options.map((opt, optIdx) => optIdx === optionIndex ? { ...opt, priceAdd: Number(e.target.value || 0) } : opt) } : item))} placeholder="Price add" inputMode="decimal" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" /><button onClick={() => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, options: item.options.filter((_, optIdx) => optIdx !== optionIndex) } : item).filter((item) => item.options.length > 0))} className="text-xs font-700 text-red-500">Remove</button></div>)}</div><div className="flex items-center justify-between"><button onClick={() => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, options: [...item.options, { id: makeId(), label: '', priceAdd: 0 }] } : item))} className="text-xs font-700 text-primary">+ Add option</button><button onClick={() => setModifierGroups((prev) => prev.filter((_, idx) => idx !== groupIndex))} className="text-xs font-700 text-red-500">Delete group</button></div></div>)}</div>
                  <div className="rounded-xl border border-dashed border-border p-4 bg-background">{!mealImagePreview ? <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 text-sm font-600 text-primary"><ImagePlus className="w-4 h-4" />Upload meal photo</button> : <div className="relative w-32 h-32 rounded-xl overflow-hidden"><img src={mealImagePreview} alt="Meal preview" className="w-full h-full object-cover" /><button onClick={() => { setMealImageFile(null); setMealImagePreview(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"><X className="w-4 h-4 text-white" /></button></div>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handleMealImageSelect} className="hidden" /></div>
                  <div className="flex gap-3"><button onClick={handleCreateMeal} disabled={savingMeal} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full">{savingMeal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{savingMeal ? 'Saving meal...' : 'Save meal'}</button><button onClick={resetMealForm} className="inline-flex items-center gap-2 border border-border text-sm font-600 text-foreground px-4 py-2 rounded-full">Cancel</button></div>
                </div>
              )}

              {meals.length === 0 ? <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No menu items yet. Use the Add meal button above to create your first dish.</div> : <div className="space-y-3">{meals.map((meal) => <div key={meal.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"><div><p className="text-sm font-700 text-foreground">{meal.title}</p><p className="text-xs text-muted-foreground">${Number(meal.price).toFixed(2)} • {meal.category}</p></div><button onClick={() => handleDeleteMeal(meal.id)} className="inline-flex items-center gap-1 text-xs font-700 text-red-500"><Trash2 className="w-4 h-4" />Remove</button></div>)}</div>}
            </div>
        )}

        {activeSection === 'orders' && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border/60"><div className="flex items-center gap-3"><Package className="w-5 h-5 text-amber-600" /><div><p className="text-sm font-700 text-foreground">Orders received</p><p className="text-xs text-muted-foreground">Incoming customer orders and fulfillment status.</p></div></div></div>
            <OrdersTab />
          </div>
        )}

        {activeSection === 'payouts' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Net earnings</p><p className="text-2xl font-700 text-foreground mt-1">${earningsSummary.net.toFixed(2)}</p><p className="text-xs text-muted-foreground mt-1">Completed orders: {earningsSummary.completedOrders}</p></div>
              <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Pending payout</p><p className="text-2xl font-700 text-foreground mt-1">${earningsSummary.pendingPayout.toFixed(2)}</p><p className="text-xs text-muted-foreground mt-1">Estimated payout date: {nextPayoutLabel()}</p></div>
              <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Delivery fees earned</p><p className="text-2xl font-700 text-foreground mt-1">${earningsSummary.deliveryFees.toFixed(2)}</p><p className="text-xs text-muted-foreground mt-1">Gross order volume: ${earningsSummary.gross.toFixed(2)}</p></div>
            </div>

            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
              <div className="flex items-center gap-3 mb-2"><Wallet className="w-5 h-5 text-green-600" /><p className="text-sm font-700 text-foreground">Payout setup</p></div>
              <p className="text-xs text-muted-foreground mb-3">{stripeSyncing ? 'Checking payout setup...' : stripeState?.stripe_onboarding_complete ? 'Payouts connected. Your Stripe onboarding is complete.' : stripeState?.stripe_account_id ? 'Your Stripe account exists, but onboarding is not complete yet.' : 'Connect Stripe so you can receive payouts from customer orders.'}</p>
              <div className="flex flex-wrap gap-3"><button onClick={handleStripeConnect} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full"><Wallet className="w-4 h-4" />{stripeState?.stripe_onboarding_complete ? 'Manage Stripe' : stripeLoading ? 'Connecting...' : stripeState?.stripe_account_id ? 'Resume payout setup' : 'Connect Stripe'}</button><button onClick={syncStripeStatus} className="inline-flex items-center gap-2 border border-border text-sm font-600 text-foreground px-4 py-2 rounded-full">{stripeSyncing ? 'Checking...' : 'Refresh status'}</button></div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3"><DollarSign className="w-5 h-5 text-green-600" /><p className="text-sm font-700 text-foreground">Earnings details</p></div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Net earnings are calculated from delivered orders using stored `chef_earnings` values.</p>
                <p>• Pending payout reflects orders not yet delivered or paid out.</p>
                <p>• Stripe payout status must be fully connected for payouts to settle.</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'hours' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3"><Clock3 className="w-5 h-5 text-blue-600" /><div><p className="text-sm font-700 text-foreground">Business hours</p><p className="text-xs text-muted-foreground">Set the days and times customers should expect you to be open.</p></div></div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button onClick={() => setAvailabilityOverride(null)} className={`px-3 py-2 rounded-full text-xs font-700 border transition-all ${availabilityOverride === null ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>Auto</button>
                <button onClick={() => setAvailabilityOverride('open')} className={`px-3 py-2 rounded-full text-xs font-700 border transition-all ${availabilityOverride === 'open' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-border text-muted-foreground'}`}>Open now</button>
                <button onClick={() => setAvailabilityOverride('closed')} className={`px-3 py-2 rounded-full text-xs font-700 border transition-all ${availabilityOverride === 'closed' ? 'border-red-500 bg-red-500/10 text-red-600' : 'border-border text-muted-foreground'}`}>Closed now</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 font-600">Day</th>
                      <th className="py-2 pr-3 font-600">Open</th>
                      <th className="py-2 pr-3 font-600">Open time</th>
                      <th className="py-2 font-600">Close time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessHoursRows.map((row, idx) => (
                      <tr key={row.day} className="border-b border-border/40 last:border-0">
                        <td className="py-3 pr-3 font-600 text-foreground">{row.day}</td>
                        <td className="py-3 pr-3"><input type="checkbox" checked={row.open} onChange={(e) => setBusinessHoursRows((prev) => prev.map((item, itemIdx) => itemIdx === idx ? { ...item, open: e.target.checked } : item))} /></td>
                        <td className="py-3 pr-3"><input type="time" value={row.openTime} disabled={!row.open} onChange={(e) => setBusinessHoursRows((prev) => prev.map((item, itemIdx) => itemIdx === idx ? { ...item, openTime: e.target.value } : item))} className="rounded-xl border border-border px-3 py-2 bg-background disabled:opacity-40" /></td>
                        <td className="py-3"><input type="time" value={row.closeTime} disabled={!row.open} onChange={(e) => setBusinessHoursRows((prev) => prev.map((item, itemIdx) => itemIdx === idx ? { ...item, closeTime: e.target.value } : item))} className="rounded-xl border border-border px-3 py-2 bg-background disabled:opacity-40" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3 mt-4"><div className="text-xs text-muted-foreground flex items-center gap-2"><CalendarDays className="w-4 h-4" />Display summary: {formatBusinessHours(businessHoursRows)}</div><button onClick={saveBusinessHours} disabled={savingBusinessHours} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full">{savingBusinessHours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock3 className="w-4 h-4" />}Save hours</button></div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
