'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Icon from '@/components/ui/AppIcon';
import { Bell, Search, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';

interface AppLayoutProps {
  children: React.ReactNode;
  currentUser?: {
    name: string;
    avatar: string;
    role: 'chef' | 'customer';
  };
}

const NAV_ITEMS = [
{ href: '/home-feed', icon: 'HomeIcon', label: 'Feed' },
{ href: '/nearby', icon: 'MapPinIcon', label: 'Nearby' },
{ href: '/create-post', icon: 'PlusCircleIcon', label: 'Post' },
{ href: '/order-checkout-screen', icon: 'ShoppingBagIcon', label: 'Orders' },
{ href: '/profile-screen', icon: 'UserCircleIcon', label: 'Profile' }];


export default function AppLayout({ children, currentUser }: AppLayoutProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifCount] = useState(3);
  const { profile, user } = useAuth();

  const avatarUrl = profile?.avatar_url || null;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const roleLabel = profile?.role === 'chef' ? 'Chef' : 'Customer';

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('inhouse-theme');
    if (stored === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-card/96 border-b border-border/50 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <Image src="/assets/images/Untitled-1773907427735.jpeg" alt="InHouse" width={22} height={22} className="object-contain rounded-md" />
          </div>

          {/* Absolutely centered InHouse title */}
          <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
            <span className="font-script text-[32px] leading-none text-white tracking-wide pointer-events-none select-none">
              InHouse
            </span>
          </div>

          <div className="flex-1 max-w-xs mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search chefs, meals..."
                className="w-full bg-muted rounded-full pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                suppressHydrationWarning />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Toggle theme"
              suppressHydrationWarning>
              {mounted && (isDark ?
              <Sun className="w-[18px] h-[18px] text-muted-foreground" /> :
              <Moon className="w-[18px] h-[18px] text-muted-foreground" />
              )}
            </button>

            <Link href="/notifications" className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
              <Bell className="w-[18px] h-[18px] text-muted-foreground" />
              {notifCount > 0 &&
              <span className="absolute top-1.5 right-1.5 w-[14px] h-[14px] bg-primary rounded-full text-[9px] font-700 text-white flex items-center justify-center">
                  {notifCount}
                </span>
              }
            </Link>

            <Link href="/profile-screen">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-border/60 hover:border-primary/50 transition-colors ml-0.5 bg-muted flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${displayName} profile avatar`}
                    className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-700 text-muted-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar + Main Content */}
      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full">
        {/* Desktop Sidebar Nav */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-border/50 py-5 px-3">
          <nav className="flex flex-col gap-0.5 flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-500 transition-all duration-200 group ${
                  isActive ?
                  'bg-primary/8 text-primary font-600' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`
                  }>
                  <Icon
                    name={item.icon as any}
                    size={18}
                    variant={isActive ? 'solid' : 'outline'}
                    className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} />
                  <span className="tracking-snug">{item.label}</span>
                  {item.label === 'Orders' &&
                  <span className="ml-auto bg-primary text-white text-[9px] font-700 px-1.5 py-0.5 rounded-full">2</span>
                  }
                </Link>);
            })}
          </nav>

          <div className="mt-auto pt-4 border-t border-border/50">
            <Link href="/profile-screen" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted/60 transition-all duration-200 group">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-border/60 group-hover:border-primary/40 transition-colors bg-muted flex items-center justify-center shrink-0">
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
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-600 text-foreground truncate tracking-snug">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{roleLabel}</p>
              </div>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-6">
          <ProfileCompletionBanner />
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/96 border-t border-border/50 backdrop-blur-xl pb-safe-bottom">
        <div className="flex items-center justify-around px-2 h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const isPost = item.label === 'Post';

            if (isPost) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center">
                  <div className="w-11 h-11 bg-primary rounded-[14px] flex items-center justify-center shadow-md shadow-primary/25 active:scale-95 transition-transform duration-150">
                    <Icon name="PlusIcon" size={21} className="text-white" />
                  </div>
                </Link>);
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative transition-transform duration-150 active:scale-95">
                <div className="relative">
                  <Icon
                    name={item.icon as any}
                    size={20}
                    variant={isActive ? 'solid' : 'outline'}
                    className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                  {item.label === 'Orders' &&
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full text-[8px] font-700 text-white flex items-center justify-center">2</span>
                  }
                </div>
                <span className={`text-[10px] font-500 tracking-tight ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
                {isActive &&
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-primary rounded-full" />
                }
              </Link>);
          })}
        </div>
      </nav>
    </div>);
}
