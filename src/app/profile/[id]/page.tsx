'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChefHat, Heart, Loader2, MapPin, Share2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PublicProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  role: 'chef' | 'customer' | null;
  followers_count: number | null;
  following_count: number | null;
  privacy_show_location?: boolean | null;
  privacy_public_profile?: boolean | null;
  privacy_show_activity?: boolean | null;
}

interface PublicPost {
  id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  likes_count?: number | null;
  comments_count?: number | null;
}

async function syncFollowerCounts(supabase: ReturnType<typeof createClient>, followerId: string, followingId: string) {
  const [{ count: followingCount }, { count: followersCount }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', followerId),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', followingId),
  ]);

  await Promise.all([
    supabase.from('user_profiles').update({ following_count: followingCount || 0 }).eq('id', followerId),
    supabase.from('user_profiles').update({ followers_count: followersCount || 0 }).eq('id', followingId),
  ]);
}

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const profileId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const supabase = createClient();
  const { user, profile: currentProfile } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = !!user?.id && !!profileId && user.id === profileId;

  useEffect(() => {
    if (!profileId) return;
    void loadProfile();
  }, [profileId, user?.id]);

  const loadProfile = async () => {
    if (!profileId) return;

    setLoading(true);
    setNotFound(false);

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, username, avatar_url, cover_url, bio, location, role, followers_count, following_count, privacy_show_location, privacy_public_profile, privacy_show_activity')
        .eq('id', profileId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setProfile(null);
        setNotFound(true);
        setPosts([]);
        return;
      }

      const nextProfile = data as PublicProfile;

      if (isOwnProfile) {
        router.replace('/profile-screen');
        return;
      }

      if (nextProfile.role === 'chef') {
        router.replace(`/vendor-profile?id=${nextProfile.id}`);
        return;
      }

      setProfile(nextProfile);

      if (nextProfile.privacy_public_profile === false) {
        setPosts([]);
      } else {
        await loadPosts(nextProfile.id, nextProfile.privacy_show_activity !== false);
      }

      if (user?.id) {
        await loadFollowState(nextProfile.id);
      } else {
        setIsFollowing(false);
      }
    } catch {
      setProfile(null);
      setPosts([]);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (targetId: string, canShowPosts: boolean) => {
    if (!canShowPosts) {
      setPosts([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, caption, media_url, media_type, created_at, likes_count, comments_count')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setPosts((data || []) as PublicPost[]);
    } catch {
      setPosts([]);
    }
  };

  const loadFollowState = async (targetId: string) => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetId)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch {
      setIsFollowing(false);
    }
  };

  const handleFollow = async () => {
    if (!profile?.id) return;
    if (!user?.id) {
      toast.error('Please sign in to follow people.');
      return;
    }
    if (user.id === profile.id) return;
    if (followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);

        if (error) throw error;
        setIsFollowing(false);
        toast(`Unfollowed ${profile.full_name || profile.username || 'user'}`, { duration: 2000 });
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: profile.id });

        if (error) throw error;

        const { data: profileSettings } = await supabase
          .from('user_settings')
          .select('notif_new_follower')
          .eq('user_id', profile.id)
          .maybeSingle();

        if ((profileSettings as any)?.notif_new_follower !== false) {
          await supabase.from('notifications').insert({
            user_id: profile.id,
            actor_id: user.id,
            type: 'follow',
            title: 'New follower',
            body: `${currentProfile?.full_name || 'Someone'} started following you.`,
            entity_id: user.id,
            entity_type: 'user_profile',
          });
        }

        setIsFollowing(true);
        toast.success(`Following ${profile.full_name || profile.username || 'user'}!`);
      }

      await syncFollowerCounts(supabase, user.id, profile.id);
      await loadProfile();
    } catch {
      toast.error('Could not update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  const initials = useMemo(() => (profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase(), [profile?.full_name, profile?.username]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading profile...
          </div>
        </div>
      </AppLayout>
    );
  }

  if (notFound || !profile) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/search" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to search
          </Link>
          <div className="rounded-3xl border border-border bg-card p-6 text-center">
            <p className="text-base font-700 text-foreground">Profile not found</p>
            <p className="text-sm text-muted-foreground mt-2">This user page is unavailable right now.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const displayName = profile.full_name || profile.username || 'User';
  const locationLabel = profile.privacy_show_location === false ? 'Location private' : (profile.location || 'Location unavailable');
  const canShowPosts = profile.privacy_public_profile !== false && profile.privacy_show_activity !== false;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-24">
        <div className="relative h-44 bg-muted overflow-hidden">
          {profile.cover_url ? (
            <img src={profile.cover_url} alt={`${displayName} cover`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
          <Link href="/search" className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <button
            onClick={() => toast.success('Profile link copied!')}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            aria-label="Share profile"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4">
          <div className="-mt-10 relative z-10 mb-4 flex items-end gap-4">
            <div className="w-20 h-20 rounded-3xl overflow-hidden border-4 border-card bg-card shadow-lg flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-700 text-foreground">{initials}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="rounded-2xl bg-card border border-border px-4 py-3 text-center">
                <p className="text-lg font-700 text-foreground">{profile.followers_count ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Followers</p>
              </div>
              <div className="rounded-2xl bg-card border border-border px-4 py-3 text-center">
                <p className="text-lg font-700 text-foreground">{profile.following_count ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Following</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-700 text-foreground">{displayName}</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${profile.role === 'chef' ? 'bg-orange-500/10 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                  {profile.role === 'chef' ? <ChefHat className="w-3 h-3" /> : <UserRound className="w-3 h-3" />}
                  {profile.role === 'chef' ? 'Chef' : 'User'}
                </span>
              </div>
              {profile.username && <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{locationLabel}</span>
            </div>

            <p className="text-sm text-foreground leading-relaxed">{profile.bio || 'No bio yet.'}</p>

            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`w-full h-11 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isFollowing ? 'bg-muted text-foreground border border-border' : 'bg-primary text-white hover:bg-primary/90'} ${followLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          <div className="mt-4 rounded-3xl border border-border bg-card p-5">
            <div className="mb-4">
              <h2 className="text-base font-700 text-foreground">Posts</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {canShowPosts ? 'Recent public posts from this user.' : 'This user keeps activity private.'}
              </p>
            </div>

            {!canShowPosts ? (
              <div className="rounded-2xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                Activity is private for this profile.
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                No public posts yet.
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-2xl border border-border overflow-hidden">
                    {post.media_url ? (
                      <div className="aspect-square bg-muted">
                        {post.media_type === 'video' ? (
                          <video src={post.media_url} className="w-full h-full object-cover" controls />
                        ) : (
                          <img src={post.media_url} alt={post.caption || 'User post'} className="w-full h-full object-cover" />
                        )}
                      </div>
                    ) : null}
                    <div className="p-4 space-y-2">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{post.caption || 'No caption'}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        <span>{post.likes_count || 0} likes</span>
                        <span>{post.comments_count || 0} comments</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
