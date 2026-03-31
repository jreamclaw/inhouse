'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import StoriesBar from './components/StoriesBar';
import PostFeed from './components/PostFeed';
import SuggestedChefs from './components/SuggestedChefs';
import LocationHeader from './components/LocationHeader';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_LOCATION = 'Set your location';

export default function HomeFeedPage() {
  const [mode, setMode] = useState<'local' | 'explore'>('local');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (profile?.location) {
      setLocation(profile.location);
    }
  }, [profile]);

  const handleLocationChange = async (loc: string) => {
    setLocation(loc);
    if (user) {
      try {
        await supabase
          .from('user_profiles')
          .update({ location: loc, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch {}
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading your feed...</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="flex gap-0 xl:gap-6 max-w-screen-2xl mx-auto px-0 xl:px-6 2xl:px-10 py-0 xl:py-6">
        <div className="flex-1 min-w-0">
          <LocationHeader mode={mode} onModeChange={setMode} location={location} onLocationChange={handleLocationChange} />
          <StoriesBar />
          <PostFeed mode={mode} location={location} />
        </div>
        <aside className="hidden xl:block w-80 shrink-0">
          <SuggestedChefs />
        </aside>
      </div>
    </AppLayout>
  );
}
