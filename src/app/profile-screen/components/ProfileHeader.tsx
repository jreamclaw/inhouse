'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChefHat, MapPin, Settings, Share2, ShoppingBag, BookOpen, LogOut, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileHeader() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const [followerCount, setFollowerCount] = useState<number>(profile?.followers_count ?? 0);

  const isChef = profile?.role === 'chef';
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const username = profile?.username || user?.email?.split('@')[0] || 'user';
  const avatarUrl = profile?.avatar_url || null;
  const coverUrl = profile?.cover_url || null;
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

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
    <div className="bg-card">
      {/* Cover Image */}
      <div className="relative h-32 sm:h-44 overflow-hidden bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${displayName} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full ${isChef ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-violet-400 to-purple-500'}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />

        {/* Settings + Logout buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-150 active:scale-95"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
          </button>
          <Link href="/settings">
            <button className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-150 active:scale-95">
              <Settings className="w-3.5 h-3.5 text-white" />
            </button>
          </Link>
        </div>
      </div>

      {/* Avatar + Action Buttons */}
      <div className="px-4 pb-5">
        <div className="flex items-end justify-between -mt-11 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className={`w-[86px] h-[86px] rounded-full overflow-hidden border-[3px] ${isChef ? 'border-primary' : 'border-card'} bg-muted shadow-elevated`}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${displayName} profile avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-3xl font-bold text-white ${isChef ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-violet-400 to-purple-500'}`}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isChef && (
              <div className="absolute bottom-1 right-0 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center border-2 border-card text-xs shadow-sm">
                👨‍🍳
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pb-1">
            <Link href="/edit-profile">
              <button className="text-[13px] font-600 border border-border/70 px-4 py-2 rounded-full hover:bg-muted hover:border-primary/30 transition-all duration-150 active:scale-95 tracking-snug">
                Edit Profile
              </button>
            </Link>
            <Link href="/invite">
              <button
                className="flex items-center gap-1.5 text-[13px] font-600 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary/90 transition-all duration-150 active:scale-95 tracking-snug"
                aria-label="Invite Friends"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite
              </button>
            </Link>
            <button
              onClick={handleShare}
              className="w-9 h-9 border border-border/70 rounded-full flex items-center justify-center hover:bg-muted hover:border-primary/30 transition-all duration-150 active:scale-95"
              aria-label="Share profile"
            >
              <Share2 className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Name + Username */}
        <div className="mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-700 text-foreground leading-tight tracking-snug">{displayName}</h1>
            {isChef && (
              <span className="flex items-center gap-1 bg-primary/8 text-primary text-[11px] font-600 px-2 py-0.5 rounded-full border border-primary/15">
                <ChefHat className="w-3 h-3" />
                Personal Chef
              </span>
            )}
            {!isChef && (
              <span className="flex items-center gap-1 bg-violet-100 text-violet-600 text-[11px] font-600 px-2 py-0.5 rounded-full dark:bg-violet-900/20 dark:text-violet-400">
                <ShoppingBag className="w-3 h-3" />
                Customer
              </span>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">@{username}</p>
        </div>

        {/* Bio */}
        {profile?.bio ? (
          <p className="text-[14px] text-foreground leading-relaxed mb-3.5">{profile.bio}</p>
        ) : (
          <p className="text-[13px] text-muted-foreground italic mb-3.5">No bio yet — tap Edit Profile to add one.</p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3.5">
          {profile?.location && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{profile.location}</span>
            </div>
          )}
          {joinedDate && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Joined {joinedDate}</span>
            </div>
          )}
        </div>

        {/* Account type badge */}
        <div className="mb-4">
          {!isChef && (
            <button className="text-[12px] font-600 bg-primary/8 text-primary px-4 py-2 rounded-full hover:bg-primary hover:text-white transition-all duration-150 active:scale-95 border border-primary/15">
              Become a Vendor / Chef
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-0 border border-border/50 rounded-2xl overflow-hidden shadow-subtle">
          <div className="flex-1 text-center py-3.5 border-r border-border/50">
            <p className="text-[18px] font-700 text-foreground font-tabular tracking-snug">{profile?.posts_count ?? 0}</p>
            <p className="text-[11px] text-muted-foreground font-500 mt-0.5">Posts</p>
          </div>
          <button className="flex-1 text-center py-3.5 border-r border-border/50 hover:bg-muted/40 transition-colors">
            <p className="text-[18px] font-700 text-foreground font-tabular tracking-snug">
              {(followerCount >= 1000) ? `${(followerCount / 1000).toFixed(1)}k` : followerCount}
            </p>
            <p className="text-[11px] text-muted-foreground font-500 mt-0.5">Followers</p>
          </button>
          <button className="flex-1 text-center py-3.5 hover:bg-muted/40 transition-colors">
            <p className="text-[18px] font-700 text-foreground font-tabular tracking-snug">{profile?.following_count ?? 0}</p>
            <p className="text-[11px] text-muted-foreground font-500 mt-0.5">Following</p>
          </button>
        </div>
      </div>
    </div>
  );
}