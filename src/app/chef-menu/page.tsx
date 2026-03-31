'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '../../lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, ChefHat } from 'lucide-react';

export default function ChefMenuPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isChef, setIsChef] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) checkChef();
  }, [user, authLoading, router]);

  const checkChef = async () => {
    if (!user) return;
    try {
      const { data: profileRow } = await supabase.from('user_profiles').select('role, vendor_onboarding_complete').eq('id', user.id).single();
      if (profileRow?.role !== 'chef') {
        setIsChef(false);
        setLoading(false);
        return;
      }
      if (!profileRow.vendor_onboarding_complete) {
        router.replace('/vendor-onboarding');
        return;
      }
      setIsChef(true);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  if (authLoading || !user || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="text-sm text-muted-foreground">Checking your account...</div></div>;
  }

  if (!isChef) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="text-center"><ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-lg font-600 text-foreground">Chef Access Required</p></div></div>;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[18px] font-700 text-foreground leading-tight">My Menu</h1>
            <p className="text-xs text-muted-foreground">Manage your vendor profile and menu</p>
          </div>
          <button onClick={() => router.push('/edit-profile')} className="flex items-center gap-1.5 bg-primary text-white text-sm font-600 px-4 py-2 rounded-full">
            <Plus className="w-3.5 h-3.5" />
            Edit Vendor Profile
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
