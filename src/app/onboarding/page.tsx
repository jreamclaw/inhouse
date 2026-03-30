'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import {
  ChefHat,
  ShoppingBag,
  ArrowRight,
  MapPin,
  Users,
  Star,
  Utensils,
  Heart,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


type Step = 'intro1' | 'intro2' | 'location';
type Role = 'chef' | 'customer';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('intro1');
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoFinishing, setAutoFinishing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (profile?.role && step === 'intro2') {
      // role already chosen earlier; onboarding should move forward without asking again
    }
  }, [user, profile?.role, step]);

  const handleRequestLocation = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      setLocationGranted(false);
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocationGranted(true);
        try {
          const coordsLabel = `${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}`;
          if (resolvedUserId) {
            await supabase
              .from('user_profiles')
              .update({ location: coordsLabel, updated_at: new Date().toISOString() })
              .eq('id', resolvedUserId);
          }
        } catch {
          // location text update is best-effort; permission state still matters most
        }
        setLocationLoading(false);
      },
      () => {
        setLocationGranted(false);
        setLocationLoading(false);
      }
    );
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

  // ── INTRO SCREEN 1 ──
  if (step === 'intro1') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-96 h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,140,0,0.2) 0%, rgba(255,80,0,0.08) 50%, transparent 75%)',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <AppLogo size={72} className="mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Home-cooked meals,<br />
            <span className="text-orange-400">delivered with love.</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-10">
            InHouse connects you with talented home chefs in your neighborhood. Discover authentic, made-from-scratch meals you won't find anywhere else.
          </p>

          {/* Feature highlights */}
          <div className="w-full space-y-3 mb-10">
            {[
              { icon: Utensils, label: 'Authentic home-cooked dishes', color: 'text-orange-400' },
              { icon: MapPin, label: 'Chefs near you', color: 'text-emerald-400' },
              { icon: Star, label: 'Rated & reviewed by your community', color: 'text-amber-400' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
                <Icon className={`w-5 h-5 ${color} shrink-0`} />
                <span className="text-white/80 text-sm">{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep('intro2')}
            className="w-full h-14 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/30 text-base"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Step dots */}
          <div className="flex gap-2 mt-6">
            <div className="w-6 h-1.5 rounded-full bg-orange-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    );
  }

  // ── INTRO SCREEN 2 ──
  if (step === 'intro2') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-96 h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(109,40,217,0.08) 50%, transparent 75%)',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-violet-500/30">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            A community of<br />
            <span className="text-violet-400">food lovers.</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-10">
            Follow your favorite chefs, share your food experiences, and discover what's cooking in your city. It's social media, but make it delicious.
          </p>

          <div className="w-full space-y-3 mb-10">
            {[
              { icon: Users, label: 'Follow chefs & food lovers', color: 'text-violet-400' },
              { icon: Heart, label: 'Like, comment & share posts', color: 'text-pink-400' },
              { icon: ChefHat, label: 'Chefs earn directly from fans', color: 'text-orange-400' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
                <Icon className={`w-5 h-5 ${color} shrink-0`} />
                <span className="text-white/80 text-sm">{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep('location')}
            className="w-full h-14 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-violet-500/30 text-base"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="flex gap-2 mt-6">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-6 h-1.5 rounded-full bg-violet-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    );
  }

  // ── LOCATION PERMISSION ──
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      <div className="relative z-10 flex flex-col items-center max-w-sm">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
          <MapPin className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Find chefs near you</h1>
        <p className="text-white/60 text-base leading-relaxed mb-8">
          Allow InHouse to access your location to show you home chefs and fresh meals available in your neighborhood.
        </p>

        <div className="w-full space-y-3 mb-8">
          {[
            'Discover chefs within walking distance',
            'See real-time availability in your area',
            'Get accurate delivery estimates',
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 text-left">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-white/80 text-sm">{benefit}</span>
            </div>
          ))}
        </div>

        {locationGranted ? (
          <div className="w-full mb-4 flex items-center justify-center gap-2 bg-emerald-900/40 border border-emerald-500/30 rounded-2xl py-4 text-emerald-400 font-semibold">
            <CheckCircle className="w-5 h-5" />
            Location access granted!
          </div>
        ) : (
          <button
            onClick={handleRequestLocation}
            disabled={locationLoading}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20 text-base mb-3"
          >
            {locationLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                Allow Location Access
              </>
            )}
          </button>
        )}

        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full h-14 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-base border border-white/10"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {locationGranted ? 'Get Started' : 'Skip for now'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
        )}

        <div className="flex gap-2 mt-6">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="w-6 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}




