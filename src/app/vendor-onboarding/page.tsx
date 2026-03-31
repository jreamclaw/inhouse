'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import { ChefHat, MapPin, UtensilsCrossed, Camera, ArrowRight, ArrowLeft, Loader2, Check, Store, Clock } from 'lucide-react';

const FOOD_CATEGORIES = ['Soul Food', 'BBQ', 'Seafood', 'Wings', 'Pizza', 'Tacos / Mexican', 'Vegan / Plant-Based', 'Desserts', 'Breakfast', 'Italian', 'Asian Fusion', 'Caribbean', 'Burgers', 'Sandwiches', 'Healthy Bowls', 'Other'];
const STEPS = [{ id: 1, label: 'Business Info', icon: Store }, { id: 2, label: 'Food Category', icon: UtensilsCrossed }, { id: 3, label: 'Location', icon: MapPin }, { id: 4, label: 'Hours', icon: Clock }, { id: 5, label: 'Profile Image', icon: Camera }];

export default function VendorOnboardingPage() {
  const router = useRouter();
  const { user, loading, refreshProfile } = useAuth();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [openTime, setOpenTime] = useState('10:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [daysOpen, setDaysOpen] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const toggleCategory = (cat: string) => setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  const toggleDay = (day: string) => setDaysOpen((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; setAvatarUrl(URL.createObjectURL(file)); };
  const canProceed = () => step === 1 ? businessName.trim().length > 0 : step === 2 ? selectedCategories.length > 0 : step === 3 ? location.trim().length > 0 : step === 4 ? daysOpen.length > 0 : true;

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true); setError('');
    try {
      const hoursText = `${daysOpen.join(', ')} ? ${openTime} - ${closeTime}`;
      const categoryText = selectedCategories.join(', ');
      const fullBio = bio.trim() ? bio.trim() : `${businessName} - ${categoryText}. Open ${hoursText}.`;
      const { error: updateError } = await supabase.from('user_profiles').update({ full_name: businessName, bio: fullBio, location, avatar_url: avatarUrl || null, vendor_onboarding_complete: true }).eq('id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      window.location.href = '/chef-menu';
    } catch (err: any) { setError(err?.message || 'Failed to save your profile. Please try again.'); } finally { setSaving(false); }
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    try { await supabase.from('user_profiles').update({ vendor_onboarding_complete: true }).eq('id', user.id); await refreshProfile(); window.location.href = '/chef-menu'; }
    catch { window.location.href = '/chef-menu'; }
    finally { setSaving(false); }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="flex items-center gap-3 text-muted-foreground"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading vendor setup...</span></div></div>;
  }

  return <div className="min-h-screen bg-background flex items-center justify-center"><button onClick={handleFinish} disabled={saving}>{saving ? 'Saving...' : 'Launch My Vendor Profile'}</button>{error && <p>{error}</p>}</div>;
}
