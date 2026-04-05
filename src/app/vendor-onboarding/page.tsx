'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import { ChefHat, MapPin, UtensilsCrossed, Camera, ArrowRight, ArrowLeft, Loader2, Check, Store, Clock } from 'lucide-react';

const FOOD_CATEGORIES = ['Soul Food', 'BBQ', 'Seafood', 'Wings', 'Pizza', 'Tacos / Mexican', 'Vegan / Plant-Based', 'Desserts', 'Breakfast', 'Italian', 'Asian Fusion', 'Caribbean', 'Burgers', 'Sandwiches', 'Healthy Bowls', 'Other'];
const STEPS = [
  { id: 1, label: 'Business Info', icon: Store },
  { id: 2, label: 'Food Category', icon: UtensilsCrossed },
  { id: 3, label: 'Location', icon: MapPin },
  { id: 4, label: 'Hours', icon: Clock },
  { id: 5, label: 'Profile Image', icon: Camera },
];

export default function VendorOnboardingPage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile, getUserProfile } = useAuth();
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
  const [resolvedProfile, setResolvedProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (!loading && user && profile?.role && profile.role !== 'chef') {
      router.replace('/home-feed');
      return;
    }

    if (!loading && user && profile?.role === 'chef' && profile.vendor_onboarding_complete) {
      router.replace('/chef-menu');
      return;
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (profile) {
      setResolvedProfile(profile);
      setBusinessName(profile.full_name || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    if (loading || !user || profile || resolvedProfile) return;

    let cancelled = false;

    const hydrateProfile = async () => {
      try {
        const freshProfile = await getUserProfile();
        if (!cancelled && freshProfile) {
          setResolvedProfile(freshProfile);
          setBusinessName(freshProfile.full_name || '');
          setBio(freshProfile.bio || '');
          setLocation(freshProfile.location || '');
          setAvatarUrl(freshProfile.avatar_url || '');
        }
      } catch {}
    };

    hydrateProfile();
    return () => {
      cancelled = true;
    };
  }, [loading, user, profile, resolvedProfile, getUserProfile]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const toggleDay = (day: string) => {
    setDaysOpen((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUrl(URL.createObjectURL(file));
  };

  const canProceed = () => {
    if (step === 1) return businessName.trim().length > 0;
    if (step === 2) return selectedCategories.length > 0;
    if (step === 3) return location.trim().length > 0;
    if (step === 4) return daysOpen.length > 0;
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const hoursText = `${daysOpen.join(', ')} • ${openTime} - ${closeTime}`;
      const closedDays = DAYS.filter((day) => !daysOpen.includes(day));
      const categoryText = selectedCategories.join(', ');
      const fullBio = bio.trim() ? bio.trim() : `${businessName} - ${categoryText}.`;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: businessName,
          bio: fullBio,
          location,
          avatar_url: avatarUrl || null,
          business_hours: hoursText,
          closed_days: closedDays,
          vendor_onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      window.location.href = '/chef-menu';
    } catch (err: any) {
      setError(err?.message || 'Failed to save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('user_profiles').update({ vendor_onboarding_complete: true }).eq('id', user.id);
      await refreshProfile();
      window.location.href = '/chef-menu';
    } catch {
      window.location.href = '/chef-menu';
    } finally {
      setSaving(false);
    }
  };

  const activeProfile = profile || resolvedProfile;

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading vendor setup...</span>
        </div>
      </div>
    );
  }

  if (activeProfile?.role && activeProfile.role !== 'chef') {
    return null;
  }

  if (activeProfile?.vendor_onboarding_complete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <AppLogo size={48} />
          <span className="text-lg font-bold text-foreground">InHouse</span>
        </div>
        <button onClick={handleSkip} disabled={saving} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Finish later</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-1 mb-8 w-full">
          {STEPS.map((s, idx) => {
            const StepIcon = s.icon;
            const isCompleted = step > s.id;
            const isActive = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-primary text-white' : isActive ? 'bg-primary/10 border-2 border-primary text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && <div className={`flex-1 h-0.5 mb-4 transition-all ${step > s.id ? 'bg-primary' : 'bg-border'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="w-full">
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white mx-auto mb-3"><ChefHat className="w-7 h-7" /></div>
                <h1 className="text-2xl font-bold text-foreground">Set up your vendor profile</h1>
                <p className="text-muted-foreground text-sm mt-1">Tell customers about your food business</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Business / Chef Name <span className="text-destructive">*</span></label>
                <input type="text" placeholder="e.g. Queen's Wing Spot" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full h-12 px-4 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Short Bio / Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea placeholder="Tell customers what makes your food special..." value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-6"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white mx-auto mb-3"><UtensilsCrossed className="w-7 h-7" /></div><h1 className="text-2xl font-bold text-foreground">What do you cook?</h1></div>
              <div className="flex flex-wrap gap-2">{FOOD_CATEGORIES.map((cat) => { const isSelected = selectedCategories.includes(cat); return <button key={cat} type="button" onClick={() => toggleCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${isSelected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-card text-foreground border-border hover:border-primary/40'}`}>{cat}</button>; })}</div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5"><div className="text-center mb-6"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white mx-auto mb-3"><MapPin className="w-7 h-7" /></div><h1 className="text-2xl font-bold text-foreground">Where are you based?</h1></div><input type="text" placeholder="e.g. Atlanta, GA or Midtown Atlanta" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full h-12 px-4 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" /></div>
          )}

          {step === 4 && (
            <div className="space-y-5"><div className="text-center mb-6"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white mx-auto mb-3"><Clock className="w-7 h-7" /></div><h1 className="text-2xl font-bold text-foreground">Business hours</h1></div><div className="flex flex-wrap gap-2">{DAYS.map((day) => { const isSelected = daysOpen.includes(day); return <button key={day} type="button" onClick={() => toggleDay(day)} className={`w-12 h-10 rounded-xl text-sm font-medium transition-all border ${isSelected ? 'bg-primary text-white border-primary' : 'bg-card text-foreground border-border hover:border-primary/40'}`}>{day}</button>; })}</div></div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div className="text-center mb-6"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white mx-auto mb-3"><Camera className="w-7 h-7" /></div><h1 className="text-2xl font-bold text-foreground">Add a profile photo</h1></div>
              <div className="flex justify-center mb-4"><div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 bg-muted flex items-center justify-center">{avatarUrl ? <img src={avatarUrl} alt="Profile preview" className="w-full h-full object-cover" /> : <ChefHat className="w-10 h-10 text-muted-foreground" />}</div></div>
              <div>
                <input type="url" placeholder="https://example.com/your-photo.jpg" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="w-full h-12 px-4 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
            </div>
          )}
        </div>

        {error && <div className="mt-4 w-full px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}

        <div className="flex gap-3 mt-8 w-full">
          {step > 1 && <button onClick={() => setStep((s) => s - 1)} className="flex items-center gap-2 px-5 h-12 rounded-2xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors"><ArrowLeft className="w-4 h-4" />Back</button>}
          {step < STEPS.length ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25">Continue<ArrowRight className="w-4 h-4" /></button>
          ) : (
            <button onClick={handleFinish} disabled={saving} className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25">{saving ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Launching your vendor page...</span></> : <><span>Launch My Vendor Profile</span><ArrowRight className="w-4 h-4" /></>}</button>
          )}
        </div>
      </div>
    </div>
  );
}
