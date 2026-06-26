'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Eye, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

interface ProfileStoryAvatarProps {
  userId?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  sizeClassName?: string;
  ringClassName?: string;
  innerClassName?: string;
  fallbackClassName?: string;
  fallbackTextClassName?: string;
  roundedClassName?: string;
  borderClassName?: string;
  showAddBadge?: boolean;
  onAddStory?: () => void;
}

export default function ProfileStoryAvatar({
  userId,
  displayName,
  avatarUrl,
  sizeClassName = 'w-20 h-20',
  ringClassName = 'p-[2.5px]',
  innerClassName = 'ring-[2px] ring-card',
  fallbackClassName = 'bg-gradient-to-br from-violet-400 to-purple-500',
  fallbackTextClassName = 'text-white text-2xl font-bold',
  roundedClassName = 'rounded-full',
  borderClassName = '',
  showAddBadge = false,
  onAddStory,
}: ProfileStoryAvatarProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedStoryIds, setLikedStoryIds] = useState<string[]>([]);
  const [replyDraft, setReplyDraft] = useState('');
  const [repliesByStory, setRepliesByStory] = useState<Record<string, StoryReplyRow[]>>({});
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [showRepliesSheet, setShowRepliesSheet] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void loadStories();
  }, [userId]);

  useEffect(() => {
    if (!user?.id) return;
    void loadLikedStories();
  }, [user?.id]);

  useEffect(() => {
    const storyId = stories[activeIndex]?.id;
    if (!viewerOpen || !storyId || !user?.id) return;
    void registerStoryView(storyId);
    void loadReplies(storyId);
  }, [viewerOpen, activeIndex, stories, user?.id]);

  const currentStory = stories[activeIndex] || null;
  const hasStories = stories.length > 0;
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < stories.length - 1;
  const isCurrentStoryLiked = currentStory ? likedStoryIds.includes(currentStory.id) : false;
  const currentReplies = currentStory ? repliesByStory[currentStory.id] || [] : [];
  const isOwnCurrentStory = Boolean(currentStory && user?.id && currentStory.user_id === user.id);

  const initial = useMemo(() => displayName?.charAt(0)?.toUpperCase() || 'U', [displayName]);

  const loadStories = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, caption, created_at, expires_at, views_count, likes_count, replies_count')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      setStories([]);
      return;
    }

    setStories((data as StoryRow[] | null) || []);
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

    if (!error) {
      setStories((prev) => prev.map((story) => story.id === storyId ? { ...story, views_count: Number(story.views_count || 0) + 1 } : story));
    }
  };

  const handleOpen = () => {
    if (hasStories) {
      setActiveIndex(Math.max(0, stories.length - 1));
      setViewerOpen(true);
      setShowRepliesSheet(false);
      return;
    }

    if (showAddBadge && onAddStory) {
      onAddStory();
    }
  };

  const bumpCurrentStoryCounts = (updates: Partial<Pick<StoryRow, 'views_count' | 'likes_count' | 'replies_count'>>) => {
    if (!currentStory) return;
    setStories((prev) => prev.map((story) => story.id === currentStory.id ? { ...story, ...updates } : story));
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

  return (
    <>
      <button type="button" onClick={handleOpen} className="relative shrink-0" aria-label={hasStories ? `View ${displayName}'s story` : undefined}>
        <div className={`${sizeClassName} ${roundedClassName} ${hasStories ? `bg-gradient-to-br from-fuchsia-500 via-orange-400 to-amber-300 ${ringClassName}` : ''} ${!hasStories ? borderClassName : ''}`}>
          <div className={`w-full h-full ${roundedClassName} overflow-hidden bg-card flex items-center justify-center ${innerClassName}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${displayName} avatar`} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${fallbackClassName} ${fallbackTextClassName}`}>
                {initial}
              </div>
            )}
          </div>
        </div>
        {showAddBadge && !hasStories && (
          <div className="absolute bottom-0.5 right-0.5 w-[22px] h-[22px] bg-primary rounded-full flex items-center justify-center border-[2px] border-card shadow-sm">
            <Plus className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
      </button>

      {viewerOpen && currentStory && (
        <div className="fixed inset-0 z-[80] bg-black">
          <div className="absolute inset-0">
            {currentStory.media_type === 'video' ? (
              <video key={currentStory.id} src={currentStory.media_url} className="w-full h-full object-cover bg-black" autoPlay muted playsInline />
            ) : (
              <img src={currentStory.media_url} alt={currentStory.caption || `${displayName} story`} className="w-full h-full object-cover bg-black" />
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/75 pointer-events-none" />

          <div className="absolute top-0 inset-x-0 z-10 px-3 pt-[max(env(safe-area-inset-top),12px)] pb-4 pointer-events-none">
            <div className="flex gap-1 mb-3">
              {stories.map((story, idx) => (
                <div key={story.id} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${idx <= activeIndex ? 'bg-white' : 'bg-transparent'}`} />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0 ring-2 ring-white/20">
                {avatarUrl ? <img src={avatarUrl} alt={`${displayName} avatar`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{initial}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-700 text-white truncate">{displayName}</p>
                <p className="text-xs text-white/75">{new Date(currentStory.created_at).toLocaleString()}</p>
              </div>
              <button className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white/90 hover:text-white" onClick={() => setViewerOpen(false)} aria-label="Close story viewer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="absolute inset-0 z-20 flex">
            <button type="button" aria-label="Previous story" onClick={() => canGoPrev && setActiveIndex((idx) => Math.max(0, idx - 1))} className="flex-1 h-full bg-transparent" />
            <button type="button" aria-label="Next story" onClick={() => canGoNext ? setActiveIndex((idx) => Math.min(stories.length - 1, idx + 1)) : setViewerOpen(false)} className="flex-1 h-full bg-transparent" />
          </div>

          <div className="absolute left-0 right-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-16">
            {currentStory.caption && (
              <div className="mb-2 rounded-2xl bg-black/35 backdrop-blur-md px-4 py-3 text-sm text-white/95 shadow-lg">
                {currentStory.caption}
              </div>
            )}

            <div className="mb-2 rounded-2xl bg-black/30 backdrop-blur-md px-3 py-3 text-white shadow-lg">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowRepliesSheet(true)} className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-2 text-xs text-white/90 shrink-0">
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

                <button onClick={handleToggleLike} className={`inline-flex items-center justify-center rounded-full w-10 h-10 shrink-0 transition-all ${isCurrentStoryLiked ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-white/10 text-white border border-white/10'}`} aria-label={isCurrentStoryLiked ? 'Unlike story' : 'Like story'}>
                  <Heart className={`w-4 h-4 ${isCurrentStoryLiked ? 'fill-red-400 text-red-400' : ''}`} />
                </button>

                <button onClick={() => void handleSendReply()} disabled={!replyDraft.trim() || sendingReply} className="rounded-full bg-primary px-4 py-2.5 text-xs font-700 text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
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

          {showRepliesSheet && (
            <div className="absolute inset-0 z-40 flex items-end bg-black/40" onClick={() => setShowRepliesSheet(false)}>
              <div className="w-full rounded-t-3xl bg-zinc-950/96 border-t border-white/10 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] max-h-[50vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center mb-3"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-700 text-white">Replies</p>
                  <button onClick={() => setShowRepliesSheet(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/90"><X className="w-4 h-4" /></button>
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
