'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  ShoppingBag,
  ChefHat,
  Play,
  MapPin,
  Flame,
  Clock,
  Zap,
  Users,
  UserPlus,
  X
} from
'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import { PostFeedSkeleton } from '@/components/ui/SkeletonLoaders';
import { useAuth } from '@/contexts/AuthContext';

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


// Availability tag types
type AvailabilityTag = 'available_today' | 'selling_fast' | 'limited_plates' | 'pre_order' | 'trending';

const AVAILABILITY_CONFIG: Record<AvailabilityTag, {label: string;icon: React.ElementType;color: string;}> = {
  available_today: { label: 'Available Today', icon: Clock, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  selling_fast: { label: 'Selling Fast', icon: Flame, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  limited_plates: { label: 'Limited Plates', icon: Zap, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  pre_order: { label: 'Pre-Order Open', icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  trending: { label: '🔥 Trending', icon: Flame, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
};

// Demo content is only shown in explore mode. Local feeds should use real data and empty states.
const MOCK_POSTS = [
{
  id: 'post-1',
  user: {
    id: 'chef-marco',
    name: 'Marco Valentini',
    username: 'chef_marco',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    role: 'chef' as const,
    verified: true
  },
  image: 'https://images.unsplash.com/photo-1685022135825-b74ac61b5e14',
  imageAlt: 'Handmade tagliatelle pasta with truffle cream sauce in a white bowl',
  caption: 'Handmade tagliatelle with black truffle cream sauce 🍝 Every strand rolled by hand this morning. Available for order this weekend — limited slots! Link in bio.',
  likes: 847,
  comments: 42,
  timeAgo: '2h ago',
  location: 'Washington, DC',
  distance: '1.2 miles away',
  isLiked: false,
  isSaved: false,
  mealTag: { name: 'Truffle Tagliatelle', price: 38 },
  type: 'food' as const,
  availability: 'limited_plates' as AvailabilityTag,
  isLocal: true
},
{
  id: 'post-2',
  user: {
    id: 'user-priya',
    name: 'Priya Sharma',
    username: 'priya_eats',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
    role: 'customer' as const,
    verified: false
  },
  image: 'https://images.unsplash.com/photo-1568228780318-159300cb712d',
  imageAlt: 'Colorful Indian thali platter with various curries and breads on a wooden table',
  caption: "Finally tried @chef_aisha\'s Sunday thali and honestly cannot stop thinking about it 😭 The dal makhani alone is worth every penny. 10/10 recommend ordering!",
  likes: 234,
  comments: 18,
  timeAgo: '4h ago',
  location: 'Oakland, CA',
  distance: null,
  isLiked: true,
  isSaved: false,
  mealTag: null,
  type: 'review' as const,
  availability: null,
  isLocal: false
},
{
  id: 'post-3',
  user: {
    id: 'chef-aisha',
    name: 'Aisha Kamara',
    username: 'chef_aisha',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop&crop=face',
    role: 'chef' as const,
    verified: true
  },
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1cdc31a08-1772058323789.png",
  imageAlt: 'Seared salmon fillet with mango salsa and microgreens on a dark slate plate',
  caption: 'New on the menu: Mango Habanero Glazed Salmon 🥭🌶️ Sweet heat, perfectly seared. Inspired by my grandmother\'s West African kitchen. Pre-order opens tomorrow 6PM.',
  likes: 1203,
  comments: 89,
  timeAgo: '6h ago',
  location: 'Washington, DC',
  distance: '3.4 miles away',
  isLiked: false,
  isSaved: true,
  mealTag: { name: 'Mango Habanero Salmon', price: 44 },
  type: 'new_item' as const,
  availability: 'available_today' as AvailabilityTag,
  isLocal: true
},
{
  id: 'post-4',
  user: {
    id: 'chef-luca',
    name: 'Luca Romani',
    username: 'chef_luca',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    role: 'chef' as const,
    verified: true
  },
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1c2b3d236-1767009263868.png",
  imageAlt: 'Neapolitan margherita pizza with fresh basil leaves and mozzarella just out of a wood-fired oven',
  caption: 'The Margherita. Simple. Sacred. My wood-fired oven runs at 485°C for exactly this 🔥 Every Friday night, 8 pizzas only. DM to reserve yours.',
  likes: 2104,
  comments: 156,
  timeAgo: '8h ago',
  location: 'Los Angeles, CA',
  distance: null,
  isLiked: false,
  isSaved: false,
  mealTag: { name: 'Wood-Fired Margherita', price: 28 },
  type: 'food' as const,
  availability: 'selling_fast' as AvailabilityTag,
  isLocal: false,
  isVideo: false
},
{
  id: 'post-5',
  user: {
    id: 'user-zoe',
    name: 'Zoe Thompson',
    username: 'zoe_foodie',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face',
    role: 'customer' as const,
    verified: false
  },
  image: 'https://images.unsplash.com/photo-1457823622778-ccdb4b7aa62d',
  imageAlt: 'Close-up of a beautifully plated chocolate lava cake with vanilla ice cream and berry coulis',
  caption: "Chef Hana\'s chocolate lava cake is ILLEGAL. I\'ve ordered it 4 times this month and I have zero regrets 🍫 Currently melting.",
  likes: 567,
  comments: 31,
  timeAgo: '10h ago',
  location: 'New York, NY',
  distance: null,
  isLiked: false,
  isSaved: false,
  mealTag: null,
  type: 'review' as const,
  availability: null,
  isLocal: false
},
{
  id: 'post-6',
  user: {
    id: 'chef-hana',
    name: 'Hana Matsumoto',
    username: 'chef_hana',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop&crop=face',
    role: 'chef' as const,
    verified: true
  },
  image: 'https://images.unsplash.com/photo-1671399980096-1c2c2f5dcee3',
  imageAlt: 'Elegant Japanese omakase spread with sashimi, maki rolls, and garnishes on a lacquered tray',
  caption: 'Sunday omakase prep ✨ 7 courses, 4 guests, 3 hours of pure focus. This is why I cook. Spots available for next weekend — link in bio to book.',
  likes: 3891,
  comments: 204,
  timeAgo: '14h ago',
  location: 'Washington, DC',
  distance: '2.3 miles away',
  isLiked: true,
  isSaved: true,
  mealTag: { name: 'Sunday Omakase (7 courses)', price: 120 },
  type: 'behind_scenes' as const,
  availability: 'available_today' as AvailabilityTag,
  isLocal: true
},
{
  id: 'post-7',
  user: {
    id: 'chef-carlos',
    name: 'Carlos Mendez',
    username: 'chef_carlos',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=face',
    role: 'chef' as const,
    verified: true
  },
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_145c5dcb6-1772243798514.png",
  imageAlt: 'Authentic Mexican street tacos with carnitas, cilantro, and lime on a wooden board',
  caption: 'Street tacos from scratch 🌮 Slow-braised carnitas, fresh tortillas, and my abuela\'s salsa verde. Food truck at Dupont Circle this Saturday 11AM–3PM.',
  likes: 1456,
  comments: 73,
  timeAgo: '1h ago',
  location: 'Washington, DC',
  distance: '0.8 miles away',
  isLiked: false,
  isSaved: false,
  mealTag: { name: 'Carnitas Taco Plate (3)', price: 18 },
  type: 'food' as const,
  availability: 'selling_fast' as AvailabilityTag,
  isLocal: true
},
{
  id: 'post-8',
  user: {
    id: 'chef-maya',
    name: 'Maya Johnson',
    username: 'chef_maya',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face',
    role: 'chef' as const,
    verified: true
  },
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_10b4c3c0c-1772088181548.png",
  imageAlt: 'Gourmet smash burger with caramelized onions and special sauce on a brioche bun',
  caption: 'The smash burger that broke the internet (at least in my kitchen) 🍔 Double smash, American cheese, caramelized onions, secret sauce. Pop-up this weekend in Chicago!',
  likes: 2890,
  comments: 118,
  timeAgo: '3h ago',
  location: 'Chicago, IL',
  distance: null,
  isLiked: false,
  isSaved: false,
  mealTag: { name: 'Double Smash Burger', price: 22 },
  type: 'food' as const,
  availability: 'trending' as AvailabilityTag,
  isLocal: false
}];


type MockPost = (typeof MOCK_POSTS)[0];

interface DbPostMedia {
  media_url: string;
  media_type: 'image' | 'video';
  sort_order: number;
}

interface DbPost {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  location: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  viewer_has_liked?: { user_id: string }[];
  post_media?: DbPostMedia[];
  user_profiles: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
    role: 'chef' | 'customer';
  } | null;
}

function timeAgoFromDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function dbPostToMockShape(p: DbPost): MockPost {
  const orderedMedia = (p.post_media || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: p.id,
    user: {
      id: p.user_profiles?.id || p.user_id,
      name: p.user_profiles?.full_name || 'Unknown',
      username: p.user_profiles?.username || 'user',
      avatar: p.user_profiles?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
      role: (p.user_profiles?.role || 'customer') as 'chef' | 'customer',
      verified: p.user_profiles?.role === 'chef'
    },
    image: orderedMedia[0]?.media_url || p.media_url,
    imageAlt: p.caption || 'Food post',
    caption: p.caption || '',
    likes: p.likes_count,
    comments: p.comments_count,
    timeAgo: timeAgoFromDate(p.created_at),
    location: p.location,
    distance: null,
    isLiked: Boolean(p.viewer_has_liked && p.viewer_has_liked.length > 0),
    isSaved: false,
    mealTag: null,
    type: 'food' as const,
    availability: null,
    isLocal: true,
    mediaItems: orderedMedia.length > 0 ? orderedMedia : [{ media_url: p.media_url, media_type: p.media_type, sort_order: 0 }],
    ...(p.media_type === 'video' ? { isVideo: true } : {})
  };
}

interface PostCardProps {
  post: MockPost;
  mode: 'local' | 'explore';
  isFollowed?: boolean;
  onFollowToggle?: (userId: string, userName: string) => void;
}

function AvailabilityBadge({ tag }: {tag: AvailabilityTag;}) {
  const config = AVAILABILITY_CONFIG[tag];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>);

}

function PostCard({ post, mode, isFollowed, onFollowToggle }: PostCardProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(post.isSaved);
  const [followed, setFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const [isSaveAnimating, setIsSaveAnimating] = useState(false);
  const [isCartAnimating, setIsCartAnimating] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);

  const handleLike = useCallback(async () => {
    if (!user?.id) {
      toast.error('Please sign in to like posts.');
      return;
    }

    setIsHeartAnimating(true);
    setTimeout(() => setIsHeartAnimating(false), 400);
    const nowLiked = !liked;
    setLikeCount((c) => nowLiked ? c + 1 : Math.max(0, c - 1));
    setLiked(nowLiked);

    try {
      if (nowLiked) {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }

      await supabase
        .from('posts')
        .update({ likes_count: nowLiked ? likeCount + 1 : Math.max(0, likeCount - 1) })
        .eq('id', post.id);

      if (nowLiked) {
        toast.success('❤️ Liked!', {
          description: `You liked ${post.user.name}'s post`,
          duration: 2000
        });
      }
    } catch {
      setLiked(!nowLiked);
      setLikeCount((c) => nowLiked ? Math.max(0, c - 1) : c + 1);
      toast.error('Could not update like.');
    }
  }, [liked, likeCount, post.id, post.user.name, supabase, user?.id]);

  const handleSave = useCallback(() => {
    setIsSaveAnimating(true);
    setTimeout(() => setIsSaveAnimating(false), 400);
    const nowSaved = !saved;
    setSaved(nowSaved);
    if (nowSaved) {
      toast('Saved locally on this device', {
        description: 'Collection sync is not connected yet',
        duration: 2500
      });
    } else {
      toast('Removed local save', {
        description: 'Saved collections are not synced yet',
        duration: 2000
      });
    }
  }, [saved]);

  const handleFollow = useCallback(async () => {
    if (followLoading) return;
    setFollowLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const nowFollowing = !followed;
    setFollowed(nowFollowing);
    setFollowLoading(false);
    if (nowFollowing) {
      toast.success(`✅ Following ${post.user.name}!`, {
        description: "You'll see their new posts in your feed",
        duration: 3000
      });
    } else {
      toast(`Unfollowed ${post.user.name}`, { duration: 2000 });
    }
  }, [followed, followLoading, post.user.name]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: post.user.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('🔗 Link copied to clipboard', { duration: 2000 });
    }
  }, [post]);

  const handleAddToCart = useCallback(() => {
    if (post.mealTag) {
      setIsCartAnimating(true);
      setTimeout(() => setIsCartAnimating(false), 500);
      toast.success(`🛒 ${post.mealTag.name} added to cart!`, {
        description: `$${post.mealTag.price} · From ${post.user.name}`,
        action: {
          label: 'View Menu',
          onClick: () => window.location.href = `/vendor-profile?id=${post.user.id}`
        },
        duration: 4000
      });
    }
  }, [post]);

  const handleComment = useCallback(() => {
    if (!comment.trim()) return;
    toast('Comments are not connected yet', {
      description: 'UI is here, but comment persistence is still pending',
      duration: 2500
    });
    setComment('');
  }, [comment]);

  const typeLabels: Record<string, {label: string;color: string;}> = {
    new_item: { label: '✨ New Menu Item', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    behind_scenes: { label: '🎬 Behind the Scenes', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    food: { label: '', color: '' },
    review: { label: '⭐ Food Review', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
  };

  const typeInfo = typeLabels[post.type] || { label: '', color: '' };

  // Show location label based on mode
  const locationLabel = mode === 'local' ? post.distance : post.location;

  return (
    <article className="bg-card border-b border-border/40 fade-in">
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3.5">
        <Link href={`/vendor-profile?id=${post.user.id}`} className="flex items-center gap-3 group">
          <div
            className={`relative w-[42px] h-[42px] rounded-full overflow-hidden border-[1.5px] transition-all duration-200 group-hover:scale-105 ${
            post.user.role === 'chef' ? 'border-primary/50' : 'border-border group-hover:border-primary/30'}`
            }>
            <img
              src={post.user.avatar}
              alt={`${post.user.name} profile avatar`}
              className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-600 text-foreground group-hover:text-primary transition-colors duration-150 tracking-snug">
                {post.user.name}
              </span>
              {post.user.role === 'chef' &&
              <span className="flex items-center gap-0.5 bg-primary/8 text-primary text-[10px] font-600 px-1.5 py-0.5 rounded-full border border-primary/15">
                  <ChefHat className="w-2.5 h-2.5" />
                  Chef
                </span>
              }
            </div>
            <div className="flex items-center gap-1 text-[12px] text-muted-foreground mt-0.5">
              <span>{post.timeAgo}</span>
              {locationLabel &&
              <>
                  <span className="opacity-30">·</span>
                  <MapPin className="w-3 h-3 opacity-50" />
                  <span className={mode === 'local' && post.distance ? 'text-primary font-500' : ''}>{locationLabel}</span>
                </>
              }
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {post.user.role === 'chef' &&
          <button
            onClick={() => onFollowToggle?.(post.user.id, post.user.name)}
            className={`text-[12px] font-600 px-3.5 py-1.5 rounded-full transition-all duration-150 active:scale-95 ${
              isFollowed
                ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-border'
                : 'text-primary border border-primary/20 hover:bg-primary hover:text-white hover:border-primary'
            }`}
          >
            {isFollowed ? 'Following' : 'Follow'}
          </button>
          }
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-all duration-150"
            aria-label="More options">
            <MoreHorizontal className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Badges row: type + availability */}
      {(typeInfo.label || post.availability) &&
      <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
          {typeInfo.label &&
        <span className={`text-[11px] font-600 px-2.5 py-1 rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>
        }
          {post.availability && <AvailabilityBadge tag={post.availability} />}
        </div>
      }

      {/* Post Image */}
      <div className="relative aspect-square overflow-hidden bg-muted mx-0">
        {((post as any).mediaItems?.[mediaIndex]?.media_type === 'video') ?
        <video src={(post as any).mediaItems?.[mediaIndex]?.media_url || post.image} className="w-full h-full object-cover" muted loop playsInline controls /> :
        <img src={(post as any).mediaItems?.[mediaIndex]?.media_url || post.image} alt={post.imageAlt} className="w-full h-full object-cover" loading="lazy" />
        }
        {((post as any).mediaItems?.length || 0) > 1 && <><button onClick={() => setMediaIndex((i) => Math.max(0, i - 1))} disabled={mediaIndex === 0} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white disabled:opacity-30">?</button><button onClick={() => setMediaIndex((i) => Math.min(((post as any).mediaItems?.length || 1) - 1, i + 1))} disabled={mediaIndex === ((post as any).mediaItems?.length || 1) - 1} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white disabled:opacity-30">?</button><div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-600 px-2 py-1 rounded-full">{mediaIndex + 1}/{(post as any).mediaItems?.length}</div></>}

        {/* Meal tag overlay */}
        {post.mealTag &&
        <button
          onClick={handleAddToCart}
          className={`absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-sm font-500 hover:bg-black/75 active:scale-95 transition-all duration-150 shadow-lg ${isCartAnimating ? 'scale-110' : ''}`}>
            <ShoppingBag className={`w-3.5 h-3.5 transition-transform duration-200 ${isCartAnimating ? 'animate-bounce' : ''}`} />
            <span className="text-[13px]">{post.mealTag.name}</span>
            <span className="font-tabular font-700 text-amber-300 text-[13px]">${post.mealTag.price}</span>
          </button>
        }

        {/* Explore mode: city label */}
        {mode === 'explore' && post.location && !post.isLocal &&
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs font-600 px-2.5 py-1 rounded-full">
            <MapPin className="w-3 h-3" />
            {post.location}
          </div>
        }

        {/* Video indicator */}
        {(post as any).isVideo &&
        <div className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
        }
      </div>

      {/* Engagement Bar */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-0">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 group p-2 -ml-2 rounded-full hover:bg-muted/60 transition-colors"
              aria-label={liked ? 'Unlike post' : 'Like post'}>
              <Heart
                className={`w-[22px] h-[22px] transition-all duration-200 group-hover:scale-125 ${
                isHeartAnimating ? 'scale-150' : ''} ${
                liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground group-hover:text-red-400'}`} />
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="p-2 group rounded-full hover:bg-muted/60 transition-colors"
              aria-label="Toggle comments">
              <MessageCircle className="w-[22px] h-[22px] text-muted-foreground group-hover:text-foreground transition-colors duration-150" />
            </button>
            <button onClick={handleShare} className="p-2 group rounded-full hover:bg-muted/60 transition-colors" aria-label="Share post">
              <Share2 className="w-[22px] h-[22px] text-muted-foreground group-hover:text-foreground transition-colors duration-150" />
            </button>
          </div>

          <button onClick={handleSave} className="p-2 group rounded-full hover:bg-muted/60 transition-colors" aria-label={saved ? 'Unsave post' : 'Save post'}>
            <Bookmark
              className={`w-[22px] h-[22px] transition-all duration-200 group-hover:scale-110 ${
              isSaveAnimating ? 'scale-125' : ''} ${
              saved ? 'fill-foreground text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
          </button>
        </div>

        {/* Likes count */}
        <p className="text-[13px] font-700 text-foreground mb-1.5 font-tabular tracking-snug">
          {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
        </p>

        {/* Caption */}
        <p className="text-[13px] text-foreground leading-relaxed">
          <Link href={`/vendor-profile?id=${post.user.id}`} className="font-700 hover:underline mr-1 tracking-snug">
            {post.user.username}
          </Link>
          {post.caption}
        </p>

        {/* Comments count toggle */}
        {post.comments > 0 &&
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-[13px] text-muted-foreground mt-2 hover:text-foreground transition-colors">
            View all {post.comments} comments
          </button>
        }

        {/* Comment input */}
        {showComments &&
        <CommentInput comment={comment} setComment={setComment} handleComment={handleComment} />
        }

        {/* Order from chef CTA */}
        {post.user.role === 'chef' && post.mealTag &&
        <div className="mt-3.5 pt-3.5 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="w-3.5 h-3.5 text-primary" />
                <span className="text-[13px] text-muted-foreground">
                  From <span className="font-600 text-foreground">{post.user.name}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/vendor-profile?id=${post.user.id}`}>
                  <button className="text-[12px] font-600 text-primary hover:underline">View Menu</button>
                </Link>
                <Link href={`/vendor-profile?id=${post.user.id}`}>
                  <button
                  onClick={handleAddToCart}
                  className={`flex items-center gap-1.5 bg-primary text-white text-[12px] font-600 px-4 py-2 rounded-full hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-95 transition-all duration-150 shadow-sm shadow-primary/15 ${isCartAnimating ? 'scale-105' : ''}`}>
                    <ShoppingBag className={`w-3.5 h-3.5 ${isCartAnimating ? 'animate-bounce' : ''}`} />
                    Order Now
                  </button>
                </Link>
              </div>
            </div>
          </div>
        }
      </div>
    </article>);

}

interface CommentInputProps {
  comment: string;
  setComment: (v: string) => void;
  handleComment: () => void;
}

function CommentInput({ comment, setComment, handleComment }: CommentInputProps) {
  const { profile, user } = useAuth();
  const avatarUrl = profile?.avatar_url || null;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="mt-3 flex items-center gap-2.5 fade-in">
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-border bg-muted flex items-center justify-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${displayName} profile avatar`}
            className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] font-700 text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 flex items-center bg-muted rounded-full px-3.5 py-2 gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleComment()}
          placeholder="Add a comment..."
          className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none" />
        {comment.trim() &&
          <button
            onClick={handleComment}
            className="text-[13px] font-600 text-primary hover:text-primary/80 transition-colors shrink-0">
            Post
          </button>
        }
      </div>
    </div>
  );
}

interface PostFeedProps {
  mode: 'local' | 'explore';
}

export default function PostFeed({ mode }: PostFeedProps) {
  const [dbPosts, setDbPosts] = useState<MockPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const [showInviteBanner, setShowInviteBanner] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    loadDbPosts();
    if (user?.id) {
      loadFollowedUsers();
    }
  }, [user?.id]);

  const loadDbPosts = async () => {
    try {
      const { data, error } = await supabase.
      from('posts').
      select(
        `
          *,
          user_profiles (
            id,
            full_name,
            username,
            avatar_url,
            role
          ),
          post_media (
            media_url,
            media_type,
            sort_order
          )
        `
      ).
      order('created_at', { ascending: false }).
      limit(20);

      if (error) throw error;
      if (data && data.length > 0) {
        let likedPostIds = new Set<string>();
        if (user?.id) {
          const { data: likesData } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id);
          likedPostIds = new Set((likesData || []).map((row: any) => row.post_id));
        }

        setDbPosts((data as DbPost[]).map((post) => dbPostToMockShape({
          ...post,
          viewer_has_liked: likedPostIds.has(post.id) ? [{ user_id: user?.id || '' }] : [],
        })));
      } else {
        setDbPosts([]);
      }
    } catch {
      setDbPosts([]);
    } finally {setLoading(false);}
  };

  const loadFollowedUsers = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;
      setFollowedUserIds(new Set((data || []).map((row: any) => row.following_id)));
    } catch {
      setFollowedUserIds(new Set());
    }
  };

  const handleFollowToggle = async (userId: string, userName: string) => {
    if (!user?.id) {
      toast.error('Please sign in to follow chefs.');
      return;
    }

    const currentlyFollowing = followedUserIds.has(userId);

    try {
      if (currentlyFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
        toast(`Unfollowed ${userName}`, { duration: 2000 });
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: userId });

        if (error) throw error;
        toast.success(`Following ${userName}!`, { duration: 3000 });
      }

      await syncFollowerCounts(supabase, user.id, userId);
      await loadFollowedUsers();
    } catch {
      toast.error('Could not update follow status.');
    }
  };

  const localPosts = dbPosts;
  const explorePosts = dbPosts.filter((p) => !p.isLocal);

  // Filter posts based on mode
  const modePosts = mode === 'local' ? localPosts : explorePosts;

  // Filter by following if selected
  const filteredPosts = feedFilter === 'following' && followedUserIds.size > 0
    ? modePosts.filter((p) => followedUserIds.has(p.user.id))
    : modePosts;

  if (loading) {
    return <PostFeedSkeleton count={3} />;
  }

  return (
    <div>
      {/* Feed filter tabs */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-border/40 bg-card">
        <button
          onClick={() => setFeedFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-600 transition-all duration-150 ${
            feedFilter === 'all' ?'bg-primary text-white shadow-sm shadow-primary/20' :'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          For You
        </button>
        <button
          onClick={() => setFeedFilter('following')}
          className={`px-4 py-1.5 rounded-full text-sm font-600 transition-all duration-150 ${
            feedFilter === 'following' ?'bg-primary text-white shadow-sm shadow-primary/20' :'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Following
          {followedUserIds.size > 0 && (
            <span className="ml-1.5 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-700">
              {followedUserIds.size}
            </span>
          )}
        </button>
      </div>

      {/* Invite Friends Banner */}
      {showInviteBanner && (
        <div className="mx-4 mt-3 mb-1 flex items-center gap-3 bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20 rounded-2xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <UserPlus className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-700 text-foreground tracking-snug">Invite friends & earn rewards</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Share InHouse with friends and get exclusive perks</p>
          </div>
          <Link href="/invite">
            <button className="text-[12px] font-600 bg-primary text-white px-3.5 py-1.5 rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-150 shrink-0">
              Invite
            </button>
          </Link>
          <button
            onClick={() => setShowInviteBanner(false)}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors shrink-0 ml-0.5"
            aria-label="Dismiss invite banner"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Explore mode header */}
      {mode === 'explore' &&
      <div className="px-4 py-4 bg-gradient-to-r from-primary/5 to-amber-500/5 border-b border-border/40">
          <p className="text-sm font-700 text-foreground tracking-snug">🌎 Trending Globally</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">Discover real chefs from cities across the country</p>
        </div>
      }

      {filteredPosts.length === 0 ?
      <div className="py-16 flex flex-col items-center gap-0 text-center px-6">
          {feedFilter === 'following' && followedUserIds.size === 0 ? (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <Users className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="text-base font-700 text-foreground mb-2">Follow chefs to see their posts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-xs">
                Tap <span className="font-600 text-primary">Follow</span> on any chef's post to build your personalized feed. Follows now sync to your account.
              </p>
              <button
                onClick={() => setFeedFilter('all')}
                className="flex items-center gap-2 bg-primary text-white text-sm font-600 px-5 py-2.5 rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-sm shadow-primary/20"
              >
                Browse All Posts
              </button>
            </>
          ) : feedFilter === 'following' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <ChefHat className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="text-base font-700 text-foreground mb-2">No posts from people you follow</h3>
              <p className="text-sm text-muted-foreground mb-4">The chefs you follow haven't posted in this location yet.</p>
              <button
                onClick={() => setFeedFilter('all')}
                className="flex items-center gap-2 bg-primary text-white text-sm font-600 px-5 py-2.5 rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-150"
              >
                See All Posts
              </button>
            </>
          ) : mode === 'local' ?
        <>
              {/* Illustration */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <ChefHat className="w-10 h-10 text-primary/60" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center border-2 border-card">
                  <Heart className="w-3.5 h-3.5 text-amber-500" />
                </div>
              </div>
              <h3 className="text-base font-700 text-foreground mb-2">Your local feed is empty</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
                No real posts yet. Try another city or browse explore while chefs in this area start posting.
              </p>
              <div className="w-full max-w-xs space-y-2.5">
                <Link href="/nearby" className="block">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15 hover:bg-primary/10 hover:border-primary/30 transition-all duration-150 active:scale-[0.98] text-left">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-700 text-foreground">Discover nearby chefs</p>
                      <p className="text-xs text-muted-foreground">Find chefs cooking in your area</p>
                    </div>
                  </div>
                </Link>
                <button
              onClick={() => {
                const event = new CustomEvent('switchToExplore');
                window.dispatchEvent(event);
              }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all duration-150 active:scale-[0.98] text-left">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Zap className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-700 text-foreground">Explore trending chefs</p>
                    <p className="text-xs text-muted-foreground">See what's popular nationwide</p>
                  </div>
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-6">
                Tap <span className="font-600 text-primary">Follow</span> on any chef's post to add them to your feed
              </p>
            </> :

        <>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
                <span className="text-3xl">🌎</span>
              </div>
              <h3 className="text-base font-700 text-foreground mb-2">No trending chefs right now</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Check back soon — top chefs from across the country will appear here.
              </p>
              <Link href="/nearby">
                <button className="flex items-center gap-2 bg-primary text-white text-sm font-600 px-5 py-2.5 rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-sm shadow-primary/20">
                  <MapPin className="w-4 h-4" />
                  Browse nearby instead
                </button>
              </Link>
            </>
          }
        </div> :

      filteredPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          mode={mode}
          isFollowed={followedUserIds.has(post.user.id)}
          onFollowToggle={handleFollowToggle}
        />
      ))
      }

      {/* Load more indicator */}
      {filteredPosts.length > 0 &&
      <div className="py-8 flex justify-center">
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-muted">
            Load more posts
          </button>
        </div>
      }
    </div>);

}