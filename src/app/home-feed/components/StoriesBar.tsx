'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Play } from 'lucide-react';
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
        <div ref={scrollRef} className="flex gap-3 px-3 py-2 overflow-x-auto scrollbar-hide">
          <button
            className="flex flex-col items-center gap-1.5 shrink-0 group transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
            aria-label="Add your story"
            onClick={ownStoryGroup ? () => openStoryViewer(ownStoryGroup) : handleAddStory}
            suppressHydrationWarning
          >
            <div className="relative">
              <div className={`w-[62px] h-[62px] rounded-full flex items-center justify-center ${ownStoryGroup ? 'bg-gradient-to-br from-fuchsia-500 via-orange-400 to-amber-300 p-[2px]' : 'bg-muted'}`}>
                <div className="w-[56px] h-[56px] rounded-full overflow-hidden bg-card ring-[2px] ring-card flex items-center justify-center">
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
                <div className="absolute bottom-0 right-0 w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center border-[2px] border-card shadow-sm">
                  <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <span className="text-[10px] max-w-[62px] truncate text-center leading-tight tracking-tight text-muted-foreground font-500">
              Create Story
            </span>
          </button>

          {loading ? null : otherStoryGroups.map((group) => (
            <button
              key={group.userId}
              onClick={() => openStoryViewer(group)}
              className="flex flex-col items-center gap-1.5 shrink-0 group transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
              aria-label={`View ${group.name}'s story`}
            >
              <div className="w-[62px] h-[62px] rounded-full bg-gradient-to-br from-fuchsia-500 via-orange-400 to-amber-300 p-[2px]">
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
              <span className="text-[10px] max-w-[62px] truncate text-center leading-tight tracking-tight text-muted-foreground font-500">
                {group.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeGroup && currentStory && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center px-4 py-6">
          <button className="absolute top-4 right-4 text-white/80 hover:text-white text-sm font-600" onClick={() => setActiveGroup(null)}>
            Close
          </button>

          <div className="w-full max-w-md bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="flex gap-1 p-3 pb-2">
              {activeGroup.stories.map((story, idx) => (
                <div key={story.id} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                  <div className={`h-full rounded-full ${idx <= activeIndex ? 'bg-white' : 'bg-transparent'}`} />
                </div>
              ))}
            </div>

            <div className="px-4 pb-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0">
                {activeGroup.avatarUrl ? (
                  <img src={activeGroup.avatarUrl} alt={`${activeGroup.name} avatar`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {activeGroup.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-700 text-white truncate">{activeGroup.name}</p>
                <p className="text-xs text-white/60">{new Date(currentStory.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="relative bg-black">
              {currentStory.media_type === 'video' ? (
                <video src={currentStory.media_url} className="w-full max-h-[70vh] object-contain bg-black" controls autoPlay muted playsInline />
              ) : (
                <img src={currentStory.media_url} alt={currentStory.caption || `${activeGroup.name} story`} className="w-full max-h-[70vh] object-contain bg-black" />
              )}

              {currentStory.media_type === 'video' && (
                <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 text-white text-xs font-600 px-2.5 py-1 rounded-full">
                  <Play className="w-3 h-3 fill-white" /> Video
                </div>
              )}
            </div>

            {currentStory.caption && (
              <div className="px-4 py-3 text-sm text-white/90 border-t border-white/10">
                {currentStory.caption}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/10">
              <button
                onClick={() => setActiveIndex((idx) => Math.max(0, idx - 1))}
                disabled={activeIndex === 0}
                className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-600 disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => setActiveIndex((idx) => Math.min(activeGroup.stories.length - 1, idx + 1))}
                disabled={activeIndex === activeGroup.stories.length - 1}
                className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-600 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
