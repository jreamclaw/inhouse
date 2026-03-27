'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function SplashScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<'enter' | 'hold'>('enter');
  const supabase = createClient();

  useEffect(() => {
    // Animate logo in
    const enterTimer = setTimeout(() => setPhase('hold'), 600);

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase?.auth?.getSession();
        console.log('[Splash] session exists:', !!session?.user, '| user id:', session?.user?.id ?? 'NULL');

        if (!session?.user) {
          console.log('[Splash] No session — routing to /login after animation');
          setTimeout(() => {
            router?.replace('/login');
          }, 2200);
          return;
        }

        const { data: profileData } = await supabase?.from('user_profiles')?.select('role, vendor_onboarding_complete, onboarding_complete')?.eq('id', session?.user?.id)?.single();

        console.log('[Splash] profile role:', profileData?.role ?? 'NULL', '| onboarding complete:', profileData?.vendor_onboarding_complete);

        if (!profileData?.onboarding_complete) {
          console.log('[Splash] Onboarding not complete — redirecting to /onboarding');
          router?.replace('/onboarding');
        } else if (profileData?.role === 'chef') {
          const dest = profileData?.vendor_onboarding_complete ? '/chef-menu' : '/vendor-onboarding';
          console.log('[Splash] Authenticated chef — redirecting to', dest);
          router?.replace(dest);
        } else {
          console.log('[Splash] Authenticated customer — redirecting to /home-feed');
          router?.replace('/home-feed');
        }
      } catch (err) {
        console.error('[Splash] Auth check error:', err);
        setTimeout(() => {
          router?.replace('/login');
        }, 2200);
      }
    };

    checkAuth();

    return () => clearTimeout(enterTimer);
  }, []);

  const handleTap = useCallback(() => {
    router?.replace('/login');
  }, [router]);

  return (
    <div
      onClick={handleTap}
      className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 40%, #0d0d1a 70%, #0a0a0a 100%)',
      }}
    >
      {/* Multi-color glow layers */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-96 h-96 rounded-full absolute"
          style={{
            background: 'radial-gradient(circle, rgba(255,100,0,0.22) 0%, transparent 65%)',
            transform: 'translate(-30px, -20px)',
          }}
        />
        <div
          className="w-80 h-80 rounded-full absolute"
          style={{
            background: 'radial-gradient(circle, rgba(220,50,150,0.18) 0%, transparent 65%)',
            transform: 'translate(30px, 20px)',
          }}
        />
        <div
          className="w-72 h-72 rounded-full absolute"
          style={{
            background: 'radial-gradient(circle, rgba(130,50,220,0.14) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* Logo */}
      <div
        className={`relative z-10 flex flex-col items-center transition-all duration-700 ${
          phase === 'enter' ? 'opacity-0 scale-90 translate-y-4' : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        <Image
          src="/assets/images/Untitled-1773907427735.jpeg"
          alt="InHouse Logo"
          width={130}
          height={130}
          priority
          className="object-contain rounded-2xl"
          style={{
            filter: 'drop-shadow(0 0 40px rgba(255,100,0,0.4)) drop-shadow(0 0 80px rgba(220,50,150,0.2))',
          }}
        />
        <p
          className="mt-5 font-script text-4xl text-white"
          style={{
            textShadow: '0 0 30px rgba(255,100,0,0.5)',
          }}
        >
          InHouse
        </p>
      </div>

      {/* Tagline */}
      <p
        className={`relative z-10 mt-4 text-sm tracking-widest uppercase font-medium transition-all duration-700 delay-300 ${
          phase === 'enter' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
        style={{ color: 'rgba(255,140,80,0.85)' }}
      >
        Home-cooked. Delivered.
      </p>

      {/* Tap to continue hint */}
      <p
        className={`relative z-10 mt-4 text-xs text-white/40 transition-all duration-700 delay-500 ${
          phase === 'enter' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        Tap to continue
      </p>
    </div>
  );
}
