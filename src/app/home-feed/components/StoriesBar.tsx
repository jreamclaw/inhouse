'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type StoryRow = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
  expires_at: string;
  user_profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: 'chef' | 'customer' | null;
  } | null;
};

type StoryGroup = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: 'chef' | 'customer' | null;
  stories: StoryRow[];
};

export default function StoriesBar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { profile, user } = useAuth();
  const supabase = createClient();

  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [storiesAvailable, setStoriesAvailable] = useState(true);
  const [activeGroup, setActiveGroup] = useState<StoryGroup | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const userAvatarUrl = profile?.avatar_url || null;
  const displayName = profile?.full_name || user?.email?.split('@')?.[0] || 'You';

  useEffect(() => {
    loadStories();
  }, [user?.id]);

  const loadStories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          caption,
          created_at,
          expires_at,
          user_profiles:user_id (
            id,
            full_name,
            avatar_url,
            role
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        const message = String(error.message || '').toLowerCase();
        if (message.includes('stories') && (message.includes('does not exist') || message.includes('schema cache'))) {
          setStoriesAvailable(false);
          setStoryGroups([]);
          return;
        }
        throw error;
      }

      setStoriesAvailable(true);

      const grouped = new Map<string, StoryGroup>();
      for (const row of (data as StoryRow[] | null) ?? []) {
        const existing = grouped.get(row.user_id);
        if (existing) {
          existing.stories.push(row);
        } else {
          grouped.set(row.user_id, {
            userId: row.user_id,
            name: row.user_profiles?.full_name || 'User',
            avatarUrl: row.user_profiles?.avatar_url || null,
            role: row.user_profiles?.role || null,
            stories: [row],
          });
        }
      }

      const groups = Array.from(grouped.values()).map((group) => ({
        ...group,
        stories: group.stories.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }));

      setStoryGroups(groups);
    } catch {
      setStoryGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const ownStoryGroup = useMemo(
    () => storyGroups.find((group) => group.userId === user?.id) || null,
    [storyGroups, user?.id]
  );

  const otherStoryGroups = useMemo(
    () => storyGroups.filter((group) => group.userId !== user?.id),
    [storyGroups, user?.id]
  );

  const openStoryViewer = (group: StoryGroup) => {
    setActiveGroup(group);
    setActiveIndex(Math.max(0, group.stories.length - 1));
  };

  const currentStory = activeGroup?.stories?.[activeIndex] || null;
  const canGoPrev = activeIndex > 0;
  const canGoNext = !!activeGroup && activeIndex < activeGroup.stories.length - 1;

  const handleAddStory = () => {
    if (!user) {
      toast.error('Please sign in to add a story');
      return;
    }
    router.push('/create-story');
  };

  if (!storiesAvailable) {
    return null;
  }

  return (
    <>
      <div className="bg-background border-b border-border/20">
        <div ref={scrollRef} className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
          <button
            className="flex flex-col items-center gap-2 shrink-0 group transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
            aria-label="Add your story"
            onClick={ownStoryGroup ? () => openStoryViewer(ownStoryGroup) : handleAddStory}
            suppressHydrationWarning
          >
            <div className="relative">
              <div className={`w-[78px] h-[78px] rounded-full flex items-center justify-center ${ownStoryGroup ? 'bg-gradient-to-br from-fuchsia-500 via-orange-400 to-amber-300 p-[2.5px] shadow-[0_10px_24px_rgba(249,115,22,0.18)]' : 'bg-muted border border-border/70'}`}>
                <div className="w-[71px] h-[71px] rounded-full overflow-hidden bg-card ring-[2.5px] ring-card flex items-center justify-center">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt={`${displayName} profile avatar`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-400 to-purple-500 text-white text-lg font-bold">
                      {displayName?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              {!ownStoryGroup && (
                <div className="absolute bottom-0.5 right-0.5 w-[22px] h-[22px] bg-primary rounded-full flex items-center justify-center border-[2px] border-card shadow-sm">
                  <Plus className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <span className="text-[11px] max-w-[78px] truncate text-center leading-tight tracking-tight text-muted-foreground font-500">
              Create Story
            </span>
          </button>

          {loading ? null : otherStoryGroups.map((group) => (
            <button
              key={group.userId}
              onClick={() => openStoryViewer(group)}
              className="flex flex-col items-center gap-2 shrink-0 group transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
              aria-label={`View ${group.name}'s story`}
            >
              <div className="w-[78px] h-[78px] rounded-full bg-gradient-to-br from-fuchsia-500 via-orange-400 to-amber-300 p-[2.5px] shadow-[0_10px_24px_rgba(249,115,22,0.18)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-card ring-[2px] ring-card flex items-center justify-center">
                  {group.avatarUrl ? (
                    <img src={group.avatarUrl} alt={`${group.name} avatar`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-500 to-slate-700 text-white text-lg font-bold">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] max-w-[78px] truncate text-center leading-tight tracking-tight text-muted-foreground font-500">
                {group.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeGroup && currentStory && (
        <div className="fixed inset-0 z-[80] bg-black">
          <div className="absolute inset-0">
            {currentStory.media_type === 'video' ? (
              <video
                key={currentStory.id}
                src={currentStory.media_url}
                className="w-full h-full object-cover bg-black"
                controls
                autoPlay
                muted
                playsInline
              />
            ) : (
              <img
                src={currentStory.media_url}
                alt={currentStory.caption || `${activeGroup.name} story`}
                className="w-full h-full object-cover bg-black"
              />
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/65 pointer-events-none" />

          <div className="absolute top-0 inset-x-0 z-10 px-3 pt-[max(env(safe-area-inset-top),12px)] pb-4 pointer-events-none">
            <div className="flex gap-1 mb-3">
              {activeGroup.stories.map((story, idx) => (
                <div key={story.id} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${idx <= activeIndex ? 'bg-white' : 'bg-transparent'}`} />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0 ring-2 ring-white/20">
                {activeGroup.avatarUrl ? (
                  <img src={activeGroup.avatarUrl} alt={`${activeGroup.name} avatar`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {activeGroup.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-700 text-white truncate">{activeGroup.name}</p>
                <p className="text-xs text-white/75">{new Date(currentStory.created_at).toLocaleString()}</p>
              </div>
              <button
                className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white/90 hover:text-white"
                onClick={() => setActiveGroup(null)}
                aria-label="Close story viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="absolute inset-0 z-20 flex">
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => canGoPrev && setActiveIndex((idx) => Math.max(0, idx - 1))}
              className="flex-1 h-full bg-transparent"
            />
            <button
              type="button"
              aria-label="Next story"
              onClick={() => canGoNext ? setActiveIndex((idx) => Math.min(activeGroup.stories.length - 1, idx + 1)) : setActiveGroup(null)}
              className="flex-1 h-full bg-transparent"
            />
          </div>

          {currentStory.caption && (
            <div className="absolute left-0 right-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-16 pointer-events-none">
              <div className="max-w-xl rounded-2xl bg-black/35 backdrop-blur-md px-4 py-3 text-sm text-white/95 shadow-lg">
                {currentStory.caption}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
