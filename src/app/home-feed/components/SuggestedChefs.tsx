'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

interface SuggestedChef {
  id: string;
  name: string;
  username: string;
  avatar: string;
  cuisine: string;
  topMeal: string;
  isFollowing: boolean;
}

export default function SuggestedChefs() {
  const [chefs, setChefs] = useState<SuggestedChef[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    loadChefs();
  }, [user?.id]);

  const toggleFollow = async (chefId: string, chefName: string) => {
    if (!user?.id) {
      toast.error('Please sign in to follow chefs.');
      return;
    }

    const chef = chefs.find((item) => item.id === chefId);
    if (!chef) return;

    try {
      if (chef.isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', chefId);

        if (error) throw error;
        toast(`Unfollowed ${chefName}`, { duration: 2000 });
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: chefId });

        if (error) throw error;
        toast.success(`Following ${chefName}!`, { duration: 3000 });
      }

      await syncFollowerCounts(supabase, user.id, chefId);
      await loadChefs();
    } catch {
      toast.error('Could not update follow status.');
    }
  };

  const loadChefs = async () => {
    setLoading(true);
    try {
      const [{ data, error }, followsResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, full_name, username, avatar_url, bio')
          .eq('role', 'chef')
          .eq('vendor_onboarding_complete', true)
          .limit(6),
        user?.id
          ? supabase.from('user_follows').select('following_id').eq('follower_id', user.id)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (error) throw error;
      const followedIds = new Set((followsResult?.data || []).map((row: any) => row.following_id));

      const mapped = (data || []).map((chef: any) => ({
        id: chef.id,
        name: chef.full_name || 'Chef',
        username: chef.username || 'chef',
        avatar: chef.avatar_url || '/assets/images/no_image.png',
        cuisine: chef.bio?.split('.')[0] || 'Local chef',
        topMeal: 'View menu',
        isFollowing: followedIds.has(chef.id),
      }));

      setChefs(mapped);
    } catch {
      setChefs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sticky top-20 space-y-4">
      {/* Suggested Chefs */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-subtle">
        <h3 className="text-[13px] font-700 text-foreground mb-4 tracking-snug">Suggested Chefs Near You</h3>

        <div className="space-y-0.5">
          {loading ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="flex items-start gap-3 p-2.5 rounded-xl -mx-1 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))
          ) : chefs.length === 0 ? (
            <div className="p-3 rounded-xl bg-muted/30 text-[12px] text-muted-foreground">
              No chefs available yet.
            </div>
          ) : (
            chefs.map((chef) => (
              <div key={chef.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-all duration-200 -mx-1 group">
                <Link href={`/vendor-profile?id=${chef.id}`} className="shrink-0">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border/60 hover:border-primary/40 transition-all duration-200">
                    <img
                      src={chef.avatar}
                      alt={`${chef.name} chef profile avatar`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-amber-400 rounded-full flex items-center justify-center border border-card text-[7px]">
                      👨‍🍳
                    </div>
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/vendor-profile?id=${chef.id}`}>
                        <p className="text-[13px] font-600 text-foreground truncate hover:text-primary transition-colors leading-tight tracking-snug">
                          {chef.name}
                        </p>
                      </Link>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{chef.cuisine}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>Available on InHouse</span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleFollow(chef.id, chef.name)}
                      className={`shrink-0 text-[11px] font-600 px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 ${chef.isFollowing ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : 'bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20'}`}
                    >
                      {chef.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>

                  <div className="mt-2 bg-muted/40 rounded-lg px-2.5 py-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      Next step: <span className="text-foreground font-500">{chef.topMeal}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {chefs.length > 0 && (
          <Link href="/nearby" className="mt-4 block w-full text-center text-[12px] text-primary font-600 hover:text-primary/80 transition-colors duration-150 py-2 rounded-xl hover:bg-primary/5 tracking-snug">
            See more chefs →
          </Link>
        )}
      </div>

      {/* App info */}
      <div className="px-1">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          InHouse connects you with personal chefs in your city. Order home-cooked meals made with love.
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
          {['About', 'Terms', 'Privacy', 'Help', 'Careers'].map((link) => (
            <button key={link} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              {link}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">© 2026 InHouse, Inc.</p>
      </div>
    </div>
  );
}