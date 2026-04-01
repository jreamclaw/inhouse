'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Grid3X3, UtensilsCrossed, Info, Heart, Plus, Pencil, Package, DollarSign, Clock, Settings, Bookmark } from 'lucide-react';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PostFeedSkeleton } from '@/components/ui/SkeletonLoaders';

interface DbPost {
  id: string;
  media_url: string;
  caption: string | null;
  media_type: 'image' | 'video';
  likes_count: number;
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
  const [postsLoading, setPostsLoading] = useState(false);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab) setActiveTab(requestedTab);
    if (user?.id) {
      loadPosts();
      if (isVendor) loadMeals();
    }
  }, [user?.id, isVendor, searchParams]);

  const loadPosts = async () => {
    if (!user?.id) return;
    setPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, media_url, caption, media_type, likes_count')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setDbPosts(data);
    } catch {
      // no-op
    } finally {
      setPostsLoading(false);
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

  const categories = ['All', ...Array.from(new Set(dbMeals.map((m) => m.category)))];
  const filteredMeals = selectedCategory === 'All' ? dbMeals : dbMeals.filter((m) => m.category === selectedCategory);

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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vendor Tools</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/profile-screen?tab=menu">
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
            <Link href="/edit-profile">
              <button className="col-span-2 w-full flex items-center gap-2 p-3 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 transition-colors text-left">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">Business Hours</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── CUSTOMER-SPECIFIC QUICK ACTIONS ── */}
      {!isVendor && activeTab === 'posts' && (
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Access</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors text-left">
              <Package className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">My Orders</span>
            </button>
            <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 transition-colors text-left">
              <Bookmark className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">Saved Vendors</span>
            </button>
            <button className="col-span-2 w-full flex items-center gap-2 p-3 rounded-xl bg-muted hover:bg-muted/80 border border-border transition-colors text-left">
              <Settings className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">Account Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Posts Grid Tab */}
      {activeTab === 'posts' && (
        <div>
          {isOwnProfile && (
            <div className="p-3 border-b border-border">
              <Link href="/create-post">
                <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Share a photo or video...</span>
                </button>
              </Link>
            </div>
          )}

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
              {dbPosts.map((post) => (
                <button
                  key={post.id}
                  className="relative aspect-square overflow-hidden bg-muted group"
                  aria-label={`View post: ${post.caption || 'Post'}`}
                >
                  {post.media_type === 'video' ? (
                    <video src={post.media_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" muted />
                  ) : (
                    <img
                      src={post.media_url}
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
                  {post.media_type === 'video' && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Menu Tab (Vendor only) */}
      {activeTab === 'menu' && isVendor && (
        <div className="p-4 space-y-3">
          {isOwnProfile && (
            <Link href="/profile-screen?tab=menu">
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
                  <Link href="/profile-screen?tab=menu">
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
                        <button
                          onClick={() => addToCart(meal)}
                          disabled={!meal.available}
                          className="mt-2 text-xs font-600 text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                        >
                          + Add to cart
                        </button>
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
      {activeTab === 'orders' && !isVendor && (
        <div className="p-4">
          <div className="flex flex-col items-center justify-center py-10 gap-0 text-center px-4">
            {/* Chef Illustration */}
            <div className="relative mb-6">
              <div className="w-44 h-44 flex items-center justify-center">
                <img
                  src="/assets/chef-empty-state.svg"
                  alt="Friendly chef holding a steaming bowl"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 leading-snug">
              Your kitchen is quiet...
              <br />
              <span className="text-primary">let&apos;s change that!</span>
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              You haven&apos;t placed any orders yet. Discover talented local chefs cooking near you.
            </p>
            <Link href="/nearby">
              <button className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-7 py-3 rounded-full shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-150">
                <UtensilsCrossed className="w-4 h-4" />
                Explore Local Chefs
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Saved Tab (Customer only) */}
      {activeTab === 'saved' && !isVendor && (
        <div className="p-4">
          <div className="flex flex-col items-center justify-center py-10 gap-0 text-center px-4">
            {/* Chef Illustration */}
            <div className="relative mb-6">
              <div className="w-44 h-44 flex items-center justify-center">
                <img
                  src="/assets/chef-empty-state.svg"
                  alt="Friendly chef holding a steaming bowl"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 leading-snug">
              Your kitchen is quiet...
              <br />
              <span className="text-primary">let&apos;s change that!</span>
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              Save your favourite chefs and dishes here so you can find them again in a flash.
            </p>
            <Link href="/nearby">
              <button className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-7 py-3 rounded-full shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-150">
                <Heart className="w-4 h-4" />
                Explore &amp; Discover
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
