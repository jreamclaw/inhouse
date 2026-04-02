'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Truck,
  X,
  ShoppingBag,
  LocateFixed,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { milesBetween } from '@/lib/location/distance';

type SortOption = 'distance' | 'rating' | 'delivery' | 'fee';
type LocationSource = 'browser' | 'saved-profile' | 'manual' | 'none';

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
  knownFor: string;
  locationLabel: string;
  serviceRadiusMiles: number;
}

interface DbVendorRow {
  id: string;
  full_name: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  service_radius_miles: number | null;
}

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'chef', label: 'Chefs', emoji: '👨‍🍳' },
];

const SORT_OPTIONS: { id: SortOption; label: string; icon: string }[] = [
  { id: 'distance', label: 'Nearest', icon: '📍' },
  { id: 'rating', label: 'Top Rated', icon: '⭐' },
  { id: 'delivery', label: 'Fastest', icon: '⚡' },
  { id: 'fee', label: 'Lowest Fee', icon: '💰' },
];

const CUSTOMER_RADIUS_OPTIONS = [5, 10, 15, 25];
const DEFAULT_LOCATION = 'Set your location';
const VENDOR_AVATAR_FALLBACK = '/assets/images/no_image.png';

function PriceRange({ range }: { range: '$' | '$$' | '$$$' }) {
  return (
    <span className="text-xs text-muted-foreground font-500">
      {['$', '$$', '$$$'].map((p, i) => (
        <span key={i} className={p.length <= range.length ? 'text-foreground' : 'opacity-30'}>$</span>
      ))}
    </span>
  );
}

function formatDistance(distance: number) {
  if (distance < 1) return '< 1 mi';
  return `${distance.toFixed(1)} mi`;
}

function inferKnownFor(vendor: DbVendorRow) {
  const bio = vendor.bio?.trim();
  if (!bio) return 'Chef specials';
  const firstSentence = bio.split(/[.!?]/)[0]?.trim();
  if (!firstSentence) return 'Chef specials';
  return firstSentence.length > 44 ? `${firstSentence.slice(0, 41)}...` : firstSentence;
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/25 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-250 active:scale-[0.99] group shadow-subtle">
      <Link href={`/vendor-profile?id=${vendor.id}`} className="block">
        <div className="relative h-44 overflow-hidden bg-muted">
          <img src={vendor.image} alt={vendor.imageAlt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute top-3 right-3 bg-black/45 backdrop-blur-sm text-white text-[11px] font-700 px-2.5 py-1 rounded-full shrink-0">
            {formatDistance(vendor.distance)}
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-700 text-base leading-tight truncate">{vendor.name}</p>
            <p className="text-white/85 text-xs truncate mt-0.5">{vendor.cuisine}</p>
          </div>
        </div>
      </Link>

      <div className="px-4 pt-3.5 pb-4">
        <div className="flex items-center gap-2 mb-2.5 min-w-0">
          <img src={vendor.avatar} alt={`${vendor.name} vendor avatar`} className="w-8 h-8 rounded-full object-cover border border-border/50 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-700 text-foreground truncate">{vendor.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{vendor.locationLabel}</p>
          </div>
          <PriceRange range={vendor.priceRange} />
        </div>

        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>{formatDistance(vendor.distance)}</span>
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{vendor.deliveryTime}</span>
          </span>
        </div>

        <div className="rounded-xl bg-muted/60 px-3 py-2.5 mb-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-700 mb-1">Known for</p>
          <p className="text-[13px] text-foreground font-600 leading-snug">{vendor.knownFor}</p>
        </div>

        <Link href={`/vendor-profile?id=${vendor.id}`} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-700 transition-all duration-200 tracking-snug bg-primary text-white hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98] shadow-sm shadow-primary/15">
          <ShoppingBag className="w-4 h-4" />
          View Chef
        </Link>
      </div>
    </div>
  );
}

export default function NearbyPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [customerRadiusMiles, setCustomerRadiusMiles] = useState<number>(10);
  const [customInput, setCustomInput] = useState('');
  const [manualLocationLabel, setManualLocationLabel] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION);
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource>('none');
  const [locationError, setLocationError] = useState('');

  const { user, profile } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (profile?.location && locationSource === 'none') {
      setLocationLabel(profile.location);
    }
    if (typeof profile?.latitude === 'number' && typeof profile?.longitude === 'number' && locationSource === 'none') {
      setLocationCoords({ latitude: profile.latitude, longitude: profile.longitude });
      setLocationSource('saved-profile');
      setLocationLabel(profile.location || 'Saved location');
    }
  }, [profile, locationSource]);

  useEffect(() => {
    requestBrowserLocation();
  }, [user?.id]);

  useEffect(() => {
    loadVendors();
  }, [profile?.id, locationCoords?.latitude, locationCoords?.longitude, customerRadiusMiles, manualLocationLabel]);

  const requestBrowserLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Browser location is unavailable. Using saved profile location if available.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setLocationCoords(nextCoords);
        setLocationSource('browser');
        setLocationError('');
        setLocationLabel(profile?.location || `${nextCoords.latitude.toFixed(3)}, ${nextCoords.longitude.toFixed(3)}`);

        if (user?.id) {
          try {
            await supabase
              .from('user_profiles')
              .update({
                latitude: nextCoords.latitude,
                longitude: nextCoords.longitude,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);
          } catch {}
        }
      },
      () => {
        if (typeof profile?.latitude === 'number' && typeof profile?.longitude === 'number') {
          setLocationCoords({ latitude: profile.latitude, longitude: profile.longitude });
          setLocationSource('saved-profile');
          setLocationLabel(profile.location || 'Saved location');
          setLocationError('Location permission denied. Using your saved profile location.');
        } else if (manualLocationLabel.trim()) {
          setLocationSource('manual');
          setLocationLabel(manualLocationLabel.trim());
          setLocationCoords(null);
          setLocationError('Location permission denied. Using your manual location fallback.');
        } else {
          setLocationSource('none');
          setLocationCoords(null);
          setLocationLabel(profile?.location || DEFAULT_LOCATION);
          setLocationError('Location permission denied. Add or save a location to see nearby chefs accurately.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const loadVendors = async () => {
    setLoadingVendors(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, bio, location, avatar_url, latitude, longitude, service_radius_miles')
        .eq('role', 'chef')
        .eq('vendor_onboarding_complete', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const hasCoords = typeof locationCoords?.latitude === 'number' && typeof locationCoords?.longitude === 'number';
      const normalizedManual = manualLocationLabel.trim().toLowerCase();

      const mapped: Vendor[] = ((data as DbVendorRow[] | null) ?? [])
        .map((row) => {
          if (typeof row.latitude !== 'number' || typeof row.longitude !== 'number') return null;

          const chefServiceRadius = row.service_radius_miles || 10;
          const distance = hasCoords
            ? milesBetween(locationCoords!.latitude, locationCoords!.longitude, row.latitude, row.longitude)
            : null;

          const insideCustomerRadius = distance == null ? false : distance <= customerRadiusMiles;
          const insideChefRadius = distance == null ? false : distance <= chefServiceRadius;

          if (hasCoords && (!insideCustomerRadius || !insideChefRadius)) return null;

          if (!hasCoords) {
            if (!normalizedManual) return null;
            const rowLocation = (row.location || '').toLowerCase();
            if (!rowLocation.includes(normalizedManual)) return null;
          }

          return {
            id: row.id,
            name: row.full_name || 'Chef',
            cuisine: row.bio?.split('.')[0] || 'Personal Chef',
            category: 'chef',
            image: row.avatar_url || VENDOR_AVATAR_FALLBACK,
            imageAlt: `${row.full_name || 'Chef'} profile preview`,
            avatar: row.avatar_url || VENDOR_AVATAR_FALLBACK,
            rating: 0,
            reviewCount: 0,
            distance: distance == null ? 0 : Number(distance.toFixed(1)),
            deliveryTime: '25–35 min',
            deliveryFee: 0,
            priceRange: '$$',
            isOpen: true,
            knownFor: inferKnownFor(row),
            locationLabel: row.location || 'Location unavailable',
            serviceRadiusMiles: chefServiceRadius,
          };
        })
        .filter((row): row is Vendor => Boolean(row));

      setVendors(mapped);
    } catch {
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleLocationChange = async (loc: string) => {
    const nextLabel = loc.trim();
    setManualLocationLabel(nextLabel);
    setLocationLabel(nextLabel || DEFAULT_LOCATION);
    setLocationSource(nextLabel ? 'manual' : 'none');
    setLocationCoords(null);
    setShowLocationPicker(false);
    setCustomInput('');

    if (user?.id && nextLabel) {
      try {
        await supabase
          .from('user_profiles')
          .update({ location: nextLabel, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch {}
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) handleLocationChange(customInput.trim());
  };

  const filteredVendors = useMemo(() => {
    return vendors
      .filter((v) => {
        const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
        const matchesSearch =
          !searchQuery ||
          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.knownFor.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.locationLabel.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesOpen = !showOpenOnly || v.isOpen;
        return matchesCategory && matchesSearch && matchesOpen;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') return a.distance - b.distance;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'delivery') return a.deliveryTime.localeCompare(b.deliveryTime);
        if (sortBy === 'fee') return a.deliveryFee - b.deliveryFee;
        return 0;
      });
  }, [vendors, selectedCategory, searchQuery, showOpenOnly, sortBy]);

  const activeSortLabel = SORT_OPTIONS.find((s) => s.id === sortBy);

  return (
    <AppLayout>
      <div className="max-w-screen-lg mx-auto px-4 py-0">
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md pt-4 pb-3 -mx-4 px-4 border-b border-border">
          <div className="flex items-start justify-between mb-3 relative gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Showing chefs near</p>
                <button onClick={() => setShowLocationPicker(!showLocationPicker)} className="flex items-center gap-1 text-sm font-700 text-foreground hover:text-primary transition-colors min-w-0">
                  <span className="truncate max-w-[220px] sm:max-w-[360px]">{locationLabel}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${showLocationPicker ? 'rotate-180' : ''}`} />
                </button>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Source: {locationSource === 'browser' ? 'live browser location' : locationSource === 'saved-profile' ? 'saved profile coordinates' : locationSource === 'manual' ? 'manual location fallback' : 'no valid location yet'}
                </p>
              </div>
            </div>
            <button onClick={requestBrowserLocation} className="shrink-0 flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-full border border-border hover:border-primary/30 hover:text-primary transition-colors">
              <LocateFixed className="w-3.5 h-3.5" /> Refresh
            </button>

            {showLocationPicker && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-border space-y-3">
                  <div>
                    <p className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Manual fallback location</p>
                    <form onSubmit={handleCustomSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter city or zip code..."
                        className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                        autoFocus
                      />
                      <button type="submit" className="bg-primary text-white text-sm font-600 px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                        Use
                      </button>
                    </form>
                  </div>
                  <div>
                    <p className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Search radius</p>
                    <div className="flex flex-wrap gap-2">
                      {CUSTOMER_RADIUS_OPTIONS.map((radius) => (
                        <button
                          key={radius}
                          type="button"
                          onClick={() => setCustomerRadiusMiles(radius)}
                          className={`px-3 py-1.5 rounded-full text-xs font-700 border transition-colors ${customerRadiusMiles === radius ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
                        >
                          {radius} mi
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {locationError && <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">{locationError}</p>}

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chefs or cuisines..."
              className="w-full bg-muted rounded-xl pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 whitespace-nowrap transition-all duration-200 shrink-0 active:scale-95 ${selectedCategory === cat.id ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105' : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105 hover:shadow-sm'}`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3 gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            <span className="font-700 text-foreground">{filteredVendors.length}</span> chefs within {customerRadiusMiles} miles
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowOpenOnly(!showOpenOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border transition-all ${showOpenOnly ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${showOpenOnly ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
              Open now
            </button>

            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
              <span className="text-xs font-600 text-muted-foreground">Radius</span>
              <select
                value={customerRadiusMiles}
                onChange={(e) => setCustomerRadiusMiles(Number(e.target.value))}
                className="bg-transparent text-xs font-700 text-foreground outline-none"
              >
                {CUSTOMER_RADIUS_OPTIONS.map((radius) => (
                  <option key={radius} value={radius}>{radius} mi</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border transition-all ${showSortMenu ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{activeSortLabel?.icon}</span>
                {activeSortLabel?.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[170px]">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider">Sort by</p>
                  </div>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${sortBy === opt.id ? 'bg-primary/10 text-primary font-700' : 'text-foreground hover:bg-muted'}`}
                    >
                      <span>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loadingVendors ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-card rounded-2xl overflow-hidden border border-border/50 animate-pulse">
                <div className="h-44 bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-10 bg-muted rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVendors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
            {filteredVendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-700 text-foreground mb-1">No chefs found in range</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {locationSource === 'none'
                ? 'Turn on location or add a manual fallback location to search nearby chefs.'
                : 'No chefs match your current location and radius yet. Try increasing your radius or refreshing location.'}
            </p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setShowOpenOnly(false); setCustomerRadiusMiles(25); }}
              className="mt-4 text-sm font-600 text-primary hover:underline"
            >
              Widen search
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
