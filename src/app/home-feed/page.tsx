'use client';

import React, { useState, useEffect } from 'react';
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
  const supabase = createClient();

  // Load saved location from profile
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
      } catch {
        // silently fail — location is still updated in UI
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading your feed...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex gap-0 xl:gap-6 max-w-screen-2xl mx-auto px-0 xl:px-6 2xl:px-10 py-0 xl:py-6">
        {/* Main Feed Column */}
        <div className="flex-1 min-w-0">
          <LocationHeader
            mode={mode}
            onModeChange={setMode}
            location={location}
            onLocationChange={handleLocationChange}
          />
          <StoriesBar />
          <PostFeed mode={mode} />
        </div>
        {/* Right Sidebar — desktop only */}
        <aside className="hidden xl:block w-80 shrink-0">
          <SuggestedChefs />
        </aside>
      </div>
    </AppLayout>
  );
}