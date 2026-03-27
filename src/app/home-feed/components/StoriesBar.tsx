'use client';

import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const OTHER_STORIES = [
  {
    id: 'chef-1',
    name: 'Marco V.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    isChef: true,
    hasStory: true,
    seen: false,
  },
  {
    id: 'chef-2',
    name: 'Aisha K.',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop&crop=face',
    isChef: true,
    hasStory: true,
    seen: false,
  },
  {
    id: 'user-1',
    name: 'Priya S.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
    isChef: false,
    hasStory: true,
    seen: false,
  },
  {
    id: 'chef-3',
    name: 'Luca R.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    isChef: true,
    hasStory: true,
    seen: false,
  },
  {
    id: 'user-2',
    name: 'Zoe T.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face',
    isChef: false,
    hasStory: true,
    seen: true,
  },
  {
    id: 'chef-4',
    name: 'Hana M.',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop&crop=face',
    isChef: true,
    hasStory: true,
    seen: true,
  },
  {
    id: 'user-3',
    name: 'Dev P.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
    isChef: false,
    hasStory: true,
    seen: true,
  },
];

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
        {/* Your Story — always first, uses real avatar */}
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

        {/* Other stories */}
        {OTHER_STORIES?.map((story) => (
          <button
            key={story?.id}
            className="flex flex-col items-center gap-2 shrink-0 group transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
            aria-label={`View ${story?.name}'s story`}
            suppressHydrationWarning
          >
            <div className="relative">
              <div
                className={`w-[62px] h-[62px] rounded-full flex items-center justify-center transition-all duration-200 ${
                  story?.hasStory && !story?.seen
                    ? 'bg-gradient-to-tr from-primary via-amber-400 to-yellow-300'
                    : story?.hasStory && story?.seen
                    ? 'bg-border/70' :'bg-muted'
                }`}
              >
                <div className="w-[56px] h-[56px] rounded-full overflow-hidden bg-card ring-[2px] ring-card">
                  <img
                    src={story?.avatar}
                    alt={`${story?.name} profile avatar`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>

              {story?.isChef && (
                <div className="absolute bottom-0 right-0 w-[18px] h-[18px] bg-amber-400 rounded-full flex items-center justify-center border-[2px] border-card text-[8px] shadow-sm">
                  👨‍🍳
                </div>
              )}
            </div>

            <span className={`text-[10px] max-w-[58px] truncate text-center leading-tight tracking-tight ${
              story?.hasStory && !story?.seen
                ? 'text-foreground font-600'
                : 'text-muted-foreground font-400'
            }`}>
              {story?.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}