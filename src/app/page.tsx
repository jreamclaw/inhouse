'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const timeout = setTimeout(() => {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!profile?.role) {
        router.replace('/role-selection');
        return;
      }

      if (!profile?.onboarding_complete) {
        router.replace('/onboarding');
        return;
      }

      if (profile.role === 'chef') {
        router.replace(profile.vendor_onboarding_complete ? '/chef-menu' : '/vendor-onboarding');
        return;
      }

      router.replace('/home-feed');
    }, 1400);

    return () => clearTimeout(timeout);
  }, [loading, user, profile, router]);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_45%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]">
        <div className="animate-[splashPop_0.9s_ease-out]">
          <AppLogo size={92} />
        </div>
        <h1 className="mt-5 text-white text-2xl font-700 tracking-tight">InHouse</h1>
        <p className="mt-2 text-white/55 text-sm text-center max-w-xs">
          Discover local chefs and hidden food businesses near you.
        </p>
      </div>

      <div className="absolute bottom-10 text-[11px] text-white/35 tracking-wide">
        Loading InHouse...
      </div>

      <style jsx global>{`
        @keyframes splashPop {
          0% { transform: scale(0.82); opacity: 0; }
          60% { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </main>
  );
}



