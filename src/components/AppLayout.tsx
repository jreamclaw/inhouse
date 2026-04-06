'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Icon from '@/components/ui/AppIcon';
import { Bell, Sun, Moon, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';

interface AppLayoutProps {
  children: React.ReactNode;
  currentUser?: { name: string; avatar: string; role: 'chef' | 'customer' };
  headerCenter?: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/home-feed', icon: 'HomeIcon', label: 'Feed' },
  { href: '/nearby', icon: 'MapPinIcon', label: 'Nearby' },
  { href: '/create-post', icon: 'PlusCircleIcon', label: 'Post' },
  { href: '/order-checkout-screen', icon: 'ShoppingBagIcon', label: 'Orders' },
  { href: '/profile-screen', icon: 'UserCircleIcon', label: 'Profile' },
];

export default function AppLayout({ children, headerCenter }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { profile, user, loading } = useAuth();

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('inhouse-theme');
    if (stored === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('inhouse-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('inhouse-theme', 'light');
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="flex items-center gap-3 text-[#777777] dark:text-[#CBD5E1]"><div className="w-5 h-5 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" /><span className="text-sm font-semibold text-[#555555] dark:text-[#E5E7EB]">Loading app...</span></div></div>;
  }

  const avatarUrl = profile?.avatar_url || null;
  const displayName = profile?.full_name || user.email?.split('@')[0] || '';
  const roleLabel = profile?.role === 'chef' ? 'Chef' : profile?.role === 'customer' ? 'Customer' : '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-card/96 dark:bg-[#0F0F10]/96 border-b border-[#E5E5E5] dark:border-white/15 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0"><Image src="/assets/images/Untitled-1773907427735.jpeg" alt="InHouse" width={22} height={22} className="object-contain rounded-md" /></div>
          <div className="absolute left-0 right-0 flex justify-center pointer-events-none px-16">{headerCenter ? <div className="pointer-events-auto">{headerCenter}</div> : <span className="font-script text-[32px] leading-none text-[#111111] dark:text-white tracking-wide pointer-events-none select-none">InHouse</span>}</div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F7F7F7] dark:bg-white/5 transition-colors" aria-label="Toggle theme">{mounted && (isDark ? <Sun className="w-[18px] h-[18px] text-[#666666] dark:text-[#D1D5DB]" /> : <Moon className="w-[18px] h-[18px] text-[#666666] dark:text-[#D1D5DB]" />)}</button>
            <Link href="/notifications" className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F7F7F7] dark:bg-white/5 transition-colors"><Bell className="w-[18px] h-[18px] text-[#666666] dark:text-[#D1D5DB]" /></Link>
            <Link href="/search" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F7F7F7] dark:bg-white/5 transition-colors" aria-label="Search people">
              <Search className="w-[18px] h-[18px] text-[#666666] dark:text-[#D1D5DB]" />
            </Link>
          </div>
        </div>
      </header>
      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full">
        <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-[#E5E5E5] dark:border-white/15 py-5 px-3">
          <nav className="flex flex-col gap-0.5 flex-1">{NAV_ITEMS.map((item) => { const isActive = pathname === item.href; return <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-200 group border border-transparent ${isActive ? 'bg-[#FFF4ED] text-[#F97316] font-semibold dark:bg-orange-500/15 dark:text-[#F97316]' : 'text-[#666666] dark:text-[#D1D5DB] font-medium hover:bg-[#F7F7F7] dark:bg-white/5 hover:text-[#111111] dark:text-white'}`}><Icon name={item.icon as any} size={18} variant={isActive ? 'solid' : 'outline'} className={isActive ? 'text-[#F97316]' : 'text-[#666666] dark:text-[#D1D5DB] group-hover:text-[#111111] dark:text-white'} /><span className="tracking-snug">{item.label}</span></Link>; })}</nav>
          <div className="mt-auto pt-4 border-t border-[#E5E5E5] dark:border-white/15"><Link href="/profile-screen" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[#F7F7F7] dark:bg-white/5 transition-all duration-200 group border border-[#E5E5E5] dark:border-white/15"><div className="w-7 h-7 rounded-full overflow-hidden border border-[#E5E5E5] dark:border-white/15 group-hover:border-[#F97316] transition-colors bg-[#F7F7F7] dark:bg-white/5 flex items-center justify-center shrink-0">{avatarUrl ? <img src={avatarUrl} alt={`${displayName} profile avatar`} className="w-full h-full object-cover" /> : <span className="text-[10px] font-700 text-[#555555] dark:text-[#E5E7EB]">{displayName.charAt(0).toUpperCase()}</span>}</div><div className="flex-1 min-w-0"><p className="text-[13px] font-semibold text-[#111111] dark:text-white truncate tracking-snug">{displayName}</p>{roleLabel ? <p className="text-[11px] text-[#777777] dark:text-[#CBD5E1] truncate">{roleLabel}</p> : null}</div></Link></div>
        </aside>
        <main className="flex-1 min-w-0 pb-20 lg:pb-6"><ProfileCompletionBanner />{children}</main>
      </div>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/96 dark:bg-[#0F0F10]/96 border-t border-[#E5E5E5] dark:border-white/15 backdrop-blur-xl pb-safe-bottom"><div className="flex items-center justify-around px-2 h-16">{NAV_ITEMS.map((item) => { const isActive = pathname === item.href; const isPost = item.label === 'Post'; if (isPost) return <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center"><div className="w-11 h-11 bg-[#F97316] rounded-[14px] flex items-center justify-center shadow-md shadow-orange-200 active:scale-95 transition-transform duration-150"><Icon name="PlusIcon" size={21} className="text-white" /></div></Link>; return <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative transition-transform duration-150 active:scale-95"><div className="relative"><Icon name={item.icon as any} size={20} variant={isActive ? 'solid' : 'outline'} className={isActive ? 'text-[#F97316]' : 'text-[#666666] dark:text-[#D1D5DB]'} /></div><span className={`text-[10px] tracking-tight ${isActive ? 'text-[#F97316] font-semibold' : 'text-[#666666] dark:text-[#D1D5DB] font-medium'}`}>{item.label}</span>{isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#F97316] rounded-full" />}</Link>; })}</div></nav>
    </div>
  );
}
