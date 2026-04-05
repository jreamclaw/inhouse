'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { authDebug } from '@/lib/auth/debug';

export default function RootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  const redirectDecision = useMemo(() => {
    if (!user) {
      return { redirectTarget: '/login', reason: 'missing-session' };
    }

    if (!profile) {
      return { redirectTarget: '/role-selection', reason: 'missing-profile' };
    }

    if (!profile.role) {
      return { redirectTarget: '/role-selection', reason: 'missing-role' };
    }

    if (profile.role === 'chef') {
      return {
        redirectTarget: profile.vendor_onboarding_complete ? '/chef-menu' : '/vendor-onboarding',
        reason: profile.vendor_onboarding_complete ? 'chef-ready' : 'chef-vendor-onboarding-incomplete',
      };
    }

    if (!profile.onboarding_complete) {
      return { redirectTarget: '/onboarding', reason: 'customer-onboarding-incomplete' };
    }

    return { redirectTarget: '/home-feed', reason: 'customer-ready' };
  }, [user, profile]);

  useEffect(() => {
    if (loading) return;

    authDebug('root-page.redirect-decision', {
      pathname,
      sessionExists: !!user,
      userId: user?.id ?? null,
      profileRole: profile?.role ?? null,
      onboardingComplete: profile?.onboarding_complete ?? null,
      vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
      redirectTarget: redirectDecision.redirectTarget,
      reason: redirectDecision.reason,
    });

    router.replace(redirectDecision.redirectTarget);
  }, [loading, user, profile, router, pathname, redirectDecision]);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_45%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]">
        <div className="animate-[splashPop_0.9s_ease-out]">
          <AppLogo size={92} />
        </div>
        <h1 className="mt-5 text-white text-2xl font-700 tracking-tight">InHouse</h1>
        <p className="mt-2 text-white/55 text-sm text-center max-w-xs">
          Checking your account...
        </p>
      </div>

      <div className="absolute bottom-10 text-[11px] text-white/35 tracking-wide">
        Routing you now...
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



