'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronLeft,
  Star,
  MapPin,
  Clock,
  ShoppingBag,
  Heart,
  Share2,
  ChefHat,
  Users,
  Flame,
  Zap,
  CheckCircle } from
'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import CustomizationModal, {
  type CartItemCustomization,
  type ModifierGroup } from
'./components/CustomizationModal';
import CartDrawer from './components/CartDrawer';
import OrdersTab from './components/OrdersTab';
import ChefReviews, { MOCK_REVIEWS } from './components/ChefReviews';
import TrustVerificationSection from '@/components/trust/TrustVerificationSection';
import TrustBadgeRow from '@/components/trust/TrustBadgeRow';
import { calculateTrustScore } from '@/lib/trust/score';
import type { TrustCredentialShape } from '@/lib/trust/types';

interface DbMeal {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  available: boolean;
  modifier_groups?: ModifierGroup[] | null;
}

interface DbVendorProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  bio: string | null;
  location: string | null;
  privacy_show_location?: boolean | null;
  followers_count?: number | null;
  delivery_fee?: number | null;
  business_hours?: string | null;
  closed_days?: string[] | null;
  availability_override?: 'open' | 'closed' | null;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  identity_verified?: boolean | null;
  is_verified?: boolean | null;
  is_certified?: boolean | null;
  is_licensed?: boolean | null;
  is_top_rated?: boolean | null;
  is_pro_chef?: boolean | null;
  trust_score?: number | null;
  trust_label?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  completed_orders?: number | null;
  complaints_count?: number | null;
  approved_credentials_count?: number | null;
}

function parseBusinessHoursFromBio(bio?: string | null) {
  const match = bio?.match(/Hours:\s*([^\n]+)/i);
  return match?.[1]?.trim() || null;
}

function resolveBusinessHours(vendor: Partial<DbVendorProfile> & { bio?: string | null }) {
  return vendor.business_hours || parseBusinessHoursFromBio(vendor.bio) || null;
}

function getTodayOpenState(hoursText?: string | null, availabilityOverride?: 'open' | 'closed' | null) {
  if (availabilityOverride === 'open') {
    return { label: 'Open now', isOpen: true };
  }

  if (availabilityOverride === 'closed') {
    return { label: 'Closed manually', isOpen: false };
  }

  if (!hoursText || hoursText.toLowerCase().includes('closed all week')) {
    return { label: 'Closed now', isOpen: false };
  }

  const [daysPart = '', timePart = ''] = hoursText.split('•').map((part) => part.trim());
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const openDays = daysPart.split(',').map((part) => part.trim()).filter(Boolean);

  if (!openDays.includes(today)) {
    return { label: 'Closed now', isOpen: false };
  }

  const timeMatch = timePart.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!timeMatch) {
    return { label: 'Open today', isOpen: true };
  }

  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = toMinutes(timeMatch[1]);
  const closeMinutes = toMinutes(timeMatch[2]);
  const isOpenNow = nowMinutes >= openMinutes && nowMinutes < closeMinutes;

  if (isOpenNow) {
    return { label: 'Open now', isOpen: true };
  }

  if (nowMinutes < openMinutes) {
    return { label: `Opens at ${timeMatch[1]}`, isOpen: false };
  }

  return { label: 'Closed now', isOpen: false };
}

interface MenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  imageAlt: string;
  category: string;
  availability: 'available' | 'limited' | 'sold_out';
  availabilityLabel?: string;
  popular?: boolean;
  calories?: number;
  modifierGroups?: ModifierGroup[];
}

const VENDOR_DATA: Record<string, {
  id: string;
  name: string;
  username: string;
  avatar: string;
  coverImage: string;
  coverAlt: string;
  cuisine: string;
  bio: string;
  rating: number;
  reviewCount: number;
  followers: number;
  location: string;
  distance?: string;
  deliveryTime: string;
  deliveryFee?: number;
  minOrder: number;
  menu: MenuItem[];
}> = {
  'chef-marco': {
    id: 'chef-marco',
    name: 'Marco Valentini',
    username: 'chef_marco',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_11bf75089-1771893965240.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_11bf75089-1771893965240.png",
    coverAlt: 'Elegant Italian restaurant kitchen with fresh pasta and ingredients',
    cuisine: 'Italian Fine Dining',
    bio: 'Born in Naples, trained in Rome. I bring authentic Italian flavors to your table — every dish made from scratch with imported ingredients and a whole lot of love.',
    rating: 4.9,
    reviewCount: 312,
    followers: 9840,
    location: 'Washington, DC',
    distance: '1.2 miles away',
    deliveryTime: '35–50 min',
    minOrder: 30,
    menu: [
    {
      id: 'truffle-tag',
      title: 'Truffle Tagliatelle',
      description: 'Handmade tagliatelle with black truffle cream sauce, aged Parmigiano-Reggiano, and fresh herbs.',
      price: 38,
      image: 'https://images.unsplash.com/photo-1685022135825-b74ac61b5e14',
      imageAlt: 'Handmade tagliatelle pasta with truffle cream sauce in a white bowl',
      category: 'Pasta',
      availability: 'limited',
      availabilityLabel: 'Limited Plates',
      popular: true,
      calories: 620,
      modifierGroups: [
      {
        id: 'pasta-size',
        name: 'Portion Size',
        required: true,
        multiSelect: false,
        options: [
        { id: 'regular', label: 'Regular', priceAdd: 0 },
        { id: 'large', label: 'Large', priceAdd: 8 }]

      },
      {
        id: 'pasta-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-truffle', label: 'Extra Truffle Shavings', priceAdd: 6 },
        { id: 'extra-parm', label: 'Extra Parmigiano', priceAdd: 2 },
        { id: 'add-protein', label: 'Add Grilled Chicken', priceAdd: 7 }]

      }]

    },
    {
      id: 'burrata',
      title: 'Burrata & Heirloom Tomato',
      description: 'Creamy burrata with Sonoma heirloom tomatoes, basil oil, and sea salt flakes.',
      price: 22,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_11b9f9a5e-1772072806488.png",
      imageAlt: 'Fresh burrata with colorful heirloom tomatoes and basil',
      category: 'Starters',
      availability: 'available',
      availabilityLabel: 'Available Today',
      calories: 380,
      modifierGroups: [
      {
        id: 'burrata-bread',
        name: 'Add Bread',
        required: false,
        multiSelect: false,
        options: [
        { id: 'focaccia', label: 'Focaccia', priceAdd: 3 },
        { id: 'sourdough', label: 'Sourdough', priceAdd: 3 },
        { id: 'no-bread', label: 'No Bread', priceAdd: 0 }]

      }]

    },
    {
      id: 'osso-buco',
      title: 'Osso Buco alla Milanese',
      description: 'Slow-braised veal shank with gremolata, saffron risotto, and roasted root vegetables.',
      price: 58,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1b980db99-1772710002548.png",
      imageAlt: 'Braised veal osso buco with saffron risotto on a white plate',
      category: 'Mains',
      availability: 'available',
      availabilityLabel: 'Available Today',
      popular: true,
      calories: 780,
      modifierGroups: [
      {
        id: 'osso-side',
        name: 'Choose Your Side',
        required: true,
        multiSelect: false,
        options: [
        { id: 'risotto', label: 'Saffron Risotto', priceAdd: 0 },
        { id: 'polenta', label: 'Creamy Polenta', priceAdd: 0 },
        { id: 'roasted-veg', label: 'Roasted Vegetables', priceAdd: 0 },
        { id: 'mac-cheese', label: 'Mac and Cheese', priceAdd: 2 }]

      },
      {
        id: 'osso-spice',
        name: 'Spice Level',
        required: false,
        multiSelect: false,
        options: [
        { id: 'mild', label: 'Mild', priceAdd: 0 },
        { id: 'medium', label: 'Medium', priceAdd: 0 },
        { id: 'spicy', label: 'Spicy', priceAdd: 0 }]

      },
      {
        id: 'osso-drink',
        name: 'Add a Drink',
        required: false,
        multiSelect: false,
        options: [
        { id: 'water', label: 'Still Water', priceAdd: 0 },
        { id: 'sparkling', label: 'Sparkling Water', priceAdd: 1 },
        { id: 'wine', label: 'House Red Wine', priceAdd: 9 }]

      }]

    },
    {
      id: 'tiramisu',
      title: 'Tiramisu Classico',
      description: 'Traditional Venetian tiramisu with Illy espresso, mascarpone, and Savoiardi biscuits.',
      price: 16,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_12d6730d9-1773176609800.png",
      imageAlt: 'Classic tiramisu dessert with cocoa powder dusting',
      category: 'Desserts',
      availability: 'available',
      calories: 420
    },
    {
      id: 'cacio-pepe',
      title: 'Cacio e Pepe',
      description: 'Roman classic — tonnarelli pasta, Pecorino Romano, and freshly cracked black pepper.',
      price: 28,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_1e568055d-1772085885754.png",
      imageAlt: 'Cacio e pepe pasta with black pepper and pecorino cheese',
      category: 'Pasta',
      availability: 'available',
      calories: 540,
      modifierGroups: [
      {
        id: 'cacio-size',
        name: 'Portion Size',
        required: true,
        multiSelect: false,
        options: [
        { id: 'regular', label: 'Regular', priceAdd: 0 },
        { id: 'large', label: 'Large', priceAdd: 6 }]

      },
      {
        id: 'cacio-extras',
        name: 'Extras',
        required: false,
        multiSelect: true,
        options: [
        { id: 'extra-sauce', label: 'Extra Sauce', priceAdd: 1 },
        { id: 'extra-cheese', label: 'Extra Pecorino', priceAdd: 2 }]

      }]

    },
    {
      id: 'panna-cotta',
      title: 'Vanilla Panna Cotta',
      description: 'Silky panna cotta with Madagascar vanilla, seasonal berry coulis, and candied pistachios.',
      price: 14,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_10f17521a-1765319153356.png",
      imageAlt: 'Vanilla panna cotta with berry coulis and pistachios',
      category: 'Desserts',
      availability: 'sold_out',
      calories: 310
    }]

  },
  'chef-aisha': {
    id: 'chef-aisha',
    name: 'Aisha Kamara',
    username: 'chef_aisha',
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_14cdffd73-1767751305516.png",
    coverImage: "https://img.rocket.new/generatedImages/rocket_gen_img_14cdffd73-1767751305516.png",
    coverAlt: 'Vibrant West African food spread with colorful dishes and spices',
    cuisine: 'West African Fusion',
    bio: "West African roots, California soul. My kitchen is a love letter to my grandmother's recipes — reimagined with local, seasonal ingredients.",
    rating: 4.8,
    reviewCount: 247,
    followers: 7320,
    location: 'Los Angeles, CA',
    distance: '2.5 miles away',
    deliveryTime: '25–40 min',
    minOrder: 22,
    menu: []
  }
};

const CATEGORY_ICONS: Record<string, string> = {
  Starters: '🥗',
  Pasta: '🍝',
  Mains: '🍽️',
  Desserts: '🍰',
  Drinks: '🥤'
};

const AVAILABILITY_STYLES = {
  available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  limited: 'bg-amber-400/15 text-amber-600 dark:text-amber-300',
  sold_out: 'bg-muted text-muted-foreground'
};

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

function VendorProfileContent() {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get('id') ?? 'chef-marco';
  const supabase = createClient();
  const { user } = useAuth();
  const [vendorOverride, setVendorOverride] = useState<(typeof VENDOR_DATA)[string] | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [vendorNotFound, setVendorNotFound] = useState(false);
  const isUuidVendor = /^[0-9a-fA-F-]{36}$/.test(vendorId);
  const vendor = vendorOverride ?? (!isUuidVendor ? VENDOR_DATA[vendorId] ?? VENDOR_DATA['chef-marco'] : null);

  const [cart, setCart] = useState<CartItemCustomization[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItemCustomization | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [vendorPosts, setVendorPosts] = useState<any[]>([]);
  const [vendorCredentials, setVendorCredentials] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [contentTab, setContentTab] = useState<'posts' | 'kitchen'>('posts');
  const businessHours = resolveBusinessHours(vendor as any);
  const openState = getTodayOpenState(businessHours, (vendor as any)?.availability_override || null);
  const isOwnVendorProfile = !!user?.id && !!vendor?.id && user.id === vendor.id;

  useEffect(() => {
    loadVendor();
    if (user?.id) {
      loadFollowState();
    }
  }, [vendorId, user?.id]);

  const loadVendor = async () => {
    setVendorLoading(true);
    setVendorNotFound(false);
    try {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(vendorId);
      if (!isUuid) {
        setVendorOverride(null);
        setVendorNotFound(false);
        setVendorLoading(false);
        return;
      }

      const [{ data: profile, error: profileError }, { data: meals, error: mealsError }, { data: credentials }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, full_name, username, avatar_url, cover_url, bio, location, privacy_show_location, followers_count, delivery_fee')
          .eq('id', vendorId)
          .single(),
        supabase
          .from('meals')
          .select('id, title, description, price, image_url, category, available, modifier_groups')
          .eq('chef_id', vendorId)
          .order('created_at', { ascending: false }),
        supabase
          .from('chef_credentials')
          .select('id, credential_type, title, issued_by, expiration_date, status')
          .eq('chef_id', vendorId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (mealsError) throw mealsError;
      if (!profile) {
        setVendorOverride(null);
        setVendorNotFound(true);
        return;
      }

      const { data: profileExtras } = await supabase
        .from('user_profiles')
        .select('business_hours, closed_days, availability_override, email_verified, phone_verified, identity_verified, is_verified, is_certified, is_licensed, is_top_rated, is_pro_chef, trust_score, trust_label, rating_avg, rating_count, completed_orders, complaints_count, approved_credentials_count')
        .eq('id', vendorId)
        .maybeSingle();

      const dbVendor = {
        ...(profile as DbVendorProfile),
        ...(profileExtras || {}),
      } as DbVendorProfile;
      const dbMeals = (meals as DbMeal[] | null) ?? [];
      setVendorCredentials(credentials || []);

      const mappedMenu: MenuItem[] = dbMeals.map((meal) => ({
        id: meal.id,
        title: meal.title,
        description: meal.description || '',
        price: Number(meal.price),
        image: meal.image_url || '/assets/images/no_image.png',
        imageAlt: meal.title,
        category: meal.category || 'Mains',
        availability: meal.available ? 'available' : 'sold_out',
        modifierGroups: meal.modifier_groups ?? [],
      }));

      setVendorOverride({
        id: dbVendor.id,
        name: dbVendor.full_name || 'Chef',
        username: dbVendor.username || (dbVendor.full_name || 'chef').toLowerCase().replace(/\s+/g, '_'),
        avatar: dbVendor.avatar_url || '/assets/images/no_image.png',
        coverImage: dbVendor.cover_url || dbVendor.avatar_url || '/assets/images/no_image.png',
        coverAlt: `${dbVendor.full_name || 'Chef'} profile`,
        cuisine: 'Local Chef',
        bio: dbVendor.bio || 'Local chef on InHouse.',
        rating: Number(dbVendor.rating_avg || 0),
        reviewCount: Number(dbVendor.rating_count || 0),
        followers: dbVendor.followers_count || 0,
        location: dbVendor.privacy_show_location === false ? 'Location private' : (dbVendor.location || 'Location unavailable'),
        distance: undefined,
        deliveryFee: Number(dbVendor.delivery_fee || 0),
        deliveryTime: 'TBD',
        minOrder: mappedMenu.length > 0 ? Math.min(...mappedMenu.map((item) => item.price)) : 0,
        menu: mappedMenu,
      });
    } catch {
      setVendorOverride(null);
      if (isUuidVendor) {
        setVendorNotFound(true);
      }
    } finally {
      setVendorLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !vendor) return;
    window.localStorage.setItem('inhouse_vendor_name', vendor.name);
    window.localStorage.setItem('inhouse_vendor_avatar', vendor.avatar);
    window.localStorage.setItem('inhouse_vendor_location', vendor.location || '');
    window.localStorage.setItem('inhouse_vendor_delivery_fee', String((vendor as any).deliveryFee ?? 0));
  }, [vendor]);

  const categories = vendor ? ['all', ...Array.from(new Set(vendor.menu.map((item) => item.category)))] : ['all'];
  const filteredMenu = !vendor ? [] : activeCategory === 'all' ? vendor.menu : vendor.menu.filter((item) => item.category === activeCategory);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice * item.qty, 0);

  const modifierGroupsMap: Record<string, ModifierGroup[]> = {};
  (vendor?.menu || []).forEach((item) => {
    modifierGroupsMap[item.id] = item.modifierGroups || [];
  });

  const openCustomization = (item: MenuItem, existingCartItem?: CartItemCustomization) => {
    setCustomizingItem(item);
    setEditingCartItem(existingCartItem ?? null);
  };

  const handleCustomizationConfirm = (customization: CartItemCustomization) => {
    setCart((prev) => {
      const withoutEdited = customization.cartKey ? prev.filter((item) => item.cartKey !== customization.cartKey) : prev;
      return [...withoutEdited, { ...customization, cartKey: customization.cartKey || `${customization.itemId}-${Date.now()}` }];
    });
    setCustomizingItem(null);
    setEditingCartItem(null);
    setShowCart(true);
  };

  const handleRemoveFromCart = (cartKey: string) => {
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const handleEditCartItem = (cartItem: CartItemCustomization) => {
    const menuItem = vendor?.menu.find((item) => item.id === cartItem.itemId);
    if (!menuItem) return;
    openCustomization(menuItem, cartItem);
  };

  const loadFollowState = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', vendorId)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch {
      setIsFollowing(false);
    }
  };

  const loadVendorPosts = async () => {
    try {
      const { data } = await supabase
        .from('posts')
        .select('id, caption, media_url, media_type, created_at, likes_count, comments_count')
        .eq('user_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(6);

      setVendorPosts(data || []);
    } catch {
      setVendorPosts([]);
    }
  };

  useEffect(() => {
    if (!vendorId) return;
    void loadVendorPosts();
  }, [vendorId]);

  const handleFollow = async () => {
    if (!vendor?.id || !user?.id || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', vendor.id);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: vendor.id });

        if (error) throw error;
        setIsFollowing(true);
      }

      await syncFollowerCounts(supabase, user.id, vendor.id);
    } catch {
      toast.error('Could not update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  const trustScore = calculateTrustScore(
    {
      avatar_url: (vendorOverride as any)?.avatar || (vendor as any)?.avatar,
      bio: vendor?.bio,
      email_verified: (vendorOverride as any)?.email_verified ?? false,
      phone_verified: (vendorOverride as any)?.phone_verified ?? false,
      identity_verified: (vendorOverride as any)?.identity_verified ?? false,
      completed_orders: (vendorOverride as any)?.completed_orders ?? 0,
      complaints_count: (vendorOverride as any)?.complaints_count ?? 0,
      rating_avg: vendor?.rating ?? 0,
      rating_count: vendor?.reviewCount ?? 0,
    },
    vendorCredentials as TrustCredentialShape[],
    (vendor?.menu || []).filter((item) => !!item.image).length,
  );

  const nearbyVendorIds = ['wing-queen', 'sweet-tooth', 'rolling-smoke', 'taco-loco', 'ocean-catch', 'green-bowl', 'mama-soul'];
  const backHref = nearbyVendorIds.includes(vendorId) ? '/nearby' : '/home-feed';

  if (vendorLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!vendor) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/search" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-6">
            <ChevronLeft className="w-4 h-4" /> Back to search
          </Link>
          <div className="rounded-3xl border border-border bg-card p-6 text-center">
            <p className="text-base font-700 text-foreground">Chef profile unavailable</p>
            <p className="text-sm text-muted-foreground mt-2">{vendorNotFound ? 'This chef profile could not be loaded right now.' : 'This chef profile is not available.'}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto xl:max-w-screen-md pb-32">
        <div className="relative h-52 sm:h-64 overflow-hidden bg-muted">
          <img
            src={vendor.coverImage}
            alt={vendor.coverAlt}
            className="w-full h-full object-cover" />

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          <Link href={backHref} className="absolute top-4 left-4">
            <button
              suppressHydrationWarning
              className="w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
              aria-label="Go back">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>

          <button
            suppressHydrationWarning
            className="absolute top-4 right-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
            aria-label="Share vendor"
            onClick={() => toast.success('Link copied!')}>
            <Share2 className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="px-4 pb-4 bg-card border-b border-border/50">
          <div className="flex items-end gap-4 -mt-8 sm:-mt-10 mb-3.5">
            <div className="relative shrink-0">
              <div className="w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] rounded-2xl overflow-hidden border-[3px] border-card shadow-elevated bg-card">
                <img src={vendor.avatar} alt={`${vendor.name} chef avatar`} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center border-2 border-card text-xs shadow-sm">
                👨‍🍳
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 flex-1 min-w-0 pt-2">
              <div className="text-center">
                <p className="text-[18px] font-700 text-foreground font-tabular tracking-snug">{vendor.menu.length}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Menu</p>
              </div>
              <div className="text-center">
                <p className="text-[18px] font-700 text-foreground font-tabular tracking-snug">{vendor.followers >= 1000 ? `${(vendor.followers / 1000).toFixed(1)}k` : vendor.followers}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-[18px] font-700 text-foreground font-tabular tracking-snug">{vendor.reviewCount}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Reviews</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[18px] sm:text-[20px] font-700 text-foreground leading-tight tracking-snug">{vendor.name}</h1>
                <span className="flex items-center gap-1 bg-[#FFE5D0] text-[#C2410C] dark:bg-orange-500/15 dark:text-[#FB923C] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#FFD2B3]">
                  <ChefHat className="w-3 h-3" />Chef
                </span>
              </div>
              <p className="text-[13px] font-semibold text-foreground">@{vendor.username}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                  <Star className="w-3.5 h-3.5 text-primary" />
                  <span>{vendor.rating > 0 ? `${vendor.rating.toFixed(1)} rating` : 'No ratings yet'}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>{vendor.reviewCount} reviews</span>
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">{vendor.bio}</p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{vendor.location}</span>
                {vendor.distance && <span className="text-primary font-500">· {vendor.distance}</span>}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{vendor.deliveryTime === 'TBD' ? 'Pickup / delivery details coming soon' : vendor.deliveryTime}</span>
              </div>
              {vendor.minOrder > 0 && (
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>From ${vendor.minOrder}</span>
                </div>
              )}
            </div>

            {businessHours && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <div className="inline-flex items-center gap-2 text-[12px] text-muted-foreground bg-muted px-3 py-2 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{businessHours}</span>
                </div>
                <div className={`inline-flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl font-700 ${openState.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${openState.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {openState.label}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3.5 flex-wrap">
            <button
              suppressHydrationWarning
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-[13px] font-600 px-4 py-2.5 rounded-xl active:scale-95 transition-all duration-200 shadow-sm ${
              isFollowing ?
              'bg-muted text-muted-foreground border border-border/60 hover:border-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20' :
              'bg-primary text-white hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20'} ${
              followLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {followLoading ?
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> :
              <>
                  <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-current' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </>
              }
            </button>
            <button
              suppressHydrationWarning
              onClick={() => document.getElementById('vendor-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="h-[42px] px-4 border border-border rounded-xl flex items-center justify-center gap-1.5 hover:bg-muted transition-colors text-[13px] font-600"
              aria-label="View rating">
              <Star className="w-4 h-4 text-foreground" />
              Rating
            </button>
            <button
              suppressHydrationWarning
              onClick={() => document.getElementById('vendor-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="h-[42px] px-4 border border-border rounded-xl flex items-center justify-center gap-1.5 hover:bg-muted transition-colors text-[13px] font-600"
              aria-label="View menu">
              <ShoppingBag className="w-4 h-4 text-foreground" />
              View Menu
            </button>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          <section className="rounded-3xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2 rounded-2xl bg-muted p-1">
              <button
                onClick={() => setContentTab('posts')}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${contentTab === 'posts' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Posts
              </button>
              <button
                onClick={() => setContentTab('kitchen')}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${contentTab === 'kitchen' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Kitchen
              </button>
            </div>

            {vendorPosts.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {(contentTab === 'posts' ? vendorPosts.filter((post) => post.media_type !== 'video') : vendorPosts.filter((post) => post.media_type === 'video')).slice(0, 6).map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square overflow-hidden rounded-2xl bg-muted relative"
                  >
                    {post.media_type === 'video' ? (
                      <video src={post.media_url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={post.media_url} alt={post.caption || 'Chef post'} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-[11px] text-white line-clamp-2">{post.caption || (contentTab === 'kitchen' ? 'Kitchen clip' : 'Post')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">
                No {contentTab} yet.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 space-y-4">
            <div>
              <h2 className="text-base font-700 text-foreground">Featured dishes</h2>
              <p className="text-sm text-muted-foreground mt-1">Popular items people will want first.</p>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {vendor.menu.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.availability !== 'sold_out' && openCustomization(item)}
                  className="w-44 shrink-0 rounded-2xl border border-border bg-card overflow-hidden text-left"
                >
                  <div className="aspect-[4/3] bg-muted">
                    <img src={item.image} alt={item.imageAlt} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-700 text-foreground line-clamp-1">{item.title}</p>
                    <p className="text-sm text-primary font-semibold mt-1">${item.price}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section id="vendor-menu" className="rounded-3xl border border-border bg-card overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-700 text-foreground">Menu</h2>
              <p className="text-sm text-muted-foreground mt-1">Tap any item to view details or add it to cart.</p>
            </div>

            <div className="bg-card border-b border-border/50 px-4 py-3 z-20">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    suppressHydrationWarning
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-600 transition-all duration-150 tracking-snug ${
                      activeCategory === cat
                        ? 'bg-primary text-white shadow-sm shadow-primary/20'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat !== 'all' && <span>{CATEGORY_ICONS[cat] || '🍴'}</span>}
                    {cat === 'all' ? 'All Items' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-border/40 px-1">
              {filteredMenu.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-700 text-foreground mb-1">No menu items yet</h3>
                  <p className="text-sm text-muted-foreground">This chef has not added meals yet.</p>
                </div>
              ) : (
                filteredMenu.map((item) => {
                  const isSoldOut = item.availability === 'sold_out';
                  const cartQty = cart
                    .filter((c) => c.itemId === item.id)
                    .reduce((sum, c) => sum + c.qty, 0);

                  return (
                    <div
                      key={item.id}
                      className={`flex gap-4 p-4 bg-card transition-all duration-200 rounded-xl my-0.5 hover:bg-muted/25 ${
                        isSoldOut ? 'opacity-60' : 'cursor-pointer'
                      }`}
                    >
                      <button
                        onClick={() => openCustomization(item)}
                        disabled={isSoldOut}
                        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-muted shrink-0 focus:outline-none group/img"
                        aria-label={`Customize ${item.title}`}
                      >
                        <img
                          src={item.image}
                          alt={item.imageAlt}
                          className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        {item.popular && (
                          <div className="absolute top-1.5 left-1.5 bg-amber-400 text-white text-[9px] font-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" />
                            Popular
                          </div>
                        )}
                        {cartQty > 0 && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary text-white text-[10px] font-700 rounded-full flex items-center justify-center font-tabular">
                            {cartQty}
                          </div>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => openCustomization(item)}
                          disabled={isSoldOut}
                          className="text-left w-full"
                        >
                          <h3 className="text-[14px] font-700 text-foreground leading-snug tracking-snug">{item.title}</h3>
                          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{item.description}</p>
                        </button>

                        {item.availabilityLabel && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-600 px-2 py-0.5 rounded-full ${AVAILABILITY_STYLES[item.availability]}`}>
                              {item.availability === 'limited' && <Zap className="w-2.5 h-2.5" />}
                              {item.availability === 'available' && <CheckCircle className="w-2.5 h-2.5" />}
                              {item.availabilityLabel}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <span className="text-[15px] font-700 text-foreground font-tabular tracking-snug">${item.price}</span>
                            {item.calories && item.calories > 0 && (
                              <span className="text-[11px] text-muted-foreground ml-1.5">{item.calories} cal</span>
                            )}
                          </div>

                          {isSoldOut ? (
                            <span className="text-[12px] font-600 text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                              Sold Out
                            </span>
                          ) : (
                            <button
                              onClick={() => openCustomization(item)}
                              className={`flex items-center gap-1.5 text-[12px] font-600 px-3.5 py-1.5 rounded-full active:scale-95 transition-all duration-150 shadow-sm shadow-primary/15 ${
                                cartQty > 0
                                  ? 'bg-primary/8 text-primary border border-primary/20 hover:bg-primary hover:text-white hover:border-primary'
                                  : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20'
                              }`}
                            >
                              {cartQty > 0 ? (
                                <>
                                  <span className="font-tabular">{cartQty}</span>
                                  <span>in cart</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-base leading-none">+</span>
                                  Add
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {item.modifierGroups && item.modifierGroups.length > 0 && !isSoldOut && (
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            Customizable · {item.modifierGroups.filter((g) => g.required).length > 0 ? 'Required choices' : 'Optional add-ons'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isOwnVendorProfile ? (
              <div className="border-t border-border/50">
                <OrdersTab />
              </div>
            ) : null}
          </section>

          <section id="vendor-reviews" className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4">
              <h2 className="text-base font-700 text-foreground">Reviews</h2>
              <p className="text-sm text-muted-foreground mt-1">What customers are saying.</p>
            </div>

            {vendor.reviewCount > 0 ? (
              <ChefReviews
                chefName={vendor.name}
                aggregateRating={vendor.rating}
                reviewCount={vendor.reviewCount}
                reviews={MOCK_REVIEWS}
              />
            ) : (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-700 text-foreground mb-1">No reviews yet</h3>
                <p className="text-sm text-muted-foreground">This chef has not received any reviews yet.</p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 space-y-4">
            <div>
              <h2 className="text-base font-700 text-foreground">About</h2>
              <p className="text-sm text-muted-foreground mt-1">Chef details, location, and hours.</p>
            </div>

            <p className="text-[14px] text-muted-foreground leading-relaxed">{vendor.bio}</p>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 space-y-4">
            <div>
              <h2 className="text-base font-700 text-foreground">Trust & badges</h2>
              <p className="text-sm text-muted-foreground mt-1">Verification details and earned badges.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <TrustBadgeRow badges={trustScore.badges} compact showLocked profile={{
                avatar_url: (vendorOverride as any)?.avatar || (vendor as any)?.avatar,
                bio: vendor.bio,
                email_verified: (vendorOverride as any)?.email_verified ?? false,
                phone_verified: (vendorOverride as any)?.phone_verified ?? false,
                identity_verified: (vendorOverride as any)?.identity_verified ?? false,
                completed_orders: (vendorOverride as any)?.completed_orders ?? 0,
                complaints_count: (vendorOverride as any)?.complaints_count ?? 0,
                rating_avg: vendor.rating,
                rating_count: vendor.reviewCount,
              }} credentials={vendorCredentials} limit={3} />
              <Link href="/badges" className="inline-flex items-center text-[11px] font-semibold text-primary hover:underline">View badge requirements</Link>
            </div>

            <TrustVerificationSection score={trustScore} credentials={vendorCredentials} canManage={isOwnVendorProfile} profile={{
              avatar_url: (vendorOverride as any)?.avatar || (vendor as any)?.avatar,
              bio: vendor.bio,
              email_verified: (vendorOverride as any)?.email_verified ?? false,
              phone_verified: (vendorOverride as any)?.phone_verified ?? false,
              identity_verified: (vendorOverride as any)?.identity_verified ?? false,
              completed_orders: (vendorOverride as any)?.completed_orders ?? 0,
              complaints_count: (vendorOverride as any)?.complaints_count ?? 0,
              rating_avg: vendor.rating,
              rating_count: vendor.reviewCount,
            }} />
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-transparent pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto space-y-3">
            <button
              onClick={() => document.getElementById('vendor-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background px-5 py-3.5 rounded-2xl shadow-elevated"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 ? 'Order Now' : 'View Menu'}
            </button>

            {cartCount > 0 &&
            <button
            onClick={() => setShowCart(true)}
            className="w-full flex items-center justify-between bg-primary text-white px-5 py-3.5 rounded-2xl shadow-elevated shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-700">
                  {cartCount}
                </div>
                <span className="font-600 tracking-snug">View Cart</span>
              </div>
              <span className="font-700 font-tabular">${cartTotal.toFixed(2)}</span>
            </button>
            }
          </div>
        </div>

      {customizingItem &&
      <CustomizationModal
        item={customizingItem}
        modifierGroups={customizingItem.modifierGroups ?? []}
        chefName={vendor.name}
        chefAvatar={vendor.avatar}
        existingCartItem={editingCartItem}
        onConfirm={handleCustomizationConfirm}
        onClose={() => {
          setCustomizingItem(null);
          setEditingCartItem(null);
        }} />

      }

      {showCart &&
      <CartDrawer
        cart={cart}
        modifierGroupsMap={modifierGroupsMap}
        onEdit={handleEditCartItem}
        onRemove={handleRemoveFromCart}
        onClose={() => setShowCart(false)} />

      }
    </AppLayout>);

}

export default function VendorProfilePage() {
  return (
    <Suspense fallback={
    <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    }>
      <VendorProfileContent />
    </Suspense>);

}
