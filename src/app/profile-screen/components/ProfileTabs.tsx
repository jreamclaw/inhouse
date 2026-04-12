'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Grid3X3, UtensilsCrossed, Info, Heart, Plus, Pencil, Package, DollarSign, Clock, Settings, Bookmark, ChevronDown, ChefHat, MapPin, ShieldCheck, BadgeCheck, X, MessageCircle, Trash2 } from 'lucide-react';
import CustomerOrdersTab from './CustomerOrdersTab';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PostFeedSkeleton } from '@/components/ui/SkeletonLoaders';

interface DbPostMedia {
  media_url: string;
  media_type: 'image' | 'video';
  sort_order: number;
}

interface DbPost {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  media_type?: 'image' | 'video';
  likes_count: number;
  comments_count?: number;
  created_at: string;
  post_media?: DbPostMedia[];
  tagged_users?: Array<{
    id: string;
    full_name: string | null;
    username: string | null;
  }>;
}

interface DbComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  user_profiles?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
}

function inferMediaTypeFromUrl(url?: string | null): 'image' | 'video' {
  const value = (url || '').toLowerCase();
  return /\.(mp4|mov|webm|m4v)(\?|$)/.test(value) ? 'video' : 'image';
}

function getOrderedPostMedia(post: Pick<DbPost, 'post_media' | 'media_url' | 'media_type'>) {
  const orderedMedia = (post.post_media || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  return orderedMedia.length > 0
    ? orderedMedia
    : [{ media_url: post.media_url, media_type: post.media_type || inferMediaTypeFromUrl(post.media_url), sort_order: 0 }];
}

interface DbMeal {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  available: boolean;
}

interface DbSavedPost {
  id: string;
  created_at: string;
  posts: {
    id: string;
    caption: string | null;
    media_url: string;
    media_type: 'image' | 'video';
    likes_count: number;
    user_id: string;
    post_media?: DbPostMedia[];
  } | null;
}

interface SavedVendor {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  followers_count: number | null;
  following_id: string;
}

type CartItem = { id: string; title: string; price: number; qty: number };

export default function ProfileTabs() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const isVendor = profile?.role === 'chef';
  const isOwnProfile = true;

  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || (isVendor ? 'posts' : 'posts'));
  const [cart, setCart] = useState<CartItem[]>([]);

  const [dbPosts, setDbPosts] = useState<DbPost[]>([]);
  const [dbMeals, setDbMeals] = useState<DbMeal[]>([]);
  const [savedPosts, setSavedPosts] = useState<DbSavedPost[]>([]);
  const [savedVendors, setSavedVendors] = useState<SavedVendor[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vendorToolsOpen, setVendorToolsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<DbPost | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, DbComment[]>>({});
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const viewerScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !isVendor) return;
    const saved = window.localStorage.getItem('inhouse_vendor_tools_open');
    if (saved === 'true') setVendorToolsOpen(true);
  }, [isVendor]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isVendor) return;
    window.localStorage.setItem('inhouse_vendor_tools_open', vendorToolsOpen ? 'true' : 'false');
  }, [vendorToolsOpen, isVendor]);

  const requestedTab = searchParams.get('tab');
  const refreshKey = searchParams.get('refresh');

  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    if (user?.id) {
      loadPosts();
      if (isVendor) loadMeals();
      if (!isVendor) {
        loadSavedPosts();
        loadSavedVendors();
      }
    }
  }, [user?.id, isVendor, refreshKey]);

  const loadPosts = async () => {
    if (!user?.id) return;
    setPostsLoading(true);
    try {
      const basePostSelect = `
        id,
        user_id,
        media_url,
        caption,
        likes_count,
        comments_count,
        created_at
      `;

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(basePostSelect)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const posts = (postsData || []) as DbPost[];
      if (posts.length === 0) {
        setDbPosts([]);
        return;
      }

      const postIds = posts.map((post) => post.id);
      let mediaByPostId = new Map<string, DbPostMedia[]>();

      try {
        const { data: mediaRows, error: mediaError } = await supabase
          .from('post_media')
          .select('post_id, media_url, media_type, sort_order')
          .in('post_id', postIds)
          .order('sort_order', { ascending: true });

        if (!mediaError && Array.isArray(mediaRows)) {
          mediaByPostId = mediaRows.reduce((map, row: any) => {
            const existing = map.get(row.post_id) || [];
            existing.push({
              media_url: row.media_url,
              media_type: row.media_type,
              sort_order: row.sort_order ?? 0,
            });
            map.set(row.post_id, existing);
            return map;
          }, new Map<string, DbPostMedia[]>());
        }
      } catch {
        // keep posts even if post_media lookup fails
      }

      let tagsByPostId = new Map<string, Array<{ id: string; full_name: string | null; username: string | null }>>();

      try {
        const { data: tagRows, error: tagError } = await supabase
          .from('post_tags')
          .select(`
            post_id,
            tagged_profile:tagged_user_id (
              id,
              full_name,
              username
            )
          `)
          .in('post_id', postIds);

        if (!tagError && Array.isArray(tagRows)) {
          tagsByPostId = tagRows.reduce((map, row: any) => {
            const tagged = Array.isArray(row.tagged_profile) ? row.tagged_profile[0] : row.tagged_profile;
            if (!tagged?.id) return map;
            const existing = map.get(row.post_id) || [];
            existing.push({ id: tagged.id, full_name: tagged.full_name || null, username: tagged.username || null });
            map.set(row.post_id, existing);
            return map;
          }, new Map<string, Array<{ id: string; full_name: string | null; username: string | null }>>());
        }
      } catch {
        // keep posts even if tag lookup fails
      }

      const mergedPosts = posts.map((post) => ({
        ...post,
        media_type: post.media_type || inferMediaTypeFromUrl(post.media_url),
        post_media: mediaByPostId.get(post.id) || [],
        tagged_users: tagsByPostId.get(post.id) || [],
      }));
      setDbPosts(mergedPosts);
    } catch {
      setDbPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadSavedPosts = async () => {
    if (!user?.id) return;
    setSavedLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select(`
          id,
          created_at,
          posts:post_id (
            id,
            caption,
            media_url,
            media_type,
            likes_count,
            user_id,
            post_media (
              media_url,
              media_type,
              sort_order
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setSavedPosts(data as DbSavedPost[]);
    } catch {
      // no-op
    } finally {
      setSavedLoading(false);
    }
  };

  const loadSavedVendors = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          following_id,
          user_profiles:following_id (
            id,
            full_name,
            username,
            avatar_url,
            location,
            bio,
            followers_count,
            role
          )
        `)
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalized = (data || [])
        .map((row: any) => {
          const vendor = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
          if (!vendor || vendor.role !== 'chef') return null;
          return {
            id: vendor.id,
            full_name: vendor.full_name,
            username: vendor.username,
            avatar_url: vendor.avatar_url,
            location: vendor.location,
            bio: vendor.bio,
            followers_count: vendor.followers_count,
            following_id: row.following_id,
          } as SavedVendor;
        })
        .filter(Boolean) as SavedVendor[];

      setSavedVendors(normalized);
    } catch {
      setSavedVendors([]);
    }
  };

  const loadMeals = async () => {
    if (!user?.id) return;
    setMealsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('chef_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setDbMeals(data);
    } catch {
      // no-op
    } finally {
      setMealsLoading(false);
    }
  };

  // Vendor tabs
  const vendorTabs = [
    { id: 'posts', label: 'Posts', icon: Grid3X3 },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'about', label: 'About', icon: Info },
  ];

  // Customer tabs
  const customerTabs = [
    { id: 'posts', label: 'Posts', icon: Grid3X3 },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'saved', label: 'Saved', icon: Bookmark },
  ];

  const tabs = isVendor ? vendorTabs : customerTabs;

  const addToCart = (meal: DbMeal) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === meal.id);
      if (existing) {
        return prev.map((i) => i.id === meal.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: meal.id, title: meal.title, price: meal.price, qty: 1 }];
    });
    toast.success(`${meal.title} added to cart`, { description: `$${meal.price.toFixed(2)}` });
  };

  useEffect(() => {
    const loadLikedPosts = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id);
        setLikedPostIds(new Set((data || []).map((row: any) => row.post_id)));
      } catch {
        setLikedPostIds(new Set());
      }
    };

    void loadLikedPosts();
  }, [supabase, user?.id]);

  const categories = ['All', ...Array.from(new Set(dbMeals.map((m) => m.category)))];
  const filteredMeals = selectedCategory === 'All' ? dbMeals : dbMeals.filter((m) => m.category === selectedCategory);
  const selectedPostMedia = selectedPost ? getOrderedPostMedia(selectedPost) : [];
  const selectedPostComments = selectedPost ? (commentsByPostId[selectedPost.id] || []) : [];
  const selectedPostLiked = selectedPost ? likedPostIds.has(selectedPost.id) : false;

  const openPostViewer = (post: DbPost) => {
    const postIndex = dbPosts.findIndex((entry) => entry.id === post.id);
    setSelectedPost(post);
    setSelectedPostIndex(postIndex >= 0 ? postIndex : 0);
    setSelectedMediaIndex(0);
  };

  const closePostViewer = () => {
    setSelectedPost(null);
    setSelectedPostIndex(0);
    setSelectedMediaIndex(0);
    setCommentSheetOpen(false);
    setCommentInput('');
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const scrollToMediaIndex = (index: number) => {
    const container = viewerScrollRef.current;
    if (!container) return;
    container.scrollTo({ left: container.clientWidth * index, behavior: 'smooth' });
    setSelectedMediaIndex(index);
  };

  const goToPreviousMedia = () => {
    if (!selectedPostMedia.length) return;
    const nextIndex = selectedMediaIndex === 0 ? selectedPostMedia.length - 1 : selectedMediaIndex - 1;
    scrollToMediaIndex(nextIndex);
  };

  const goToNextMedia = () => {
    if (!selectedPostMedia.length) return;
    const nextIndex = selectedMediaIndex === selectedPostMedia.length - 1 ? 0 : selectedMediaIndex + 1;
    scrollToMediaIndex(nextIndex);
  };

  const openPostAtIndex = (index: number) => {
    const nextPost = dbPosts[index];
    if (!nextPost) return;
    setSelectedPost(nextPost);
    setSelectedPostIndex(index);
    setSelectedMediaIndex(0);
    setCommentSheetOpen(false);
    setCommentInput('');
    requestAnimationFrame(() => {
      const container = viewerScrollRef.current;
      if (container) container.scrollTo({ left: 0, behavior: 'auto' });
    });
  };

  const goToPreviousPost = () => {
    if (!dbPosts.length) return;
    const nextIndex = selectedPostIndex === 0 ? dbPosts.length - 1 : selectedPostIndex - 1;
    openPostAtIndex(nextIndex);
  };

  const goToNextPost = () => {
    if (!dbPosts.length) return;
    const nextIndex = selectedPostIndex === dbPosts.length - 1 ? 0 : selectedPostIndex + 1;
    openPostAtIndex(nextIndex);
  };

  const loadCommentsForPost = async (postId: string) => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          body,
          created_at,
          user_id,
          user_profiles:user_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCommentsByPostId((prev) => ({ ...prev, [postId]: (data || []) as DbComment[] }));
    } catch {
      setCommentsByPostId((prev) => ({ ...prev, [postId]: prev[postId] || [] }));
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleOpenComments = async () => {
    if (!selectedPost) return;
    setCommentSheetOpen(true);
    if (!commentsByPostId[selectedPost.id]) {
      await loadCommentsForPost(selectedPost.id);
    }
  };

  const handleToggleLike = async () => {
    if (!selectedPost || !user?.id) {
      toast.error('Please sign in to like posts.');
      return;
    }

    const postId = selectedPost.id;
    const isLiked = likedPostIds.has(postId);
    const nextLiked = !isLiked;

    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (nextLiked) next.add(postId); else next.delete(postId);
      return next;
    });

    setDbPosts((prev) => prev.map((post) => post.id === postId ? { ...post, likes_count: nextLiked ? (post.likes_count || 0) + 1 : Math.max(0, (post.likes_count || 0) - 1) } : post));
    setSelectedPost((prev) => prev && prev.id === postId ? { ...prev, likes_count: nextLiked ? (prev.likes_count || 0) + 1 : Math.max(0, (prev.likes_count || 0) - 1) } : prev);

    try {
      if (nextLiked) {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) throw error;
      }

      await supabase.from('posts').update({ likes_count: nextLiked ? (selectedPost.likes_count || 0) + 1 : Math.max(0, (selectedPost.likes_count || 0) - 1) }).eq('id', postId);
    } catch {
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(postId); else next.delete(postId);
        return next;
      });
      setDbPosts((prev) => prev.map((post) => post.id === postId ? { ...post, likes_count: selectedPost.likes_count || 0 } : post));
      setSelectedPost((prev) => prev && prev.id === postId ? { ...prev, likes_count: selectedPost.likes_count || 0 } : prev);
      toast.error('Could not update like.');
    }
  };

  const handleAddComment = async () => {
    if (!selectedPost || !user?.id) {
      toast.error('Please sign in to comment.');
      return;
    }
    const body = commentInput.trim();
    if (!body) return;

    setCommentInput('');
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: selectedPost.id, user_id: user.id, body })
        .select(`
          id,
          body,
          created_at,
          user_id,
          user_profiles:user_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      const createdComment = data as DbComment;
      setCommentsByPostId((prev) => ({
        ...prev,
        [selectedPost.id]: [...(prev[selectedPost.id] || []), createdComment],
      }));

      setDbPosts((prev) => prev.map((post) => post.id === selectedPost.id ? { ...post, comments_count: (post.comments_count || 0) + 1 } : post));
      setSelectedPost((prev) => prev && prev.id === selectedPost.id ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
    } catch {
      setCommentInput(body);
      toast.error('Could not post comment.');
    }
  };

  const handleDeleteSelectedPost = async () => {
    if (!selectedPost || !user?.id) return;
    const confirmed = typeof window !== 'undefined' ? window.confirm('Delete this post? This cannot be undone.') : false;
    if (!confirmed) return;

    const deletingPostId = selectedPost.id;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', deletingPostId).eq('user_id', user.id);
      if (error) throw error;

      const nextPosts = dbPosts.filter((post) => post.id !== deletingPostId);
      setDbPosts(nextPosts);
      setCommentsByPostId((prev) => {
        const next = { ...prev };
        delete next[deletingPostId];
        return next;
      });
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingPostId);
        return next;
      });

      if (nextPosts.length === 0) {
        closePostViewer();
      } else {
        const nextIndex = Math.min(selectedPostIndex, nextPosts.length - 1);
        openPostAtIndex(nextIndex);
      }

      toast.success('Post deleted');
    } catch {
      toast.error('Could not delete post.');
    }
  };

  const handleViewerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const handleViewerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null || touchStartYRef.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? null;
    const endY = e.changedTouches[0]?.clientY ?? null;
    if (endX == null || endY == null) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    const deltaX = endX - touchStartXRef.current;
    const deltaY = endY - touchStartYRef.current;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 60) {
      if (deltaY < 0) goToNextPost();
      if (deltaY > 0) goToPreviousPost();
    } else if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) goToNextMedia();
      if (deltaX > 0) goToPreviousMedia();
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleViewerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (!container.clientWidth) return;
    const nextIndex = Math.round(container.scrollLeft / container.clientWidth);
    if (nextIndex !== selectedMediaIndex) setSelectedMediaIndex(nextIndex);
  };

  return (
    <div className="bg-card">
      {/* Tab Navigation */}
      <div className="flex border-b border-border sticky top-14 bg-card z-20">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-600 border-b-2 transition-all duration-150 ${
                isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── VENDOR-SPECIFIC QUICK ACTIONS ── */}
      {isVendor && activeTab === 'posts' && (
        <div className="p-4 border-b border-border">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setVendorToolsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
              aria-expanded={vendorToolsOpen}
              aria-label="Toggle vendor tools"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor Tools</p>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${vendorToolsOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            <div className={`grid transition-all duration-300 ease-out ${vendorToolsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-70'}`}>
              <div className="overflow-hidden">
                <div className="p-3 pt-0 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <Link href="/chef-menu?section=menu-manager">
                      <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors text-left">
                        <UtensilsCrossed className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">Manage Menu</span>
                      </button>
                    </Link>
                    <Link href="/chef-menu?section=orders">
                      <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 transition-colors text-left">
                        <Package className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">Orders Received</span>
                      </button>
                    </Link>
                    <Link href="/chef-menu?section=trust">
                      <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-slate-500/5 hover:bg-slate-500/10 border border-slate-500/20 transition-colors text-left">
                        <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-200 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">Trust & Verification</span>
                      </button>
                    </Link>
                    <Link href="/chef-menu?section=trust">
                      <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors text-left">
                        <Plus className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">Upload Credentials</span>
                      </button>
                    </Link>
                    <Link href="/badges">
                      <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/20 transition-colors text-left">
                        <BadgeCheck className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">Badge Progress</span>
                      </button>
                    </Link>
                    <Link href="/edit-profile">
                      <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/20 transition-colors text-left">
                        <Settings className="w-4 h-4 text-violet-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">Edit Vendor Profile</span>
                      </button>
                    </Link>
                    <Link href="/chef-menu?section=payouts">
                      <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 transition-colors text-left">
                        <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">Payout / Earnings</span>
                      </button>
                    </Link>
                    <Link href="/chef-menu?section=hours">
                      <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 transition-colors text-left">
                        <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">Business Hours</span>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER-SPECIFIC QUICK ACTIONS ── */}
      {/* Posts Grid Tab */}
      {activeTab === 'posts' && (
        <div>
          {postsLoading ? (
            <div className="pt-2">
              <PostFeedSkeleton count={2} />
            </div>
          ) : dbPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-0 px-6 text-center">
              {/* Illustration */}
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <Grid3X3 className="w-9 h-9 text-muted-foreground/50" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-card">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
              </div>
              <h3 className="text-base font-700 text-foreground mb-1.5">No posts yet</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs">
                {isVendor
                  ? 'Share your dishes, behind-the-scenes moments, and specials to attract customers.' :'Share your food experiences, reviews, and discoveries with the community.'}
              </p>
              <Link href="/create-post">
                <button className="flex items-center gap-2 bg-primary text-white text-sm font-700 px-5 py-2.5 rounded-full hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 hover:-translate-y-0.5 active:scale-95 transition-all duration-150 shadow-sm shadow-primary/20">
                  <Plus className="w-4 h-4" />
                  {isVendor ? 'Share your first dish' : 'Create your first post'}
                </button>
              </Link>
              {isVendor && (
                <p className="text-xs text-muted-foreground mt-4">
                  Posts with photos get <span className="font-600 text-foreground">3× more orders</span>
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {dbPosts.map((post) => {
                const orderedMedia = getOrderedPostMedia(post);
                const coverMedia = orderedMedia[0];

                return (
                <button
                  key={post.id}
                  onClick={() => openPostViewer(post)}
                  className="relative aspect-square overflow-hidden bg-muted group"
                  aria-label={`View post: ${post.caption || 'Post'}`}
                >
                  {coverMedia.media_type === 'video' ? (
                    <video src={coverMedia.media_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" muted />
                  ) : (
                    <img
                      src={coverMedia.media_url}
                      alt={post.caption || 'Post'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-white text-sm font-600">
                      <Heart className="w-4 h-4 fill-white" />
                      <span>{post.likes_count?.toLocaleString()}</span>
                    </div>
                  </div>
                  {coverMedia.media_type === 'video' && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  {orderedMedia.length > 1 && (
                    <div className="absolute top-2 left-2 min-w-[22px] h-5 px-1.5 bg-black/60 rounded-full flex items-center justify-center text-[10px] font-700 text-white">
                      {orderedMedia.length}
                    </div>
                  )}
                </button>
              )})}
            </div>
          )}
        </div>
      )}

      {/* Menu Tab (Vendor only) */}
      {activeTab === 'menu' && isVendor && (
        <div className="p-4 space-y-3">
          {isOwnProfile && (
            <Link href="/chef-menu?section=menu-manager">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-sm font-600 hover:bg-primary/5 transition-colors mb-2">
                <Pencil className="w-4 h-4" />
                Manage Menu
              </button>
            </Link>
          )}

          {mealsLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 rounded-2xl border border-border animate-pulse">
                  <div className="w-20 h-20 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : dbMeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-0 text-center px-4">
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-2xl bg-primary/8 flex items-center justify-center">
                  <UtensilsCrossed className="w-9 h-9 text-primary/50" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center border-2 border-card">
                  <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <h3 className="text-base font-700 text-foreground mb-1.5">Your menu is empty</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs">
                Add your signature dishes so customers can browse and order directly from your profile.
              </p>
              {isOwnProfile && (
                <>
                  <Link href="/chef-menu?section=menu-manager">
                    <button className="flex items-center gap-2 bg-primary text-white text-sm font-700 px-5 py-2.5 rounded-full hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 hover:-translate-y-0.5 active:scale-95 transition-all duration-150 shadow-sm shadow-primary/20">
                      <Plus className="w-4 h-4" />
                      Add your first meal
                    </button>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-4">
                    Chefs with 5+ menu items get <span className="font-600 text-foreground">more discovery</span>
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {categories.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-600 transition-all ${
                        selectedCategory === cat
                          ? 'bg-primary text-white' :'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {filteredMeals.map((meal) => (
                  <div key={meal.id} className="flex gap-3 p-3 rounded-2xl border border-border bg-card">
                    {meal.image_url ? (
                      <img
                        src={meal.image_url}
                        alt={meal.title}
                        className="w-20 h-20 rounded-xl object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-muted shrink-0 flex items-center justify-center">
                        <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-600 text-foreground truncate">{meal.title}</h3>
                        <span className="text-sm font-700 text-primary shrink-0">${meal.price.toFixed(2)}</span>
                      </div>
                      {meal.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{meal.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${meal.available ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          {meal.available ? 'Available' : 'Unavailable'}
                        </span>
                        <span className="text-xs text-muted-foreground">{meal.category}</span>
                      </div>
                      {isOwnProfile && (
                        <Link href="/chef-menu?section=menu-manager">
                          <button
                            disabled={!meal.available}
                            className="mt-2 text-xs font-600 text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                          >
                            Edit in menu manager
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* About Tab (Vendor only) */}
      {activeTab === 'about' && isVendor && (
        <div className="p-4 space-y-4">
          <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
            <h3 className="text-sm font-semibold text-foreground">About this vendor</h3>
            {profile?.bio ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description yet.</p>
            )}
            {profile?.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📍</span>
                <span>{profile.location}</span>
              </div>
            )}
          </div>
          <Link href="/profile-screen?tab=menu">
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">
              <UtensilsCrossed className="w-4 h-4" />
              View Full Menu
            </button>
          </Link>
        </div>
      )}

      {/* My Orders Tab (Customer only) */}
      {activeTab === 'orders' && !isVendor && <CustomerOrdersTab />}

      {/* Saved Tab (Customer only) */}
      {activeTab === 'saved' && !isVendor && (
        <div className="p-4 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ChefHat className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Saved Vendors</h3>
            </div>

            {savedLoading ? (
              <PostFeedSkeleton count={2} />
            ) : savedVendors.length > 0 ? (
              <div className="space-y-3">
                {savedVendors.map((vendor) => (
                  <Link key={vendor.following_id} href={`/vendor-profile?id=${vendor.id}`}>
                    <div className="rounded-2xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        {vendor.avatar_url ? (
                          <img src={vendor.avatar_url} alt={vendor.full_name || 'Vendor'} className="w-14 h-14 rounded-2xl object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {(vendor.full_name || vendor.username || 'V').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate">{vendor.full_name || 'Unnamed vendor'}</p>
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                              Chef
                            </span>
                          </div>
                          {vendor.username && (
                            <p className="text-sm text-muted-foreground truncate">@{vendor.username}</p>
                          )}
                          {vendor.location && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <MapPin className="w-3 h-3" />
                              {vendor.location}
                            </p>
                          )}
                          {vendor.bio && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{vendor.bio}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <h4 className="text-base font-bold text-foreground">No saved vendors yet</h4>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                  Follow chefs you like and they&apos;ll show up here for quick access.
                </p>
                <Link href="/nearby">
                  <button className="mt-4 inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
                    <Heart className="w-4 h-4" />
                    Explore chefs
                  </button>
                </Link>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Saved Posts</h3>
            </div>

            {savedLoading ? (
              <PostFeedSkeleton count={2} />
            ) : savedPosts.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {savedPosts.map((savedPost) => {
                  const post = savedPost.posts;
                  if (!post) return null;
                  const orderedMedia = (post.post_media || []).slice().sort((a, b) => a.sort_order - b.sort_order);
                  const coverMedia = orderedMedia[0] || { media_url: post.media_url, media_type: post.media_type, sort_order: 0 };
                  return (
                    <div key={savedPost.id} className="relative aspect-square overflow-hidden bg-muted rounded-lg">
                      {coverMedia.media_type === 'video' ? (
                        <video src={coverMedia.media_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={coverMedia.media_url} alt={post.caption || 'Saved post'} className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No saved posts yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {selectedPost && selectedPostMedia.length > 0 && (
        <div className="fixed inset-0 z-[90] bg-black text-white overflow-hidden">
          <div className="absolute inset-x-0 top-0 z-20 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-black/70 via-black/35 to-transparent">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pt-1">
                <p className="text-sm font-700 truncate">Your Post</p>
                <p className="text-xs text-white/75 truncate">{selectedPost.caption || 'Swipe to view media'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleDeleteSelectedPost} className="w-10 h-10 rounded-full bg-white/12 backdrop-blur-sm flex items-center justify-center" aria-label="Delete post">
                  <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={closePostViewer} className="w-10 h-10 rounded-full bg-white/12 backdrop-blur-sm flex items-center justify-center" aria-label="Close post viewer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="h-screen flex flex-col justify-center">
            <div className="relative w-full h-[75vh]" onTouchStart={handleViewerTouchStart} onTouchEnd={handleViewerTouchEnd}>
              <div
                ref={viewerScrollRef}
                onScroll={handleViewerScroll}
                className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {selectedPostMedia.map((media, index) => (
                  <div
                    key={`${media.media_url}-${index}`}
                    className="w-full h-full shrink-0 snap-center bg-black flex items-center justify-center relative"
                  >
                    {media.media_type === 'video' ? (
                      <video src={media.media_url} className="w-full h-full object-cover" controls autoPlay={index === selectedMediaIndex} playsInline />
                    ) : (
                      <img src={media.media_url} alt={selectedPost.caption || 'Post media'} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              <div className="absolute left-0 right-0 bottom-4 px-4 flex items-end justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={handleToggleLike} className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center" aria-label="Like post">
                    <Heart className={`w-5 h-5 ${selectedPostLiked ? 'fill-white text-white' : 'text-white'}`} />
                  </button>
                  <button onClick={handleOpenComments} className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center" aria-label="Comment on post">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-black/55 px-3 py-1 text-xs font-700 text-white">
                    ♥ {(selectedPost.likes_count || 0).toLocaleString()}
                  </div>
                  <div className="rounded-full bg-black/55 px-3 py-1 text-xs font-700 text-white">
                    💬 {(selectedPost.comments_count || 0).toLocaleString()}
                  </div>
                  {selectedPostMedia.length > 1 && (
                    <div className="rounded-full bg-black/55 px-3 py-1 text-xs font-700 text-white">
                      {selectedMediaIndex + 1}/{selectedPostMedia.length}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {selectedPostMedia.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  {selectedPostMedia.map((media, index) => (
                    <button
                      key={`${media.media_url}-${index}`}
                      onClick={() => scrollToMediaIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${selectedMediaIndex === index ? 'w-5 bg-white' : 'w-2 bg-white/35'}`}
                      aria-label={`View media ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-[12px] text-white/60">Post {selectedPostIndex + 1} of {dbPosts.length}</p>
                {selectedPost.tagged_users && selectedPost.tagged_users.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.tagged_users.map((taggedUser) => (
                      <span key={taggedUser.id} className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/90">
                        @{taggedUser.username || taggedUser.full_name || 'user'}
                      </span>
                    ))}
                  </div>
                ) : null}
                {selectedPost.caption ? (
                  <p className="text-sm text-white/88 leading-relaxed line-clamp-3">{selectedPost.caption}</p>
                ) : null}
              </div>
            </div>
          </div>

          {commentSheetOpen && selectedPost && (
            <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl bg-card text-foreground border-t border-border shadow-2xl max-h-[55vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-700">Comments</h3>
                <button onClick={() => setCommentSheetOpen(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-label="Close comments">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {commentsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading comments...</p>
                ) : selectedPostComments.length > 0 ? (
                  selectedPostComments.map((comment) => (
                    <div key={comment.id} className="rounded-2xl bg-muted/50 px-3 py-2.5">
                      <p className="text-[12px] font-700 text-foreground">
                        {comment.user_profiles?.full_name || comment.user_profiles?.username || 'User'}
                      </p>
                      <p className="text-sm text-foreground mt-1 leading-relaxed">{comment.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
                )}
              </div>

              <div className="border-t border-border px-4 py-3 flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 h-11 rounded-full bg-muted px-4 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                />
                <button onClick={handleAddComment} disabled={!commentInput.trim()} className="h-11 px-4 rounded-full bg-primary text-white text-sm font-700 disabled:opacity-40">
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
