'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChefHat, MapPin, Settings, Share2, ShoppingBag, BookOpen, LogOut, UserPlus, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import FollowListSheet, { type FollowListMode } from '@/components/social/FollowListSheet';

function parseHoursFromBio(bio?: string | null) {
  if (!bio) return { cleanBio: '', hours: null };
  const match = bio.match(/Hours:\s*([^\n]+)/i);
  const hours = match?.[1]?.trim() || null;
  const cleanBio = bio.replace(/\n?\n?Hours:\s*([^\n]+)/i, '').trim();
  return { cleanBio, hours };
}

function getTodayStatus(hours?: string | null, availabilityOverride?: 'open' | 'closed' | null) {
  if (availabilityOverride === 'open') {
    return { label: 'Open now', isOpen: true };
  }

  if (availabilityOverride === 'closed') {
    return { label: 'Closed manually', isOpen: false };
  }

  if (!hours || hours.toLowerCase().includes('closed all week')) {
    return { label: 'Closed now', isOpen: false };
  }

  const [daysPart = '', timePart = ''] = hours.split('•').map((part) => part.trim());
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

export default function ProfileHeader() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const [followerCount, setFollowerCount] = useState<number>(profile?.followers_count ?? 0);
  const [followingCount, setFollowingCount] = useState<number>(profile?.following_count ?? 0);
  const [sheetMode, setSheetMode] = useState<FollowListMode | null>(null);

  const isChef = profile?.role === 'chef';
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const username = profile?.username || user?.email?.split('@')[0] || 'user';
  const avatarUrl = profile?.avatar_url || null;
  const coverUrl = (profile as any)?.cover_url || null;
  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  const { cleanBio, hours } = useMemo(() => parseHoursFromBio(profile?.bio), [profile?.bio]);
  const openState = useMemo(() => getTodayStatus(hours, profile?.availability_override || null), [hours, profile?.availability_override]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied!');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch {
      toast.error('Failed to log out. Please try again.');
    }
  };

  return (
    <div className="bg-card border border-[#E5E5E5] dark:border-white/15 rounded-2xl overflow-hidden">
      <div className="relative h-20 sm:h-24 overflow-hidden bg-[#F7F7F7] dark:bg-white/5">
        {coverUrl ? (
          <img src={coverUrl} alt={`${displayName} cover`} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full ${isChef ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-violet-400 to-purple-500'}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
          <button onClick={handleLogout} className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-150 active:scale-95" aria-label="Log out" title="Log out">
            <LogOut className="w-3.5 h-3.5 text-white" />
          </button>
          <Link href="/settings">
            <button className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-150 active:scale-95" aria-label="Settings">
              <Settings className="w-3.5 h-3.5 text-white" />
            </button>
          </Link>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="flex items-start gap-4 -mt-8 sm:-mt-9 mb-3.5">
          <div className="relative shrink-0">
            <div className={`w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-full overflow-hidden border-[3px] ${isChef ? 'border-[#F97316]' : 'border-white'} bg-[#F7F7F7] dark:bg-white/5 shadow-elevated`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${displayName} profile avatar`} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-3xl font-bold text-white ${isChef ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-violet-400 to-purple-500'}`}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 flex-1 min-w-0 pt-6 sm:pt-7">
            <div className="text-center">
              <p className="text-[18px] font-700 text-[#111111] dark:text-white font-tabular tracking-snug">{profile?.posts_count ?? 0}</p>
              <p className="text-[11px] text-[#777777] dark:text-[#CBD5E1] font-medium mt-0.5">Posts</p>
            </div>
            <button onClick={() => setSheetMode('followers')} className="text-center rounded-xl hover:bg-[#F7F7F7] dark:hover:bg-white/5 transition-colors py-1">
              <p className="text-[18px] font-700 text-[#111111] dark:text-white font-tabular tracking-snug">{(followerCount >= 1000) ? `${(followerCount / 1000).toFixed(1)}k` : followerCount}</p>
              <p className="text-[11px] text-[#777777] dark:text-[#CBD5E1] font-medium mt-0.5">Followers</p>
            </button>
            <button onClick={() => setSheetMode('following')} className="text-center rounded-xl hover:bg-[#F7F7F7] dark:hover:bg-white/5 transition-colors py-1">
              <p className="text-[18px] font-700 text-[#111111] dark:text-white font-tabular tracking-snug">{followingCount}</p>
              <p className="text-[11px] text-[#777777] dark:text-[#CBD5E1] font-medium mt-0.5">Following</p>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] sm:text-[20px] font-700 text-[#111111] dark:text-white leading-tight tracking-snug">{displayName}</h1>
              {isChef ? (
                <span className="flex items-center gap-1 bg-[#FFE5D0] text-[#C2410C] dark:bg-orange-500/15 dark:text-[#FB923C] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#FFD2B3]">
                  <ChefHat className="w-3 h-3" />Personal Chef
                </span>
              ) : (
                <span className="flex items-center gap-1 bg-[#F3F4F6] text-[#555555] dark:text-[#E5E7EB] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#E5E5E5] dark:border-white/15">
                  <ShoppingBag className="w-3 h-3" />Customer
                </span>
              )}
            </div>
            <p className="text-[13px] font-semibold text-[#111111] dark:text-white">@{username}</p>
          </div>

          {cleanBio ? (
            <p className="text-[14px] text-[#111111] dark:text-white leading-relaxed">{cleanBio}</p>
          ) : (
            <p className="text-[13px] text-[#777777] dark:text-[#CBD5E1] italic">No bio yet — tap Edit Profile to add one.</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {profile?.location && profile?.privacy_show_location !== false && (
              <div className="flex items-center gap-1.5 text-[12px] text-[#555555] dark:text-[#E5E7EB]">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile.location}</span>
              </div>
            )}
            {joinedDate && (
              <div className="flex items-center gap-1.5 text-[12px] text-[#555555] dark:text-[#E5E7EB]">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Joined {joinedDate}</span>
              </div>
            )}
          </div>

          {isChef && hours && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <div className="inline-flex items-center gap-2 text-[12px] text-[#555555] dark:text-[#E5E7EB] bg-muted px-3 py-2 rounded-xl border border-border">
                <Clock3 className="w-3.5 h-3.5 text-[#F97316]" />
                <span>{hours}</span>
              </div>
              <div className={`inline-flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl font-700 border ${openState.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                <span className={`w-2 h-2 rounded-full ${openState.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {openState.label}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3.5 flex-wrap">
          <Link href="/edit-profile" className="flex-1 min-w-[110px]">
            <button className="w-full text-[13px] font-semibold border border-[#E5E5E5] dark:border-white/15 text-[#111111] dark:text-white px-4 py-2.5 rounded-xl hover:bg-[#F7F7F7] dark:hover:bg-white/5 dark:bg-white/5 hover:border-[#F97316] transition-all duration-150 active:scale-95 tracking-snug">
              Edit Profile
            </button>
          </Link>
          <Link href="/invite" className="flex-1 min-w-[90px]">
            <button className="w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold bg-[#F97316] text-white px-4 py-2.5 rounded-xl hover:bg-[#ea6a10] transition-all duration-150 active:scale-95 tracking-snug" aria-label="Invite Friends">
              <UserPlus className="w-3.5 h-3.5" />Invite
            </button>
          </Link>
          <button onClick={handleShare} className="h-[42px] px-4 border border-[#E5E5E5] dark:border-white/15 rounded-xl flex items-center justify-center hover:bg-[#F7F7F7] dark:hover:bg-white/5 dark:bg-white/5 hover:border-[#F97316] transition-all duration-150 active:scale-95" aria-label="Share profile">
            <Share2 className="w-3.5 h-3.5 text-[#111111] dark:text-white" />
          </button>
        </div>

        {!isChef && (
          <div className="mt-3.5">
            <button className="text-[12px] font-semibold bg-[#FFE5D0] text-[#C2410C] dark:bg-orange-500/15 dark:text-[#FB923C] px-4 py-2.5 rounded-full hover:bg-[#F97316] hover:text-white transition-all duration-150 active:scale-95 border border-[#FFD2B3]">
              Become a Vendor / Chef
            </button>
          </div>
        )}
      </div>
      {profile?.id && sheetMode && (
        <FollowListSheet
          open={!!sheetMode}
          onOpenChange={(open) => !open && setSheetMode(null)}
          userId={profile.id}
          mode={sheetMode}
          title={sheetMode === 'followers' ? 'Followers' : 'Following'}
          onCountsChange={(counts) => {
            if (typeof counts.followers === 'number') setFollowerCount(counts.followers);
            if (typeof counts.following === 'number') setFollowingCount(counts.following);
          }}
        />
      )}
    </div>
  );
}
