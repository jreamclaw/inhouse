'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import StoriesBar from './components/StoriesBar';
import PostFeed from './components/PostFeed';
import SuggestedChefs from './components/SuggestedChefs';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeFeedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

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
      <div className="flex gap-0 xl:gap-6 max-w-screen-2xl mx-auto px-0 xl:px-6 2xl:px-10 py-0 xl:py-4">
        <div className="flex-1 min-w-0">
          <StoriesBar />
          <PostFeed mode="local" />
        </div>
        <aside className="hidden xl:block w-80 shrink-0 pt-4">
          <SuggestedChefs />
        </aside>
      </div>
    </AppLayout>
  );
}
