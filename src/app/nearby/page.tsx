'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import {
  MapPin,
  Star,
  Clock,
  Navigation,
  SlidersHorizontal,
  ChevronDown,
  Search,
  Flame,
  Truck,
  X,
  Zap,
  TrendingUp,
  ShoppingBag,
  ChevronRight } from
'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface Vendor {
  id: string;
  name: string;
  cuisine: string;
  category: string;
  image: string;
  imageAlt: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  distance: number;
  deliveryTime: string;
  deliveryFee: number;
  priceRange: '$' | '$$' | '$$$';
  isOpen: boolean;
  closesAt?: string;
  opensAt?: string;
  tags: string[];
  isFeatured?: boolean;
  isNew?: boolean;
  previewImages: {src: string;alt: string;}[];
  popularDish: {label: string;name: string;image: string;imageAlt: string;};
  urgency?: 'closes-soon' | 'selling-fast' | 'limited-plates' | 'busy';
}

type SortOption = 'distance' | 'rating' | 'delivery' | 'fee';

const CATEGORIES = [
{ id: 'all', label: 'All', emoji: '🍽️' },
{ id: 'pizza', label: 'Pizza', emoji: '🍕' },
{ id: 'wings', label: 'Wings', emoji: '🍗' },
{ id: 'desserts', label: 'Desserts', emoji: '🍰' },
{ id: 'food-truck', label: 'Food Trucks', emoji: '🚚' },
{ id: 'seafood', label: 'Seafood', emoji: '🦞' },
{ id: 'bbq', label: 'BBQ', emoji: '🔥' },
{ id: 'vegan', label: 'Vegan', emoji: '🥗' },
{ id: 'soul-food', label: 'Soul Food', emoji: '🍛' }];


const SORT_OPTIONS: {id: SortOption;label: string;icon: string;}[] = [
{ id: 'distance', label: 'Nearest', icon: '📍' },
{ id: 'rating', label: 'Top Rated', icon: '⭐' },
{ id: 'delivery', label: 'Fastest', icon: '⚡' },
{ id: 'fee', label: 'Lowest Fee', icon: '💰' }];


const CITIES = [
'Washington, DC',
'New York, NY',
'Los Angeles, CA',
'Chicago, IL',
'Houston, TX',
'Atlanta, GA',
'Miami, FL',
'Seattle, WA',
'Austin, TX',
'Boston, MA'];


const DEFAULT_LOCATION = 'Set your location';

interface DbVendorRow {
  id: string;
  full_name: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
}

const VENDOR_CARD_FALLBACK = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80';
const VENDOR_DISH_FALLBACK = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80';
const VENDOR_AVATAR_FALLBACK = '/assets/images/no_image.png';

const MOCK_VENDORS: Vendor[] = [
{
  id: 'chef-marco',
  name: "Marco's Kitchen",
  cuisine: 'Italian Fine Dining',
  category: 'pizza',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_17d5234ad-1772079177830.png",
  imageAlt: 'Rustic Italian kitchen with fresh pasta and wood-fired oven',
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_17d5234ad-1772079177830.png",
  rating: 4.9,
  reviewCount: 312,
  distance: 1.2,
  deliveryTime: '35–50 min',
  deliveryFee: 2.99,
  priceRange: '$$$',
  isOpen: true,
  closesAt: '10:00 PM',
  tags: ['Pasta', 'Pizza', 'Fine Dining'],
  isFeatured: true,
  popularDish: {
    label: 'Best Seller',
    name: 'Truffle Pasta',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_10484edf7-1764995455960.png",
    imageAlt: 'Truffle tagliatelle pasta with parmesan'
  },
  previewImages: [
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_10484edf7-1764995455960.png", alt: 'Truffle tagliatelle pasta with parmesan' },
  { src: 'https://images.unsplash.com/photo-1677357903776-6a5c18c729e6', alt: 'Margherita pizza with fresh basil' },
  { src: 'https://images.unsplash.com/photo-1628413810760-a01315dd9fa0', alt: 'Tiramisu dessert with cocoa dusting' }]

},
{
  id: 'wing-queen',
  name: "Queen's Wing Spot",
  cuisine: 'American Soul',
  category: 'wings',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_133fdde6d-1770812088006.png",
  imageAlt: 'Crispy golden chicken wings with dipping sauces on a wooden board',
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_133fdde6d-1770812088006.png",
  rating: 4.7,
  reviewCount: 189,
  distance: 0.8,
  deliveryTime: '20–30 min',
  deliveryFee: 0,
  priceRange: '$$',
  isOpen: true,
  closesAt: '11:00 PM',
  tags: ['Wings', 'Tenders', 'Sauces'],
  isNew: true,
  urgency: 'selling-fast',
  popularDish: {
    label: 'Popular',
    name: 'Lemon Pepper Wings',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_12671b5dc-1765694208615.png",
    imageAlt: 'Lemon pepper wings with ranch dip'
  },
  previewImages: [
  { src: 'https://images.unsplash.com/photo-1665861829442-c4113d9ce5be', alt: 'Saucy buffalo wings with celery sticks' },
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_12671b5dc-1765694208615.png", alt: 'Lemon pepper wings with ranch dip' },
  { src: 'https://images.unsplash.com/photo-1584880928340-aa0bc1d56e30', alt: 'Honey garlic wings with sesame seeds' }]

},
{
  id: 'sweet-tooth',
  name: 'Sweet Tooth Bakery',
  cuisine: 'Artisan Desserts',
  category: 'desserts',
  image: 'https://images.unsplash.com/photo-1688205792559-3e0dbc7c5dc9',
  imageAlt: 'Colorful artisan pastries and cakes displayed in a bakery case',
  avatar: 'https://images.unsplash.com/photo-1688205792559-3e0dbc7c5dc9',
  rating: 4.8,
  reviewCount: 241,
  distance: 1.5,
  deliveryTime: '25–40 min',
  deliveryFee: 1.99,
  priceRange: '$$',
  isOpen: true,
  closesAt: '9:00 PM',
  tags: ['Cakes', 'Cookies', 'Pastries'],
  urgency: 'closes-soon',
  popularDish: {
    label: 'Top Pick',
    name: 'Chocolate Lava Cake',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_120fa45f0-1772738290754.png",
    imageAlt: 'Layered chocolate cake with ganache frosting'
  },
  previewImages: [
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_120fa45f0-1772738290754.png", alt: 'Layered chocolate cake with ganache frosting' },
  { src: 'https://images.unsplash.com/photo-1582219212169-1e96a844e4c3', alt: 'Assorted macarons in pastel colors' },
  { src: 'https://images.unsplash.com/photo-1635788715075-cdb1bbd0551d', alt: 'Freshly baked croissants on a cooling rack' }]

},
{
  id: 'rolling-smoke',
  name: 'Rolling Smoke BBQ',
  cuisine: 'Texas BBQ',
  category: 'bbq',
  image: "https://images.unsplash.com/photo-1731848358994-c06e72c1ae58",
  imageAlt: 'Smoky BBQ brisket being sliced on a cutting board with sides',
  avatar: "https://images.unsplash.com/photo-1731848358994-c06e72c1ae58",
  rating: 4.6,
  reviewCount: 156,
  distance: 2.3,
  deliveryTime: '40–55 min',
  deliveryFee: 3.49,
  priceRange: '$$',
  isOpen: false,
  opensAt: '11:00 AM',
  tags: ['Brisket', 'Ribs', 'Smoked'],
  isFeatured: true,
  urgency: 'busy',
  popularDish: {
    label: 'Top Pick',
    name: 'BBQ Ribs',
    image: 'https://images.unsplash.com/photo-1694717475960-c7b9fd7226f1',
    imageAlt: 'Pork ribs with BBQ sauce and coleslaw'
  },
  previewImages: [
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_1182e59e5-1772474020621.png", alt: 'Thick-cut smoked brisket with bark crust' },
  { src: 'https://images.unsplash.com/photo-1694717475960-c7b9fd7226f1', alt: 'Pork ribs with BBQ sauce and coleslaw' },
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_11f60102a-1772419526645.png", alt: 'Loaded baked potato with pulled pork' }]

},
{
  id: 'taco-loco',
  name: 'Taco Loco Truck',
  cuisine: 'Mexican Street Food',
  category: 'food-truck',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f8319c3d-1772076522406.png",
  imageAlt: 'Colorful food truck with Mexican street tacos and fresh toppings',
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1f8319c3d-1772076522406.png",
  rating: 4.5,
  reviewCount: 98,
  distance: 0.5,
  deliveryTime: '15–25 min',
  deliveryFee: 0,
  priceRange: '$',
  isOpen: true,
  closesAt: '8:00 PM',
  tags: ['Tacos', 'Burritos', 'Street Food'],
  isNew: true,
  urgency: 'busy',
  popularDish: {
    label: 'Top Pick',
    name: 'Loaded Tacos',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f8319c3d-1772076522406.png",
    imageAlt: 'Street tacos with cilantro and onion'
  },
  previewImages: [
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_1f8319c3d-1772076522406.png", alt: 'Street tacos with cilantro and onion' },
  { src: 'https://images.unsplash.com/photo-1585238342107-49a3cdace47f', alt: 'Loaded burrito with rice and beans' },
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_127a0da2c-1772056083261.png", alt: 'Elote corn with cotija cheese and chili' }]

},
{
  id: 'ocean-catch',
  name: "Ocean's Catch",
  cuisine: 'Fresh Seafood',
  category: 'seafood',
  image: 'https://images.unsplash.com/photo-1703847262387-b484162cc009',
  imageAlt: 'Fresh seafood platter with lobster, shrimp, and crab on ice',
  avatar: 'https://images.unsplash.com/photo-1703847262387-b484162cc009',
  rating: 4.8,
  reviewCount: 203,
  distance: 1.9,
  deliveryTime: '30–45 min',
  deliveryFee: 2.49,
  priceRange: '$$$',
  isOpen: true,
  closesAt: '9:30 PM',
  tags: ['Lobster', 'Shrimp', 'Crab'],
  urgency: 'limited-plates',
  popularDish: {
    label: 'Best Seller',
    name: 'Grilled Lobster Tail',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_11733dc26-1772250152920.png",
    imageAlt: 'Grilled lobster tail with lemon butter'
  },
  previewImages: [
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_11733dc26-1772250152920.png", alt: 'Grilled lobster tail with lemon butter' },
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_14dc0715e-1768243004327.png", alt: 'Shrimp and grits with cajun seasoning' },
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_1fbaeb691-1773849003458.png", alt: 'Crab cakes with remoulade sauce' }]

},
{
  id: 'green-bowl',
  name: 'Green Bowl Co.',
  cuisine: 'Plant-Based',
  category: 'vegan',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1d6965a2e-1772054986882.png",
  imageAlt: 'Colorful vegan grain bowl with roasted vegetables and tahini dressing',
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1d6965a2e-1772054986882.png",
  rating: 4.4,
  reviewCount: 87,
  distance: 1.1,
  deliveryTime: '20–35 min',
  deliveryFee: 1.49,
  priceRange: '$$',
  isOpen: true,
  closesAt: '7:00 PM',
  tags: ['Bowls', 'Smoothies', 'Wraps'],
  urgency: 'closes-soon',
  popularDish: {
    label: 'Popular',
    name: 'Buddha Bowl',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_13da08aa3-1772139613628.png",
    imageAlt: 'Buddha bowl with quinoa and roasted veggies'
  },
  previewImages: [
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_13da08aa3-1772139613628.png", alt: 'Buddha bowl with quinoa and roasted veggies' },
  { src: 'https://images.unsplash.com/photo-1562013841-09400a6bb126', alt: 'Green smoothie bowl with granola and berries' },
  { src: 'https://images.unsplash.com/photo-1623428454847-564efeafd9da', alt: 'Avocado toast with microgreens and seeds' }]

},
{
  id: 'mama-soul',
  name: "Mama's Soul Kitchen",
  cuisine: 'Southern Soul Food',
  category: 'soul-food',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_156a1ca02-1772507931597.png",
  imageAlt: 'Southern soul food spread with fried chicken, collard greens, and cornbread',
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_156a1ca02-1772507931597.png",
  rating: 4.9,
  reviewCount: 427,
  distance: 2.7,
  deliveryTime: '45–60 min',
  deliveryFee: 0,
  priceRange: '$$',
  isOpen: true,
  closesAt: '8:30 PM',
  tags: ['Fried Chicken', 'Greens', 'Mac & Cheese'],
  isFeatured: true,
  urgency: 'selling-fast',
  popularDish: {
    label: 'Best Seller',
    name: 'Fried Chicken Plate',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1ff1dcd0c-1772147536543.png",
    imageAlt: 'Crispy fried chicken with honey drizzle'
  },
  previewImages: [
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_1ff1dcd0c-1772147536543.png", alt: 'Crispy fried chicken with honey drizzle' },
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_1454b4d3d-1773873742797.png", alt: 'Creamy mac and cheese with breadcrumb topping' },
  { src: "https://img.rocket.new/generatedImages/rocket_gen_img_160300e48-1773481522136.png", alt: 'Cornbread muffins with butter and honey' }]

}];


function PriceRange({ range }: {range: '$' | '$$' | '$$$';}) {
  return (
    <span className="text-xs text-muted-foreground font-500">
      {['$', '$$', '$$$'].map((p, i) =>
      <span key={i} className={p.length <= range.length ? 'text-foreground' : 'opacity-30'}>
          $
        </span>
      )}
    </span>);

}

function UrgencyBadge({ urgency, isOpen, closesAt }: {urgency?: Vendor['urgency'];isOpen: boolean;closesAt?: string;}) {
  if (!isOpen) return null;

  if (urgency === 'closes-soon') {
    return (
      <span className="flex items-center gap-1 bg-amber-500/15 text-amber-400 text-[10px] font-700 px-2 py-0.5 rounded-full border border-amber-500/20">
        <Clock className="w-2.5 h-2.5" />
        Closes Soon
      </span>);

  }
  if (urgency === 'selling-fast') {
    return (
      <span className="flex items-center gap-1 bg-orange-500/15 text-orange-400 text-[10px] font-700 px-2 py-0.5 rounded-full border border-orange-500/20">
        <TrendingUp className="w-2.5 h-2.5" />
        Selling Fast
      </span>);

  }
  if (urgency === 'limited-plates') {
    return (
      <span className="flex items-center gap-1 bg-red-500/15 text-red-400 text-[10px] font-700 px-2 py-0.5 rounded-full border border-red-500/20">
        <Flame className="w-2.5 h-2.5" />
        Limited Plates
      </span>);

  }
  if (urgency === 'busy') {
    return (
      <span className="flex items-center gap-1 bg-purple-500/15 text-purple-400 text-[10px] font-700 px-2 py-0.5 rounded-full border border-purple-500/20">
        <Zap className="w-2.5 h-2.5" />
        Busy
      </span>);

  }
  return null;
}

function VendorCard({ vendor }: {vendor: Vendor;}) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/25 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-250 active:scale-[0.99] group shadow-subtle">
      {/* Cover Image */}
      <Link href={`/vendor-profile?id=${vendor.id}`} className="block">
        <div className="relative h-40 overflow-hidden">
          <img
            src={vendor.image}
            alt={vendor.imageAlt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
          
          {/* Overlay badges top-left */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {vendor.isFeatured &&
            <span className="bg-primary text-white text-[10px] font-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Flame className="w-2.5 h-2.5" /> Featured
              </span>
            }
            {vendor.isNew &&
            <span className="bg-emerald-500 text-white text-[10px] font-700 px-2 py-0.5 rounded-full">
                New
              </span>
            }
          </div>
          {/* Open/Closed badge top-right */}
          <div className="absolute top-3 right-3">
            {vendor.isOpen ?
            <span className="bg-emerald-500/80 backdrop-blur-sm text-white text-[10px] font-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                Open Now
              </span> :
            <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-700 px-2.5 py-1 rounded-full">
                Opens {vendor.opensAt}
              </span>
            }
          </div>
        </div>
      </Link>

      {/* Popular Dish Preview */}
      <Link href={`/vendor-profile?id=${vendor.id}`} className="block">
        <div className="relative mx-3 -mt-5 mb-0 z-10">
          <div className="bg-card/96 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden flex items-center gap-2.5 px-3 py-2 shadow-card">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-border/50">
              <img
                src={vendor.popularDish.image}
                alt={vendor.popularDish.imageAlt}
                className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-primary font-700 uppercase tracking-wide leading-none mb-0.5">
                {vendor.popularDish.label}
              </p>
              <p className="text-[12px] font-600 text-foreground truncate leading-tight tracking-snug">
                {vendor.popularDish.name}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="px-3 pt-3 pb-3.5">
        {/* Vendor name + rating row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={vendor.avatar}
              alt={`${vendor.name} vendor avatar`}
              className="w-7 h-7 rounded-full object-cover border border-border/50 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-700 text-foreground text-[13px] leading-tight truncate tracking-snug">{vendor.name}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{vendor.cuisine}</p>
            </div>
          </div>
          {vendor.reviewCount > 0 ? (
            <div className="flex items-center gap-1 shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[12px] font-700 text-amber-500 font-tabular">{vendor.rating}</span>
              <span className="text-[10px] text-muted-foreground">({vendor.reviewCount})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 shrink-0 bg-muted px-2 py-0.5 rounded-full">
              <Star className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] font-600 text-muted-foreground">New</span>
            </div>
          )}
        </div>

        {/* Distance · Delivery · Fee row */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2.5 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="font-600 text-foreground">{vendor.location || 'Location unavailable'}</span>
          </span>
          <span className="opacity-30">·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {vendor.deliveryTime}
          </span>
          <span className="opacity-30">·</span>
          <span className="font-500 text-muted-foreground">
            Delivery info unavailable
          </span>
          <span className="ml-auto">
            <PriceRange range={vendor.priceRange} />
          </span>
        </div>

        {/* Urgency + availability row */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <UrgencyBadge urgency={vendor.urgency} isOpen={vendor.isOpen} closesAt={vendor.closesAt} />
          {vendor.isOpen && vendor.closesAt && !vendor.urgency &&
          <span className="text-[10px] text-muted-foreground">Closes {vendor.closesAt}</span>
          }
          {vendor.tags.slice(0, 2).map((tag) =>
          <span key={tag} className="bg-muted text-muted-foreground text-[10px] font-500 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          )}
        </div>

        {/* CTA Button */}
        <Link
          href={`/vendor-profile?id=${vendor.id}`}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-700 transition-all duration-200 tracking-snug ${
          vendor.isOpen ?
          'bg-primary text-white hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98] shadow-sm shadow-primary/15' :
          'bg-muted text-muted-foreground cursor-not-allowed'}`
          }
          onClick={vendor.isOpen ? undefined : (e) => e.preventDefault()}>
          <ShoppingBag className="w-4 h-4" />
          {vendor.isOpen ? 'Order Now' : 'View Menu'}
        </Link>
      </div>
    </div>);

}

export default function NearbyPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const { user, profile } = useAuth();
  const supabase = createClient();

  // Load saved location from profile
  useEffect(() => {
    if (profile?.location) {
      setUserLocation(profile.location);
    }
  }, [profile]);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoadingVendors(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, bio, location, avatar_url')
        .eq('role', 'chef')
        .eq('vendor_onboarding_complete', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const normalizedUserLocation = (userLocation || '').toLowerCase().replace(/[^a-z0-9, ]/g, ' ').replace(/\s+/g, ' ').trim();
      const hasChosenLocation = normalizedUserLocation.length > 0 && normalizedUserLocation !== 'set your location';
      const mapped: Vendor[] = ((data as DbVendorRow[] | null) ?? [])
        .filter((row) => {
          if (!hasChosenLocation) return true;
          const normalizedRowLocation = (row.location || '').toLowerCase().replace(/[^a-z0-9, ]/g, ' ').replace(/\s+/g, ' ').trim();
          if (!normalizedRowLocation) return false;
          return normalizedRowLocation.includes(normalizedUserLocation) || normalizedUserLocation.includes(normalizedRowLocation);
        })
        .map((row, index) => ({
        id: row.id,
        name: row.full_name || 'Chef',
        cuisine: row.bio?.split('.')[0] || 'Local chef',
        category: 'all',
        image: VENDOR_CARD_FALLBACK,
        imageAlt: `${row.full_name || 'Chef'} featured kitchen preview`,
        avatar: row.avatar_url || VENDOR_AVATAR_FALLBACK,
        rating: 0,
        reviewCount: 0,
        distance: index + 1,
        deliveryTime: 'Details unavailable',
        deliveryFee: 0,
        priceRange: '$$',
        isOpen: true,
        tags: row.location ? [row.location, 'Local Chef'] : ['Local Chef'],
        popularDish: {
          label: 'Chef Preview',
          name: "See what's cooking",
          image: VENDOR_DISH_FALLBACK,
          imageAlt: `${row.full_name || 'Chef'} featured dish preview`,
        },
        previewImages: [
          { src: VENDOR_CARD_FALLBACK, alt: `${row.full_name || 'Chef'} kitchen preview` },
          { src: VENDOR_DISH_FALLBACK, alt: `${row.full_name || 'Chef'} featured dish preview` },
        ],
      }));

      setVendors(mapped);
    } catch {
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleLocationChange = async (loc: string) => {
    setUserLocation(loc);
    setShowLocationPicker(false);
    setCustomInput('');
    if (user) {
      try {
        await supabase.
        from('user_profiles').
        update({ location: loc, updated_at: new Date().toISOString() }).
        eq('id', user.id);
      } catch {

        // silently fail — location is still updated in UI
      }}
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      handleLocationChange(customInput.trim());
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    const matchesSearch =
    !searchQuery ||
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesOpen = !showOpenOnly || v.isOpen;
    return matchesCategory && matchesSearch && matchesOpen;
  }).sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'delivery') {
      const aMin = parseInt(a.deliveryTime.split('–')[0]);
      const bMin = parseInt(b.deliveryTime.split('–')[0]);
      return aMin - bMin;
    }
    if (sortBy === 'fee') return a.deliveryFee - b.deliveryFee;
    return 0;
  });

  const openCount = vendors.filter((v) => v.isOpen).length;
  const activeSortLabel = SORT_OPTIONS.find((s) => s.id === sortBy);

  return (
    <AppLayout>
      <div className="max-w-screen-lg mx-auto px-4 py-0">
        {/* Sticky Header */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md pt-4 pb-3 -mx-4 px-4 border-b border-border">
          {/* Location row */}
          <div className="flex items-center justify-between mb-3 relative">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Navigation className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Showing vendors near</p>
                <button
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="flex items-center gap-1 text-sm font-700 text-foreground hover:text-primary transition-colors"
                  suppressHydrationWarning>
                  
                  {userLocation}
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${showLocationPicker ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400">{openCount} open now</span>
            </div>

            {/* Location picker dropdown */}
            {showLocationPicker &&
            <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Change Location</p>
                  <form onSubmit={handleCustomSubmit} className="flex gap-2">
                    <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter city or zip code..."
                    className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus />
                  
                    <button
                    type="submit"
                    className="bg-primary text-white text-sm font-600 px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    suppressHydrationWarning>
                    
                      Go
                    </button>
                  </form>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {CITIES.map((city) =>
                <button
                  key={city}
                  onClick={() => handleLocationChange(city)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left ${
                  userLocation === city ? 'text-primary font-600' : 'text-foreground'}`
                  }
                  suppressHydrationWarning>
                  
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      {city}
                      {userLocation === city && <span className="ml-auto text-xs text-primary">Current</span>}
                    </button>
                )}
                </div>
              </div>
            }
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors, cuisines, dishes..."
              className="w-full bg-muted rounded-xl pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              suppressHydrationWarning />
            
            {searchQuery &&
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              suppressHydrationWarning>
              
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            }
          </div>

          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map((cat) =>
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 whitespace-nowrap transition-all duration-200 shrink-0 active:scale-95 ${
              selectedCategory === cat.id ?
              'bg-primary text-white shadow-md shadow-primary/20 scale-105' :
              'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105 hover:shadow-sm'}`
              }
              suppressHydrationWarning>
              
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter + Sort bar */}
        <div className="flex items-center justify-between py-3 gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-700 text-foreground">{filteredVendors.length}</span> vendors found
          </p>
          <div className="flex items-center gap-2">
            {/* Open only toggle */}
            <button
              onClick={() => setShowOpenOnly(!showOpenOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border transition-all ${
              showOpenOnly ?
              'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'}`
              }
              suppressHydrationWarning>
              
              <span className={`w-1.5 h-1.5 rounded-full ${showOpenOnly ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
              Open now
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border transition-all ${
                showSortMenu ?
                'border-primary/40 bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'}`
                }
                suppressHydrationWarning>
                
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{activeSortLabel?.icon}</span>
                {activeSortLabel?.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>
              {showSortMenu &&
              <div className="absolute right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[170px]">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider">Sort by</p>
                  </div>
                  {SORT_OPTIONS.map((opt) =>
                <button
                  key={opt.id}
                  onClick={() => {setSortBy(opt.id);setShowSortMenu(false);}}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${
                  sortBy === opt.id ?
                  'bg-primary/10 text-primary font-700' : 'text-foreground hover:bg-muted'}`
                  }
                  suppressHydrationWarning>
                  
                      <span>{opt.icon}</span>
                      {opt.label}
                      {sortBy === opt.id && <span className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />}
                    </button>
                )}
                </div>
              }
            </div>
          </div>
        </div>

        {/* Featured section */}
        {selectedCategory === 'all' && !searchQuery && vendors.length > 0 &&
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-700 text-foreground">Local chefs on InHouse</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {vendors.slice(0, 6).map((vendor) =>
            <Link key={vendor.id} href={`/vendor-profile?id=${vendor.id}`} className="shrink-0 w-64 group">
                  <div className="relative h-36 rounded-2xl overflow-hidden">
                    <img
                  src={vendor.image}
                  alt={vendor.imageAlt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-700 text-sm leading-tight">{vendor.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-white/80 text-xs">
                          <MapPin className="w-3 h-3" /> {vendor.location || userLocation}
                        </span>
                        <span className="ml-auto bg-emerald-500/80 text-white text-[9px] font-700 px-1.5 py-0.5 rounded-full">
                          Live
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
            )}
            </div>
          </div>
        }

        {/* Vendor Grid */}
        {loadingVendors ?
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-card rounded-2xl overflow-hidden border border-border/50 animate-pulse">
                <div className="h-40 bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-10 bg-muted rounded-xl" />
                </div>
              </div>
            ))}
          </div> : filteredVendors.length > 0 ?
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
            {filteredVendors.map((vendor) =>
          <VendorCard key={vendor.id} vendor={vendor} />
          )}
          </div> :

        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-700 text-foreground mb-1">No chefs found yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {vendors.length === 0
                ? 'No chefs have completed onboarding yet. Once chefs join, they will appear here.'
                : 'Try adjusting your filters or search for something different.'}
            </p>
            <button
            onClick={() => {setSelectedCategory('all');setSearchQuery('');setShowOpenOnly(false);}}
            className="mt-4 text-sm font-600 text-primary hover:underline"
            suppressHydrationWarning>
            
              Clear all filters
            </button>
          </div>
        }
      </div>
    </AppLayout>);

}