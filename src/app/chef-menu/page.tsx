'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '../../lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, CheckCircle2, Circle, Settings, Wallet, Package, Plus, Trash2, Loader2, ImagePlus, X, Clock3, DollarSign, CalendarDays, ShieldCheck, Upload, FileText, Eye, MapPin, ChevronDown } from 'lucide-react';
import { getChefReadiness } from '@/lib/chef/readiness';
import { toast } from 'sonner';
import OrdersTab from '@/app/vendor-profile/components/OrdersTab';
import TrustBadgeRow from '@/components/trust/TrustBadgeRow';
import TrustMeter from '@/components/trust/TrustMeter';
import { CREDENTIAL_TYPE_OPTIONS, ALLOWED_CREDENTIAL_FILE_TYPES, MAX_CREDENTIAL_FILE_SIZE_BYTES } from '@/lib/trust/config';
import { calculateTrustScore } from '@/lib/trust/score';
import type { CredentialStatus, CredentialType, TrustCredentialShape } from '@/lib/trust/types';

type ModifierOption = { id: string; label: string; priceAdd: number };
type ModifierGroup = { id: string; name: string; required: boolean; multiSelect: boolean; minSelect?: number; maxSelect?: number; options: ModifierOption[] };
type Meal = { id: string; title: string; description: string | null; price: number; category: string; available: boolean; image_url: string | null; modifier_groups?: ModifierGroup[] };
type BusinessHourRow = { day: string; open: boolean; openTime: string; closeTime: string };
type ChefCredentialRow = {
  id: string;
  chef_id: string;
  credential_type: CredentialType;
  title: string;
  file_url: string;
  file_name: string;
  file_path: string;
  file_bucket: string;
  status: CredentialStatus;
  issued_by: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  review_notes: string | null;
  created_at: string;
};

async function openCredentialPreview(supabase: ReturnType<typeof createClient>, credential: Pick<ChefCredentialRow, 'file_bucket' | 'file_path'>) {
  const signed = await supabase.storage.from(credential.file_bucket).createSignedUrl(credential.file_path, 60 * 10);
  if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error('Could not open credential file.');
  window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer');
}

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

function nextPayoutLabel(schedule: 'daily' | 'weekly' = 'daily') {
  const now = new Date();

  if (schedule === 'daily') {
    const payout = new Date(now);
    payout.setDate(now.getDate() + 1);
    return payout.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const payout = new Date(now);
  payout.setDate(now.getDate() + daysUntilFriday);
  return payout.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatPayoutCooldownLabel(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChefMenuPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stripeState, setStripeState] = useState<any>(null);
  const [payoutSchedule, setPayoutSchedule] = useState<'daily' | 'weekly'>('daily');
  const [savingPayoutSchedule, setSavingPayoutSchedule] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState('10');
  const [chefHideExactLocation, setChefHideExactLocation] = useState(false);
  const [savingDeliverySettings, setSavingDeliverySettings] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeSyncing, setStripeSyncing] = useState(false);
  const [stripeError, setStripeError] = useState('');
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
  const [credentials, setCredentials] = useState<ChefCredentialRow[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [uploadingCredential, setUploadingCredential] = useState(false);
  const [credentialType, setCredentialType] = useState<CredentialType>('food_safety_certificate');
  const [credentialTitle, setCredentialTitle] = useState('');
  const [credentialIssuedBy, setCredentialIssuedBy] = useState('');
  const [credentialIssueDate, setCredentialIssueDate] = useState('');
  const [credentialExpirationDate, setCredentialExpirationDate] = useState('');
  const [credentialFile, setCredentialFile] = useState<File | null>(null);
  const [credentialError, setCredentialError] = useState('');

  const isChef = profile?.role === 'chef';
  const vendorReady = !!profile?.vendor_onboarding_complete;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const section = params.get('section') || 'overview';
      setActiveSection(section === 'menu-manager' ? 'menu' : section);
      if (section === 'menu-manager') setShowMealForm(true);
      if (section === 'payouts') syncStripeStatus();
      if (section === 'trust') loadCredentials();
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
      loadCredentials();
    }
  }, [authLoading, user, profile, router]);

  const loadChefData = async () => {
    if (!user) return;
    try {
      const profileSelect = 'delivery_enabled, delivery_fee, service_radius_miles, chef_hide_exact_location, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, payout_schedule, bio, business_hours, closed_days, availability_override, email_verified, phone_verified, identity_verified, is_verified, is_certified, is_licensed, is_top_rated, is_pro_chef, trust_score, trust_label, rating_avg, rating_count, completed_orders, complaints_count, approved_credentials_count, approved_certificate_count, approved_license_count';
      let profileResult = await supabase.from('user_profiles').select(profileSelect).eq('id', user.id).single();

      if (profileResult.error && String(profileResult.error.message || '').includes('stripe_')) {
        profileResult = await supabase
          .from('user_profiles')
          .select('delivery_enabled, delivery_fee, service_radius_miles, chef_hide_exact_location, payout_schedule, bio, business_hours, closed_days, availability_override, email_verified, phone_verified, identity_verified, is_verified, is_certified, is_licensed, is_top_rated, is_pro_chef, trust_score, trust_label, rating_avg, rating_count, completed_orders, complaints_count, approved_credentials_count, approved_certificate_count, approved_license_count')
          .eq('id', user.id)
          .single();
      }

      const [{ data: mealRows }, { data: revenueRows }] = await Promise.all([
        supabase.from('meals').select('id, title, description, price, category, available, image_url, modifier_groups').eq('chef_id', user.id).order('created_at', { ascending: false }),
        supabase.from('order_revenue').select('total, chef_earnings, delivery_fee, status').eq('chef_id', user.id),
      ]);

      const profileRow = (profileResult.data || {}) as any;

      setStripeState({
        stripe_account_id: profileRow?.stripe_account_id ?? null,
        stripe_onboarding_complete: profileRow?.stripe_onboarding_complete ?? false,
        stripe_charges_enabled: profileRow?.stripe_charges_enabled ?? false,
        stripe_payouts_enabled: profileRow?.stripe_payouts_enabled ?? false,
        payout_schedule: profileRow?.payout_schedule === 'weekly' ? 'weekly' : 'daily',
        ...profileRow,
      });
      setPayoutSchedule(profileRow?.payout_schedule === 'weekly' ? 'weekly' : 'daily');
      setDeliveryEnabled(profileRow?.delivery_enabled === true);
      setDeliveryFee(String(Number(profileRow?.delivery_fee ?? 0).toFixed(2)));
      setServiceRadiusMiles(String(Number(profileRow?.service_radius_miles ?? 10)));
      setChefHideExactLocation(profileRow?.chef_hide_exact_location === true);
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

  const loadCredentials = async () => {
    if (!user) return;
    setLoadingCredentials(true);
    try {
      const { data, error } = await supabase
        .from('chef_credentials')
        .select('id, chef_id, credential_type, title, file_url, file_name, file_path, file_bucket, status, issued_by, issue_date, expiration_date, review_notes, created_at')
        .eq('chef_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials((data || []) as ChefCredentialRow[]);
    } catch {
      setCredentials([]);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const stripeConnected = Boolean(stripeState?.stripe_account_id);
  const stripeReadyForPayouts = Boolean(stripeState?.stripe_onboarding_complete && stripeState?.stripe_charges_enabled && stripeState?.stripe_payouts_enabled);
  const payoutScheduleLockedUntil = typeof stripeState?.payout_schedule_change_locked_until === 'string'
    ? stripeState.payout_schedule_change_locked_until
    : null;
  const payoutScheduleLocked = Boolean(
    payoutScheduleLockedUntil && new Date(payoutScheduleLockedUntil).getTime() > Date.now()
  );
  const payoutScheduleLockedLabel = formatPayoutCooldownLabel(payoutScheduleLockedUntil);

  const syncStripeStatus = async () => {
    try {
      setStripeSyncing(true);
      setStripeError('');
      const response = await fetch('/api/stripe/status', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to check payout status.');
      if (payload?.error) {
        setStripeError(payload.error);
      }
      setStripeState((prev: any) => ({
        ...prev,
        stripe_account_id: payload?.stripe_account_id ?? prev?.stripe_account_id ?? null,
        stripe_onboarding_complete: !!payload?.onboarding_complete,
        stripe_charges_enabled: !!payload?.charges_enabled,
        stripe_payouts_enabled: !!payload?.payouts_enabled,
        stripe_connected: !!payload?.connected,
        stripe_details_submitted: !!payload?.details_submitted,
        payout_schedule: payload?.payout_schedule === 'weekly' ? 'weekly' : 'daily',
        payout_schedule_updated_at: payload?.payout_schedule_updated_at ?? prev?.payout_schedule_updated_at ?? null,
        payout_schedule_change_locked_until: payload?.payout_schedule_change_locked_until ?? prev?.payout_schedule_change_locked_until ?? null,
      }));
      setPayoutSchedule(payload?.payout_schedule === 'weekly' ? 'weekly' : 'daily');
    } catch (error: any) {
      console.error(error);
      setStripeError(error?.message || 'Unable to check payout status.');
    } finally {
      setStripeSyncing(false);
    }
  };

  const savePayoutSchedule = async (nextSchedule: 'daily' | 'weekly') => {
    if (!user) return;

    try {
      setSavingPayoutSchedule(true);
      setStripeError('');

      const lockedUntil = typeof stripeState?.payout_schedule_change_locked_until === 'string'
        ? new Date(stripeState.payout_schedule_change_locked_until)
        : null;

      if (lockedUntil && lockedUntil.getTime() > Date.now() && nextSchedule !== payoutSchedule) {
        throw new Error(`You can change your payout schedule again on ${lockedUntil.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`);
      }

      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('user_profiles')
        .update({ payout_schedule: nextSchedule, payout_schedule_updated_at: nowIso, updated_at: nowIso })
        .eq('id', user.id);

      if (error) throw error;

      setPayoutSchedule(nextSchedule);
      const lockedUntilIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      setStripeState((prev: any) => ({
        ...prev,
        payout_schedule: nextSchedule,
        payout_schedule_updated_at: nowIso,
        payout_schedule_change_locked_until: lockedUntilIso,
      }));

      if (stripeConnected) {
        const response = await fetch('/api/stripe/connect', { method: 'POST' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to sync payout schedule with Stripe.');
      }

      toast.success(`Payout schedule set to ${nextSchedule}.`);
    } catch (error: any) {
      setStripeError(error?.message || 'Unable to update payout schedule.');
      toast.error(error?.message || 'Unable to update payout schedule.');
    } finally {
      setSavingPayoutSchedule(false);
    }
  };

  const saveDeliverySettings = async () => {
    if (!user) return;

    const nextDeliveryFee = Number(deliveryFee || 0);
    const nextServiceRadius = Math.max(1, Number(serviceRadiusMiles || 10));

    if (Number.isNaN(nextDeliveryFee) || nextDeliveryFee < 0) {
      toast.error('Enter a valid delivery fee.');
      return;
    }

    if (Number.isNaN(nextServiceRadius) || nextServiceRadius < 1) {
      toast.error('Enter a valid service radius.');
      return;
    }

    try {
      setSavingDeliverySettings(true);
      const { error } = await supabase
        .from('user_profiles')
        .update({
          delivery_enabled: deliveryEnabled,
          delivery_fee: Number(nextDeliveryFee.toFixed(2)),
          service_radius_miles: Math.round(nextServiceRadius),
          chef_hide_exact_location: chefHideExactLocation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setStripeState((prev: any) => ({
        ...prev,
        delivery_enabled: deliveryEnabled,
        delivery_fee: Number(nextDeliveryFee.toFixed(2)),
        service_radius_miles: Math.round(nextServiceRadius),
        chef_hide_exact_location: chefHideExactLocation,
      }));

      toast.success('Delivery and location privacy settings saved.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to save delivery settings.');
    } finally {
      setSavingDeliverySettings(false);
    }
  };

  const handleStripeConnect = async () => {
    try {
      setStripeLoading(true);
      setStripeError('');
      const response = await fetch('/api/stripe/connect', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload?.url) throw new Error(payload?.error || 'Unable to start Stripe setup.');
      window.location.assign(payload.url);
    } catch (error: any) {
      const message = error?.message || 'Unable to connect Stripe right now.';
      setStripeError(message);
      toast.error(message);
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

  const handleCredentialFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setCredentialError('');

    if (!file) {
      setCredentialFile(null);
      return;
    }

    if (!ALLOWED_CREDENTIAL_FILE_TYPES.includes(file.type)) {
      setCredentialError('Only PDF, JPG, PNG, and WEBP files are allowed.');
      setCredentialFile(null);
      return;
    }

    if (file.size > MAX_CREDENTIAL_FILE_SIZE_BYTES) {
      setCredentialError('File must be 10 MB or smaller.');
      setCredentialFile(null);
      return;
    }

    setCredentialFile(file);
  };

  const handleCredentialUpload = async () => {
    if (!user) return;
    if (!credentialTitle.trim()) return setCredentialError('Credential title is required.');
    if (!credentialFile) return setCredentialError('Upload a credential file.');

    setUploadingCredential(true);
    setCredentialError('');

    try {
      const config = CREDENTIAL_TYPE_OPTIONS.find((item) => item.value === credentialType) || CREDENTIAL_TYPE_OPTIONS[0];
      const extension = credentialFile.name.split('.').pop() || 'pdf';
      const filePath = `${user.id}/${Date.now()}-${credentialType}.${extension}`;
      const uploadResult = await supabase.storage.from(config.bucket).upload(filePath, credentialFile, { upsert: false });
      if (uploadResult.error) throw uploadResult.error;

      const insertResult = await supabase
        .from('chef_credentials')
        .insert({
          chef_id: user.id,
          credential_type: credentialType,
          title: credentialTitle.trim(),
          file_url: '',
          file_name: credentialFile.name,
          file_path: filePath,
          file_bucket: config.bucket,
          status: 'pending',
          issued_by: credentialIssuedBy.trim() || null,
          issue_date: credentialIssueDate || null,
          expiration_date: credentialExpirationDate || null,
        })
        .select('id, chef_id, credential_type, title, file_url, file_name, file_path, file_bucket, status, issued_by, issue_date, expiration_date, review_notes, created_at')
        .single();

      if (insertResult.error) throw insertResult.error;

      setCredentials((prev) => [insertResult.data as ChefCredentialRow, ...prev]);
      setCredentialTitle('');
      setCredentialIssuedBy('');
      setCredentialIssueDate('');
      setCredentialExpirationDate('');
      setCredentialFile(null);
      toast.success('Credential uploaded for review');
      refreshProfile().catch(() => undefined);
    } catch (error: any) {
      setCredentialError(error?.message || 'Could not upload credential.');
    } finally {
      setUploadingCredential(false);
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

  const trustScore = calculateTrustScore(
    {
      avatar_url: profile?.avatar_url,
      bio: profile?.bio,
      email_verified: (stripeState as any)?.email_verified ?? profile?.email_verified,
      phone_verified: (stripeState as any)?.phone_verified ?? profile?.phone_verified,
      identity_verified: (stripeState as any)?.identity_verified ?? profile?.identity_verified,
      completed_orders: (stripeState as any)?.completed_orders ?? profile?.completed_orders ?? earningsSummary.completedOrders,
      complaints_count: (stripeState as any)?.complaints_count ?? profile?.complaints_count,
      rating_avg: (stripeState as any)?.rating_avg ?? profile?.rating_avg,
      rating_count: (stripeState as any)?.rating_count ?? profile?.rating_count,
    },
    credentials as TrustCredentialShape[],
    meals.filter((meal) => !!meal.image_url).length,
  );

  const missingItems = readiness.items.filter((item) => !item.complete);

  const toggleSection = (section: string, onOpen?: () => void) => {
    setActiveSection((prev) => {
      const next = prev === section ? '' : section;
      if (next === section) onOpen?.();
      return next;
    });
  };

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

        <div className="space-y-3">
          <div className={`rounded-2xl border overflow-hidden ${activeSection === 'overview' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
            <button onClick={() => toggleSection('overview')} className="w-full p-3 text-left flex items-center justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">Overview</p><p className="text-sm font-700 text-foreground mt-1">Chef home</p></div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activeSection === 'overview' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'overview' && (
              <div className="border-t border-border/60 p-3">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-4 mb-3"><div><p className="text-sm font-700 text-foreground">Chef readiness</p><p className="text-xs text-muted-foreground">{readiness.completedCount} of {readiness.totalCount} setup areas complete</p></div><div className="text-right"><p className="text-2xl font-700 text-foreground">{readiness.percent}%</p><p className="text-xs text-muted-foreground capitalize">{readiness.status.replace('-', ' ')}</p></div></div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-4"><div className="h-full bg-primary rounded-full" style={{ width: `${readiness.percent}%` }} /></div>
                  <div className="space-y-3">{readiness.items.map((item) => <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"><div className="flex items-center gap-3">{item.complete ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}<span className="text-sm text-foreground">{item.label}</span></div>{item.key === 'payouts' && stripeSyncing ? <span className="text-xs font-700 text-amber-600">Checking payout setup...</span> : item.key === 'payouts' && stripeReadyForPayouts ? <span className="text-xs font-700 text-green-600">Payouts connected</span> : item.key === 'payouts' && stripeConnected ? <span className="text-xs font-700 text-sky-600">Stripe connected</span> : !item.complete && <button onClick={() => item.key === 'menu' ? toggleSection('menu') : item.key === 'payouts' ? handleStripeConnect() : router.push(item.ctaHref)} className="text-xs font-700 text-primary hover:underline">{item.ctaLabel}</button>}</div>)}</div>
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-2xl border overflow-hidden ${activeSection === 'menu' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
            <button onClick={() => toggleSection('menu')} className="w-full p-3 text-left flex items-center justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">Menu</p><p className="text-sm font-700 text-foreground mt-1">Manage menu</p></div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activeSection === 'menu' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'menu' && (
              <div className="border-t border-border/60 p-3">
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
                        <div className="rounded-xl border border-border bg-background p-4 space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm font-700 text-foreground">Sides / drinks / extras</p><p className="text-xs text-muted-foreground mt-1">Create side-dish and add-on choices here. Each option can have its own extra price.</p></div><button onClick={() => setModifierGroups((prev) => [...prev, { id: makeId(), name: '', required: false, multiSelect: false, options: [{ id: makeId(), label: '', priceAdd: 0 }] }])} className="text-xs font-700 text-primary">+ Add option group</button></div>{modifierGroups.length === 0 ? <p className="text-xs text-muted-foreground">Add modifier groups for sides, drinks, and extras. Example: Fries +$3, Mac & Cheese +$4, Soda +$2.</p> : modifierGroups.map((group, groupIndex) => <div key={group.id} className="rounded-xl border border-border/70 p-3 space-y-3"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input value={group.name} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, name: e.target.value } : item))} placeholder="Group name (e.g. Choose a side)" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" /><div className="flex gap-3"><label className="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" checked={group.required} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, required: e.target.checked } : item))} />Required</label><label className="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" checked={group.multiSelect} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, multiSelect: e.target.checked } : item))} />Multi-select</label></div></div><div className="space-y-2">{group.options.map((option, optionIndex) => <div key={option.id} className="grid grid-cols-[1fr_140px_auto] gap-2"><input value={option.label} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, options: item.options.map((opt, optIdx) => optIdx === optionIndex ? { ...opt, label: e.target.value } : opt) } : item))} placeholder="Option name" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" /><input value={option.priceAdd} onChange={(e) => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, options: item.options.map((opt, optIdx) => optIdx === optionIndex ? { ...opt, priceAdd: Number(e.target.value || 0) } : opt) } : item))} placeholder="Extra price ($)" inputMode="decimal" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" /><button onClick={() => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, options: item.options.filter((_, optIdx) => optIdx !== optionIndex) } : item).filter((item) => item.options.length > 0))} className="text-xs font-700 text-red-500">Remove</button></div>)}</div><div className="flex items-center justify-between"><button onClick={() => setModifierGroups((prev) => prev.map((item, idx) => idx === groupIndex ? { ...item, options: [...item.options, { id: makeId(), label: '', priceAdd: 0 }] } : item))} className="text-xs font-700 text-primary">+ Add option</button><button onClick={() => setModifierGroups((prev) => prev.filter((_, idx) => idx !== groupIndex))} className="text-xs font-700 text-red-500">Delete group</button></div></div>)}</div>
                        <div className="rounded-xl border border-dashed border-border p-4 bg-background">{!mealImagePreview ? <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 text-sm font-600 text-primary"><ImagePlus className="w-4 h-4" />Upload meal photo</button> : <div className="relative w-32 h-32 rounded-xl overflow-hidden"><img src={mealImagePreview} alt="Meal preview" className="w-full h-full object-cover" /><button onClick={() => { setMealImageFile(null); setMealImagePreview(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"><X className="w-4 h-4 text-white" /></button></div>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handleMealImageSelect} className="hidden" /></div>
                        <div className="flex gap-3"><button onClick={handleCreateMeal} disabled={savingMeal} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full">{savingMeal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{savingMeal ? 'Saving meal...' : 'Save meal'}</button><button onClick={resetMealForm} className="inline-flex items-center gap-2 border border-border text-sm font-600 text-foreground px-4 py-2 rounded-full">Cancel</button></div>
                      </div>
                    )}

                    {meals.length === 0 ? <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No menu items yet. Use the Add meal button above to create your first dish.</div> : <div className="space-y-3">{meals.map((meal) => <div key={meal.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"><div><p className="text-sm font-700 text-foreground">{meal.title}</p><p className="text-xs text-muted-foreground">${Number(meal.price).toFixed(2)} • {meal.category}</p></div><button onClick={() => handleDeleteMeal(meal.id)} className="inline-flex items-center gap-1 text-xs font-700 text-red-500"><Trash2 className="w-4 h-4" />Remove</button></div>)}</div>}
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-2xl border overflow-hidden ${activeSection === 'orders' ? 'border-amber-500 bg-amber-500/5' : 'border-border bg-card'}`}>
            <button onClick={() => toggleSection('orders')} className="w-full p-3 text-left flex items-center justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">Orders</p><p className="text-sm font-700 text-foreground mt-1">Incoming orders</p></div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activeSection === 'orders' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'orders' && (
              <div className="border-t border-border/60 p-3">
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="p-5 border-b border-border/60"><div className="flex items-center gap-3"><Package className="w-5 h-5 text-amber-600" /><div><p className="text-sm font-700 text-foreground">Orders received</p><p className="text-xs text-muted-foreground">Incoming customer orders and fulfillment status.</p></div></div></div>
                  <OrdersTab />
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-2xl border overflow-hidden ${activeSection === 'payouts' ? 'border-green-500 bg-green-500/5' : 'border-border bg-card'}`}>
            <button onClick={() => toggleSection('payouts', syncStripeStatus)} className="w-full p-3 text-left flex items-center justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">Payouts</p><p className="text-sm font-700 text-foreground mt-1">Earnings</p></div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activeSection === 'payouts' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'payouts' && (
              <div className="border-t border-border/60 p-3 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Net earnings</p><p className="text-2xl font-700 text-foreground mt-1">${earningsSummary.net.toFixed(2)}</p><p className="text-xs text-muted-foreground mt-1">Completed orders: {earningsSummary.completedOrders}</p></div>
                  <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Pending payout</p><p className="text-2xl font-700 text-foreground mt-1">${earningsSummary.pendingPayout.toFixed(2)}</p><p className="text-xs text-muted-foreground mt-1">Estimated payout date: {nextPayoutLabel(payoutSchedule)} · {payoutSchedule === 'weekly' ? 'Weekly payouts' : 'Daily payouts'}</p><p className="text-[11px] text-muted-foreground mt-2">Stripe sends payouts automatically on your selected schedule.</p></div>
                  <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Delivery fees earned</p><p className="text-2xl font-700 text-foreground mt-1">${earningsSummary.deliveryFees.toFixed(2)}</p><p className="text-xs text-muted-foreground mt-1">Gross order volume: ${earningsSummary.gross.toFixed(2)}</p></div>
                </div>

                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
                  <div className="flex items-center gap-3 mb-2"><Wallet className="w-5 h-5 text-green-600" /><p className="text-sm font-700 text-foreground">Payout setup</p></div>
                  <p className="text-xs text-muted-foreground mb-3">{stripeSyncing ? 'Checking payout setup...' : stripeReadyForPayouts ? 'Payouts connected. Your Stripe onboarding is complete.' : stripeConnected ? 'Your Stripe account is connected. Finish payout verification if Stripe still needs more details.' : 'Connect Stripe so you can receive payouts from customer orders.'}</p>
                  <p className="text-[11px] text-muted-foreground mb-3">Changes affect future Stripe payouts only. They do not change money already sent.</p>
                  {stripeError && <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600">{stripeError}</div>}
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => void savePayoutSchedule('daily')} disabled={savingPayoutSchedule || (payoutScheduleLocked && payoutSchedule !== 'daily')} className={`px-3 py-2 rounded-full text-xs font-700 border transition-all ${payoutSchedule === 'daily' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'} ${(savingPayoutSchedule || (payoutScheduleLocked && payoutSchedule !== 'daily')) ? 'opacity-60 cursor-not-allowed' : ''}`}>Daily payouts</button>
                      <button onClick={() => void savePayoutSchedule('weekly')} disabled={savingPayoutSchedule || (payoutScheduleLocked && payoutSchedule !== 'weekly')} className={`px-3 py-2 rounded-full text-xs font-700 border transition-all ${payoutSchedule === 'weekly' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'} ${(savingPayoutSchedule || (payoutScheduleLocked && payoutSchedule !== 'weekly')) ? 'opacity-60 cursor-not-allowed' : ''}`}>Weekly payouts</button>
                    </div>
                    {payoutScheduleLocked && payoutScheduleLockedLabel && (
                      <p className="text-[11px] text-muted-foreground">You can change your payout schedule again on {payoutScheduleLockedLabel}. Limit: once per week.</p>
                    )}
                    <div className="flex flex-wrap gap-3"><button onClick={handleStripeConnect} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full"><Wallet className="w-4 h-4" />{stripeReadyForPayouts ? 'Manage Stripe' : stripeLoading ? 'Connecting...' : stripeConnected ? 'Manage Stripe' : 'Connect Stripe'}</button><button onClick={syncStripeStatus} className="inline-flex items-center gap-2 border border-border text-sm font-600 text-foreground px-4 py-2 rounded-full">{stripeSyncing ? 'Checking...' : 'Refresh status'}</button></div>
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">Stripe onboarding opens in an external secure page and returns here when finished.</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-3 mb-3"><DollarSign className="w-5 h-5 text-green-600" /><p className="text-sm font-700 text-foreground">Earnings details</p></div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Net earnings are calculated from delivered orders using stored `chef_earnings` values after the 6% chef platform fee.</p>
                    <p>• Customers now pay a separate 6% service fee at checkout.</p>
                    <p>• Pending payout reflects orders not yet delivered or paid out.</p>
                    <p>• Stripe payout status must be fully connected for payouts to settle on your selected daily or weekly schedule.</p>
                    <p>• You can change your payout schedule once per week to avoid payout timing confusion.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-2xl border overflow-hidden ${activeSection === 'hours' ? 'border-blue-500 bg-blue-500/5' : 'border-border bg-card'}`}>
            <button onClick={() => toggleSection('hours')} className="w-full p-3 text-left flex items-center justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">Hours</p><p className="text-sm font-700 text-foreground mt-1">Business hours</p></div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activeSection === 'hours' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'hours' && (
              <div className="border-t border-border/60 p-3 space-y-4">
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

          <div className={`rounded-2xl border overflow-hidden ${activeSection === 'delivery' ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-card'}`}>
            <button onClick={() => toggleSection('delivery')} className="w-full p-3 text-left flex items-center justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">Delivery</p><p className="text-sm font-700 text-foreground mt-1">Area & privacy</p></div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activeSection === 'delivery' ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === 'delivery' && (
              <div className="border-t border-border/60 p-3 space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-3 mb-3"><MapPin className="w-5 h-5 text-emerald-600" /><div><p className="text-sm font-700 text-foreground">Delivery & pickup area</p><p className="text-xs text-muted-foreground">Control whether customers can order delivery and how your location appears publicly before payment.</p></div></div>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                      <div>
                        <p className="text-sm font-700 text-foreground">Enable delivery</p>
                        <p className="text-xs text-muted-foreground">Turn delivery on if you want customers in your radius to check out for delivery.</p>
                      </div>
                      <input type="checkbox" checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)} />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-700 text-muted-foreground uppercase tracking-wide mb-2">Flat delivery fee</label>
                        <input value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} inputMode="decimal" placeholder="5.99" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" />
                      </div>
                      <div>
                        <label className="block text-xs font-700 text-muted-foreground uppercase tracking-wide mb-2">Service radius (miles)</label>
                        <input value={serviceRadiusMiles} onChange={(e) => setServiceRadiusMiles(e.target.value)} inputMode="numeric" placeholder="10" className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground bg-background" />
                      </div>
                    </div>

                    <label className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3">
                      <div>
                        <p className="text-sm font-700 text-foreground">Hide my exact location</p>
                        <p className="text-xs text-muted-foreground">When enabled, customers only see your general area before payment. Your exact pickup address is revealed only after a paid order.</p>
                      </div>
                      <input type="checkbox" checked={chefHideExactLocation} onChange={(e) => setChefHideExactLocation(e.target.checked)} />
                    </label>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">Nearby still uses your real saved coordinates behind the scenes for distance and radius checks.</p>
                      <button onClick={saveDeliverySettings} disabled={savingDeliverySettings} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full">{savingDeliverySettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}Save delivery settings</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
