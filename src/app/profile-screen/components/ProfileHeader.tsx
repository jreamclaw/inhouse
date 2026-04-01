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
  const [followerCount] = useState<number>(profile?.followers_count ?? 0);

  const isChef = profile?.role === 'chef';
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const username = profile?.username || user?.email?.split('@')[0] || 'user';
  const avatarUrl = profile?.avatar_url || null;
  const coverUrl = profile?.cover_url || null;
  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  const handleShare = () => { navigator.clipboard.writeText(window.location.href); toast.success('Profile link copied!'); };
  const handleLogout = async () => { try { await signOut(); router.replace('/login'); } catch { toast.error('Failed to log out. Please try again.'); } };

  return (
    <div className="bg-card border border-[#E5E5E5] dark:border-white/15 rounded-2xl overflow-hidden">
      <div className="relative h-32 sm:h-44 overflow-hidden bg-[#F7F7F7] dark:bg-white/5">{coverUrl ? <img src={coverUrl} alt={`${displayName} cover`} className="w-full h-full object-cover" /> : <div className={`w-full h-full ${isChef ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-violet-400 to-purple-500'}`} />}<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" /><div className="absolute top-3 right-3 flex items-center gap-2"><button onClick={handleLogout} className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-150 active:scale-95" aria-label="Log out" title="Log out"><LogOut className="w-3.5 h-3.5 text-white" /></button><Link href="/settings"><button className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-150 active:scale-95"><Settings className="w-3.5 h-3.5 text-white" /></button></Link></div></div>
      <div className="px-4 pb-5">
        <div className="flex items-end justify-between -mt-11 mb-4">
          <div className="relative"><div className={`w-[86px] h-[86px] rounded-full overflow-hidden border-[3px] ${isChef ? 'border-[#F97316]' : 'border-white'} bg-[#F7F7F7] dark:bg-white/5 shadow-elevated`}>{avatarUrl ? <img src={avatarUrl} alt={`${displayName} profile avatar`} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-3xl font-bold text-white ${isChef ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-violet-400 to-purple-500'}`}>{displayName.charAt(0).toUpperCase()}</div>}</div></div>
          <div className="flex items-center gap-2 pb-1"><Link href="/edit-profile"><button className="text-[13px] font-semibold border border-[#E5E5E5] dark:border-white/15 text-[#111111] dark:text-white px-4 py-2 rounded-full hover:bg-[#F7F7F7] dark:hover:bg-white/5 dark:bg-white/5 hover:border-[#F97316] transition-all duration-150 active:scale-95 tracking-snug">Edit Profile</button></Link><Link href="/invite"><button className="flex items-center gap-1.5 text-[13px] font-semibold bg-[#F97316] text-white px-4 py-2 rounded-full hover:bg-[#ea6a10] transition-all duration-150 active:scale-95 tracking-snug" aria-label="Invite Friends"><UserPlus className="w-3.5 h-3.5" />Invite</button></Link><button onClick={handleShare} className="w-9 h-9 border border-[#E5E5E5] dark:border-white/15 rounded-full flex items-center justify-center hover:bg-[#F7F7F7] dark:hover:bg-white/5 dark:bg-white/5 hover:border-[#F97316] transition-all duration-150 active:scale-95" aria-label="Share profile"><Share2 className="w-3.5 h-3.5 text-[#111111] dark:text-white" /></button></div>
        </div>
        <div className="mb-2.5"><div className="flex items-center gap-2 flex-wrap"><h1 className="text-[20px] font-700 text-[#111111] dark:text-white leading-tight tracking-snug">{displayName}</h1>{isChef ? <span className="flex items-center gap-1 bg-[#FFE5D0] text-[#C2410C] dark:bg-orange-500/15 dark:text-[#FB923C] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#FFD2B3]"><ChefHat className="w-3 h-3" />Personal Chef</span> : <span className="flex items-center gap-1 bg-[#F3F4F6] text-[#555555] dark:text-[#E5E7EB] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#E5E5E5] dark:border-white/15"><ShoppingBag className="w-3 h-3" />Customer</span>}</div><p className="text-[13px] font-semibold text-[#111111] dark:text-white mt-1">@{username}</p></div>
        {profile?.bio ? <p className="text-[14px] text-[#111111] dark:text-white leading-relaxed mb-3.5">{profile.bio}</p> : <p className="text-[13px] text-[#777777] dark:text-[#CBD5E1] italic mb-3.5">No bio yet ? tap Edit Profile to add one.</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3.5">{profile?.location && <div className="flex items-center gap-1.5 text-[12px] text-[#555555] dark:text-[#E5E7EB]"><MapPin className="w-3.5 h-3.5" /><span>{profile.location}</span></div>}{joinedDate && <div className="flex items-center gap-1.5 text-[12px] text-[#555555] dark:text-[#E5E7EB]"><BookOpen className="w-3.5 h-3.5" /><span>Joined {joinedDate}</span></div>}</div>
        <div className="mb-4">{!isChef && <button className="text-[12px] font-semibold bg-[#FFE5D0] text-[#C2410C] dark:bg-orange-500/15 dark:text-[#FB923C] px-4 py-2 rounded-full hover:bg-[#F97316] hover:text-white transition-all duration-150 active:scale-95 border border-[#FFD2B3]">Become a Vendor / Chef</button>}</div>
        <div className="flex items-center gap-0 border border-[#E5E5E5] dark:border-white/15 rounded-2xl overflow-hidden shadow-subtle"><div className="flex-1 text-center py-3.5 border-r border-[#E5E5E5] dark:border-white/15"><p className="text-[18px] font-700 text-[#111111] dark:text-white font-tabular tracking-snug">{profile?.posts_count ?? 0}</p><p className="text-[11px] text-[#777777] dark:text-[#CBD5E1] font-medium mt-0.5">Posts</p></div><button className="flex-1 text-center py-3.5 border-r border-[#E5E5E5] dark:border-white/15 hover:bg-[#FAFAFA] transition-colors"><p className="text-[18px] font-700 text-[#111111] dark:text-white font-tabular tracking-snug">{(followerCount >= 1000) ? `${(followerCount / 1000).toFixed(1)}k` : followerCount}</p><p className="text-[11px] text-[#777777] dark:text-[#CBD5E1] font-medium mt-0.5">Followers</p></button><button className="flex-1 text-center py-3.5 hover:bg-[#FAFAFA] transition-colors"><p className="text-[18px] font-700 text-[#111111] dark:text-white font-tabular tracking-snug">{profile?.following_count ?? 0}</p><p className="text-[11px] text-[#777777] dark:text-[#CBD5E1] font-medium mt-0.5">Following</p></button></div>
      </div>
    </div>
  );
}
