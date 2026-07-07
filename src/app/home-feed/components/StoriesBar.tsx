'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Heart, MessageCircle, Eye } from 'lucide-react';
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
  views_count?: number | null;
  likes_count?: number | null;
  replies_count?: number | null;
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

type StoryReplyRow = {
  id: string;
  story_id: string;
  user_id: string;
  body: string;
  created_at: string;
  user_profiles?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
};

async function shouldCreateNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  key: 'notif_post_likes' | 'notif_comments'
) {
  const { data } = await supabase
    .from('user_settings')
    .select(key)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return true;
  return data[key] !== false;
}

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
  const [likedStoryIds, setLikedStoryIds] = useState<string[]>([]);
  const [replyDraft, setReplyDraft] = useState('');
  const [repliesByStory, setRepliesByStory] = useState<Record<string, StoryReplyRow[]>>({});
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [showRepliesSheet, setShowRepliesSheet] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [showStoryActions, setShowStoryActions] = useState(false);
  const [showStoryReportModal, setShowStoryReportModal] = useState(false);

  const userAvatarUrl = profile?.avatar_url || null;
  const displayName = profile?.full_name || user?.email?.split('@')?.[0] || 'You';

  useEffect(() => {
    void loadBlockedUsers();
    loadStories();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void loadLikedStories();
  }, [user?.id]);

  useEffect(() => {
    const storyId = activeGroup?.stories?.[activeIndex]?.id;
    if (!storyId || !user?.id) return;
    void registerStoryView(storyId);
    void loadReplies(storyId);
  }, [activeGroup?.userId, activeIndex, user?.id]);

  const loadBlockedUsers = async () => {
    if (!user?.id) {
      setBlockedUserIds(new Set());
      return;
    }

    try {
      const { data } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      setBlockedUserIds(new Set(((data as { blocked_id: string }[] | null) || []).map((row) => row.blocked_id)));
    } catch {
      setBlockedUserIds(new Set());
    }
  };

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
          views_count,
          likes_count,
          replies_count,
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
        if (blockedUserIds.has(row.user_id)) continue;
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

  const loadLikedStories = async () => {
    const { data } = await supabase.from('story_likes').select('story_id').eq('user_id', user?.id || '');
    setLikedStoryIds(((data as { story_id: string }[] | null) || []).map((row) => row.story_id));
  };

  const loadReplies = async (storyId: string) => {
    setLoadingReplies(true);
    try {
      const { data, error } = await supabase
        .from('story_replies')
        .select(`
          id,
          story_id,
          user_id,
          body,
          created_at,
          user_profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('story_id', storyId)
        .order('created_at', { ascending: true })
        .limit(8);

      if (error) throw error;
      setRepliesByStory((prev) => ({ ...prev, [storyId]: (data as StoryReplyRow[] | null) || [] }));
    } catch {
      setRepliesByStory((prev) => ({ ...prev, [storyId]: [] }));
    } finally {
      setLoadingReplies(false);
    }
  };

  const registerStoryView = async (storyId: string) => {
    if (!user?.id) return;

    const { error } = await supabase.from('story_views').insert({ story_id: storyId, viewer_id: user.id });
    if (error && !String(error.message || '').toLowerCase().includes('duplicate')) return;

    setStoryGroups((prev) => prev.map((group) => ({
      ...group,
      stories: group.stories.map((story) => story.id === storyId
        ? { ...story, views_count: Math.max(Number(story.views_count || 0), Number(story.views_count || 0) + (error ? 0 : 1)) }
        : story),
    })));
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
    setReplyDraft('');
    setShowRepliesSheet(false);
    setShowStoryActions(false);
    setShowStoryReportModal(false);
  };

  const currentStory = activeGroup?.stories?.[activeIndex] || null;
  const canGoPrev = activeIndex > 0;
  const canGoNext = !!activeGroup && activeIndex < activeGroup.stories.length - 1;
  const isCurrentStoryLiked = currentStory ? likedStoryIds.includes(currentStory.id) : false;
  const currentReplies = currentStory ? repliesByStory[currentStory.id] || [] : [];
  const isOwnCurrentStory = Boolean(currentStory && user?.id && currentStory.user_id === user.id);

  const handleAddStory = () => {
    if (!user) {
      toast.error('Please sign in to add a story');
      return;
    }
    router.push('/create-story');
  };

  const bumpCurrentStoryCounts = (updates: Partial<Pick<StoryRow, 'views_count' | 'likes_count' | 'replies_count'>>) => {
    if (!currentStory) return;
    setStoryGroups((prev) => prev.map((group) => ({
      ...group,
      stories: group.stories.map((story) => story.id === currentStory.id ? { ...story, ...updates } : story),
    })));
  };

  const handleToggleLike = async () => {
    if (!user?.id || !currentStory) return;

    const alreadyLiked = likedStoryIds.includes(currentStory.id);
    const ownerId = currentStory.user_id;

    if (alreadyLiked) {
      const { error } = await supabase.from('story_likes').delete().eq('story_id', currentStory.id).eq('user_id', user.id);
      if (error) {
        toast.error('Could not remove heart right now.');
        return;
      }
      setLikedStoryIds((prev) => prev.filter((id) => id !== currentStory.id));
      bumpCurrentStoryCounts({ likes_count: Math.max(0, Number(currentStory.likes_count || 0) - 1) });
      return;
    }

    const { error } = await supabase.from('story_likes').insert({ story_id: currentStory.id, user_id: user.id });
    if (error) {
      toast.error('Could not heart this story right now.');
      return;
    }

    setLikedStoryIds((prev) => [...prev, currentStory.id]);
    bumpCurrentStoryCounts({ likes_count: Number(currentStory.likes_count || 0) + 1 });

    if (ownerId !== user.id) {
      const shouldNotify = await shouldCreateNotification(supabase, ownerId, 'notif_post_likes');
      if (shouldNotify) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          actor_id: user.id,
          type: 'like',
          title: 'Someone liked your story',
          body: `${displayName} hearted your story.`,
          entity_id: currentStory.id,
          entity_type: 'story',
        });
      }
    }
  };

  const handleSendReply = async () => {
    if (!user?.id || !currentStory || !replyDraft.trim()) return;

    const body = replyDraft.trim();
    setSendingReply(true);
    try {
      const { data, error } = await supabase
        .from('story_replies')
        .insert({ story_id: currentStory.id, user_id: user.id, body })
        .select(`
          id,
          story_id,
          user_id,
          body,
          created_at,
          user_profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      setRepliesByStory((prev) => ({
        ...prev,
        [currentStory.id]: [...(prev[currentStory.id] || []), data as StoryReplyRow],
      }));
      bumpCurrentStoryCounts({ replies_count: Number(currentStory.replies_count || 0) + 1 });
      setReplyDraft('');

      if (currentStory.user_id !== user.id) {
        const shouldNotify = await shouldCreateNotification(supabase, currentStory.user_id, 'notif_comments');
        if (shouldNotify) {
          await supabase.from('notifications').insert({
            user_id: currentStory.user_id,
            actor_id: user.id,
            type: 'chef',
            title: 'New reply on your story',
            body: `${displayName}: ${body.slice(0, 80)}${body.length > 80 ? '…' : ''}`,
            entity_id: currentStory.id,
            entity_type: 'story',
          });
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not send reply right now.');
    } finally {
      setSendingReply(false);
    }
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

          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/75 pointer-events-none" />

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
              {!isOwnCurrentStory ? (
                <div className="relative">
                  <button
                    className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white/90 hover:text-white"
                    onClick={() => setShowStoryActions((prev) => !prev)}
                    aria-label="Story safety actions"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {showStoryActions ? (
                    <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-white/10 bg-black/85 p-1.5 shadow-xl backdrop-blur-md">
                      <button
                        onClick={() => {
                          setShowStoryActions(false);
                          setShowStoryReportModal(true);
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Report story
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
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

          <div className="absolute left-0 right-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-16">
            {currentStory.caption && (
              <div className="mb-2 rounded-2xl bg-black/35 backdrop-blur-md px-4 py-3 text-sm text-white/95 shadow-lg">
                {currentStory.caption}
              </div>
            )}

            <div className="mb-2 rounded-2xl bg-black/30 backdrop-blur-md px-3 py-3 text-white shadow-lg">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRepliesSheet(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-2 text-xs text-white/90 shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {Number(currentStory.replies_count || 0)}
                </button>

                <input
                  type="text"
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSendReply();
                    }
                  }}
                  placeholder="Reply..."
                  className="flex-1 min-w-0 rounded-full bg-black/35 border border-white/12 px-4 py-2.5 text-sm text-white placeholder:text-white/60 outline-none"
                />

                <button
                  onClick={handleToggleLike}
                  className={`inline-flex items-center justify-center rounded-full w-10 h-10 shrink-0 transition-all ${isCurrentStoryLiked ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-white/10 text-white border border-white/10'}`}
                  aria-label={isCurrentStoryLiked ? 'Unlike story' : 'Like story'}
                >
                  <Heart className={`w-4 h-4 ${isCurrentStoryLiked ? 'fill-red-400 text-red-400' : ''}`} />
                </button>

                <button
                  onClick={() => void handleSendReply()}
                  disabled={!replyDraft.trim() || sendingReply}
                  className="rounded-full bg-primary px-4 py-2.5 text-xs font-700 text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingReply ? '...' : 'Send'}
                </button>
              </div>

              <div className="mt-2 flex items-center gap-4 text-[11px] text-white/78 pl-1">
                {isOwnCurrentStory && (
                  <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{Number(currentStory.views_count || 0)} views</span>
                )}
                <span className="inline-flex items-center gap-1"><Heart className={`w-3.5 h-3.5 ${isCurrentStoryLiked ? 'fill-red-500 text-red-500' : ''}`} />{Number(currentStory.likes_count || 0)} hearts</span>
                <button onClick={() => setShowRepliesSheet(true)} className="inline-flex items-center gap-1 text-white/78">
                  <MessageCircle className="w-3.5 h-3.5" />{Number(currentStory.replies_count || 0)} replies
                </button>
              </div>
            </div>
          </div>

          {currentStory ? (
            <ReportContentModal
              isOpen={showStoryReportModal}
              onClose={() => setShowStoryReportModal(false)}
              targetType="story"
              targetId={currentStory.id}
              targetUserId={currentStory.user_id}
              targetLabel="Story"
            />
          ) : null}

          {showRepliesSheet && (
            <div className="absolute inset-0 z-40 flex items-end bg-black/40" onClick={() => setShowRepliesSheet(false)}>
              <div className="w-full rounded-t-3xl bg-zinc-950/96 border-t border-white/10 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] max-h-[50vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-700 text-white">Replies</p>
                  <button onClick={() => setShowRepliesSheet(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/90">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[calc(50vh-84px)] pr-1">
                  {loadingReplies ? (
                    <p className="text-xs text-white/70">Loading replies...</p>
                  ) : currentReplies.length > 0 ? currentReplies.map((reply) => (
                    <div key={reply.id} className="rounded-2xl bg-white/5 px-3 py-2.5 text-sm text-white/90 leading-relaxed">
                      <span className="font-700 mr-1">{reply.user_profiles?.full_name || 'User'}</span>
                      <span>{reply.body}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-white/65">No replies yet. Start the conversation.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
