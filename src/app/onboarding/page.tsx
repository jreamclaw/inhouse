'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { reverseGeocode } from '@/lib/location/geocode';
import AppLogo from '@/components/ui/AppLogo';
import { ChefHat, ShoppingBag, ArrowRight, MapPin, Users, Star, Utensils, Heart, Loader2, CheckCircle } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';

type Step = 'intro1' | 'intro2' | 'location';
type Role = 'chef' | 'customer';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const supabase = createClient();
  const resolvedUserId = user?.id ?? profile?.id ?? null;

  const [step, setStep] = useState<Step>('intro1');
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const handleRequestLocation = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) { setLocationGranted(false); setLocationLoading(false); return; }
    navigator.geolocation.getCurrentPosition(async (position) => {
      setLocationGranted(true);
      try {
        const resolved = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        const fullAddress = resolved?.fullAddress || 'Current location';
        if (resolvedUserId) {
          await supabase
            .from('user_profiles')
            .update({
              location: fullAddress,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              updated_at: new Date().toISOString(),
            })
            .eq('id', resolvedUserId);
        }
      } catch {}
      setLocationLoading(false);
    }, () => { setLocationGranted(false); setLocationLoading(false); });
  };

  const handleFinish = async () => {
    if (!user) return router.replace('/login');
    if (!profile?.role) return router.replace('/role-selection');
    setSaving(true); setError('');
    try {
      const existingRole = profile.role as Role;
      const { error: updateError } = await supabase.from('user_profiles').update({ onboarding_complete: true, location_permission_granted: locationGranted, updated_at: new Date().toISOString() }).eq('id', resolvedUserId);
      if (updateError) throw updateError;
      if (existingRole === 'chef') router.replace('/vendor-onboarding'); else router.replace('/home-feed');
    } catch (err: any) { setError(err?.message || 'Something went wrong. Please try again.'); setSaving(false); }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="flex items-center gap-3 text-muted-foreground"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading onboarding...</span></div></div>;
  }

  if (step === 'intro1') return <div className="min-h-screen bg-black flex items-center justify-center text-white"><button onClick={() => setStep('intro2')}>Get Started</button></div>;
  if (step === 'intro2') return <div className="min-h-screen bg-black flex items-center justify-center text-white"><button onClick={() => setStep('location')}>Continue</button></div>;

  return <div className="min-h-screen bg-black flex items-center justify-center text-white"><button onClick={handleFinish} disabled={saving}>{saving ? 'Saving...' : 'Finish'}</button>{error && <p>{error}</p>}</div>;
}
