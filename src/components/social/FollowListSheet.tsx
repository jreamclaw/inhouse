'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type FollowListMode = 'followers' | 'following';

interface FollowListUser {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role?: 'chef' | 'customer' | null;
}

interface FollowListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  mode: FollowListMode;
  title?: string;
  onCountsChange?: (counts: { followers?: number; following?: number }) => void;
}

const PAGE_SIZE = 20;

async function syncFollowerCounts(supabase: ReturnType<typeof createClient>, followerId: string, followingId: string) {
  const [{ count: followingCount }, { count: followersCount }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', followerId),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', followingId),
  ]);

  await Promise.all([
    supabase.from('user_profiles').update({ following_count: followingCount || 0 }).eq('id', followerId),
    supabase.from('user_profiles').update({ followers_count: followersCount || 0 }).eq('id', followingId),
  ]);

  return {
    following: followingCount || 0,
    followers: followersCount || 0,
  };
}

export default function FollowListSheet({
  open,
  onOpenChange,
  userId,
  mode,
  title,
  onCountsChange,
}: FollowListSheetProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [items, setItems] = useState<FollowListUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [followingIds, setFollowingIds] = useState<Record<string, boolean>>({});
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setHasMore(true);
    void loadPage(0, true);
    void loadFollowingMap();
  }, [open, userId, mode]);

  const loadFollowingMap = async () => {
    if (!user?.id) {
      setFollowingIds({});
      return;
    }

    try {
      const { data } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const nextMap: Record<string, boolean> = {};
      (data || []).forEach((row: any) => {
        if (row.following_id) nextMap[row.following_id] = true;
      });
      setFollowingIds(nextMap);
    } catch {
      setFollowingIds({});
    }
  };

  const loadPage = async (offset: number, reset = false) => {
    if (!open) return;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const isFollowers = mode === 'followers';
      const idColumn = isFollowers ? 'follower_id' : 'following_id';
      const relationColumn = isFollowers ? 'follower_id' : 'following_id';

      const { data, error } = await supabase
        .from('user_follows')
        .select(`${relationColumn}, user_profiles:${idColumn} (id, full_name, username, avatar_url, role)`)
        .eq(isFollowers ? 'following_id' : 'follower_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      const mapped = (data || [])
        .map((row: any) => row.user_profiles)
        .filter(Boolean) as FollowListUser[];

      setItems((prev) => (reset ? mapped : [...prev, ...mapped.filter((item) => !prev.some((existing) => existing.id === item.id))]));
      setHasMore(mapped.length === PAGE_SIZE);
    } catch {
      if (reset) setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!normalizedSearch) return items;
    return items.filter((item) => {
      const name = item.full_name?.toLowerCase() || '';
      const username = item.username?.toLowerCase() || '';
      return name.includes(normalizedSearch) || username.includes(normalizedSearch);
    });
  }, [items, normalizedSearch]);

  const handleScroll = async () => {
    const el = listRef.current;
    if (!el || loadingMore || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 120) return;
    await loadPage(items.length, false);
  };

  const handleFollowToggle = async (target: FollowListUser) => {
    if (!user?.id) {
      toast.error('Please sign in to follow people.');
      return;
    }
    if (user.id === target.id || pendingIds[target.id]) return;

    setPendingIds((prev) => ({ ...prev, [target.id]: true }));

    try {
      const isFollowing = !!followingIds[target.id];

      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', target.id);

        if (error) throw error;

        setFollowingIds((prev) => {
          const next = { ...prev };
          delete next[target.id];
          return next;
        });
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: target.id });

        if (error) throw error;

        setFollowingIds((prev) => ({ ...prev, [target.id]: true }));
      }

      const [viewerCounts, targetCounts] = await Promise.all([
        syncFollowerCounts(supabase, user.id, target.id),
        syncFollowerCounts(supabase, user.id, target.id),
      ]);

      if (user.id === userId) {
        onCountsChange?.({ following: viewerCounts.following, followers: viewerCounts.followers });
      }

      if (target.id === userId) {
        onCountsChange?.({ followers: targetCounts.followers, following: targetCounts.following });
      }
    } catch {
      toast.error('Could not update follow status.');
    } finally {
      setPendingIds((prev) => ({ ...prev, [target.id]: false }));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button className="absolute inset-0 bg-black/45" onClick={() => onOpenChange(false)} aria-label="Close follow list" />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl rounded-t-3xl border border-border bg-card shadow-2xl max-h-[82vh] flex flex-col animate-in slide-in-from-bottom-8 duration-200">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-muted absolute left-1/2 -translate-x-1/2 top-2" />
          <h2 className="text-sm font-700 text-foreground">{title || (mode === 'followers' ? 'Followers' : 'Following')}</h2>
          <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${mode}`}
              className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="py-10 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          ) : (
            filteredItems.map((item) => {
              const href = item.role === 'chef' ? `/vendor-profile?id=${item.id}` : `/profile/${item.id}`;
              const isSelf = user?.id === item.id;
              const isFollowing = !!followingIds[item.id];
              const isPending = !!pendingIds[item.id];

              return (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl px-1 py-2">
                  <Link href={href} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                      {item.avatar_url ? (
                        <img src={item.avatar_url} alt={item.full_name || item.username || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-700 text-foreground">{(item.full_name || item.username || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-700 text-foreground truncate">{item.full_name || item.username || 'User'}</p>
                      {item.username && <p className="text-xs text-muted-foreground truncate">@{item.username}</p>}
                    </div>
                  </Link>

                  {!isSelf && (
                    <button
                      onClick={() => handleFollowToggle(item)}
                      disabled={isPending}
                      className={`h-9 px-4 rounded-full text-xs font-semibold transition-colors ${isFollowing ? 'bg-muted text-foreground border border-border' : 'bg-primary text-white'} ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isPending ? '...' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })
          )}

          {loadingMore && (
            <div className="py-3 flex items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading more...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
