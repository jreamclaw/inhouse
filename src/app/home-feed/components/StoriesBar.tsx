'use client';

import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function StoriesBar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { profile, user } = useAuth();

  const userAvatarUrl = profile?.avatar_url || null;
  const displayName = profile?.full_name || user?.email?.split('@')?.[0] || 'You';

  return (
    <div className="bg-card border-b border-border/50 sticky top-14 z-30">
      <div
        ref={scrollRef}
        className="flex gap-4 px-4 py-4 overflow-x-auto scrollbar-hide"
      >
        <button
          className="flex flex-col items-center gap-2 shrink-0 group transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
          aria-label="Add your story"
          suppressHydrationWarning
        >
          <div className="relative">
            <div className="w-[62px] h-[62px] rounded-full flex items-center justify-center bg-muted">
              <div className="w-[56px] h-[56px] rounded-full overflow-hidden bg-card ring-[2px] ring-card">
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={`${displayName} profile avatar`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-400 to-purple-500 text-white text-lg font-bold">
                    {displayName?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center border-[2px] border-card shadow-sm">
              <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[10px] max-w-[58px] truncate text-center leading-tight tracking-tight text-muted-foreground font-400">
            Your Story
          </span>
        </button>

        <div className="flex items-center px-2">
          <div className="text-[12px] text-muted-foreground">No stories yet.</div>
        </div>
      </div>
    </div>
  );
}
