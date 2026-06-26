'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import CheckoutFlow from './components/CheckoutFlow';
import { useAuth } from '@/contexts/AuthContext';

export default function OrderCheckoutPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;

    let parsed: unknown = null;
    try {
      const saved = window.localStorage.getItem('inhouse_checkout_cart');
      parsed = saved ? JSON.parse(saved) : null;
    } catch {
      parsed = null;
    }

    const hasCartItems = Array.isArray(parsed) && parsed.length > 0;
    if (hasCartItems) return;

    if (profile?.role === 'chef') {
      router.replace('/chef-menu?section=orders');
      return;
    }

    router.replace('/profile-screen?tab=orders');
  }, [loading, profile?.role, router]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto xl:max-w-screen-lg px-0 xl:px-6 2xl:px-10 py-0 xl:py-6">
        <CheckoutFlow />
      </div>
    </AppLayout>
  );
}
