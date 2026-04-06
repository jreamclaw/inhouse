'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { authDebug } from '@/lib/auth/debug';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { signIn, getPostLoginRoute, user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const [routingStatus, setRoutingStatus] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!profile) return;

    const destination = getPostLoginRoute(profile);
    if (destination && destination !== pathname) {
      window.location.replace(destination);
    }
  }, [authLoading, user, profile, getPostLoginRoute, pathname]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setRoutingStatus('Signing in...');
    try {
      const authData = await signIn(email, password);
      const signedInUser = authData?.user ?? authData?.session?.user ?? null;
      const userId = signedInUser?.id;

      if (!userId) {
        setError('Login succeeded but session could not be confirmed. Please try again.');
        setLoading(false);
        setRoutingStatus('');
        return;
      }

      setRoutingStatus('Checking your profile...');

      let { data: profileData } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete')
        .eq('id', userId)
        .single();

      authDebug('login.profile-fetch', {
        pathname,
        sessionExists: true,
        userId,
        profileRole: profileData?.role ?? null,
        onboardingComplete: profileData?.onboarding_complete ?? null,
        vendorOnboardingComplete: profileData?.vendor_onboarding_complete ?? null,
        redirectTarget: null,
        reason: profileData ? 'found-profile' : 'missing-profile',
      });

      if (!profileData) {
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: signedInUser.email ?? '',
            full_name: signedInUser.user_metadata?.full_name || signedInUser.email?.split('@')[0] || '',
            username: signedInUser.user_metadata?.username || signedInUser.email?.split('@')[0] || '',
            avatar_url: signedInUser.user_metadata?.avatar_url || '',
            role: null,
            onboarding_complete: false,
            vendor_onboarding_complete: false,
          })
          .select('role, onboarding_complete, vendor_onboarding_complete')
          .single();
        profileData = newProfile;
        authDebug('login.profile-created', {
          pathname,
          sessionExists: true,
          userId,
          profileRole: profileData?.role ?? null,
          onboardingComplete: profileData?.onboarding_complete ?? null,
          vendorOnboardingComplete: profileData?.vendor_onboarding_complete ?? null,
          redirectTarget: null,
        });
      }

      const destination = getPostLoginRoute(profileData ?? null);
      authDebug('login.final-redirect', {
        pathname,
        sessionExists: true,
        userId,
        profileRole: profileData?.role ?? null,
        onboardingComplete: profileData?.onboarding_complete ?? null,
        vendorOnboardingComplete: profileData?.vendor_onboarding_complete ?? null,
        redirectTarget: destination,
        reason: 'post-login-route',
      });
      setRoutingStatus('Redirecting...');

      toast.success('Welcome back!', {
        description: 'Signing you in...',
        duration: 2000,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
      window.location.href = destination;
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
      setRoutingStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError('');
    setOauthLoading(provider);
    try {
      const redirectTo = provider === 'google'
        ? `${window.location.origin}/oauth-complete`
        : `${window.location.origin}/auth/callback?next=role-based`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err?.message || `Failed to sign in with ${provider}. Please try again.`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-16 left-12 w-64 h-64 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-24 right-8 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/25 blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-12">
            <Image
              src="/assets/images/Untitled-1773907427735.jpeg"
              alt="InHouse Logo"
              width={48}
              height={48}
              className="object-contain rounded-xl"
              style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.3))' }}
            />
            <span className="text-2xl font-bold tracking-tight">InHouse</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Discover chefs<br />in your<br />neighborhood.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm">
            Order home-cooked meals from talented local chefs. Fresh, personal, and made with love.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <Image
              src="/assets/images/Untitled-1773907427735.jpeg"
              alt="InHouse Logo"
              width={80}
              height={80}
              className="object-contain rounded-xl"
              style={{ filter: 'drop-shadow(0 0 20px rgba(255,100,0,0.35))' }}
            />
            <span className="mt-3 font-script text-3xl text-foreground">InHouse</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading || loading}
              suppressHydrationWarning
              className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl border border-border bg-card hover:bg-muted hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 font-medium text-foreground text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none active:scale-[0.98]"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium tracking-wide">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-12 pl-12 pr-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 pl-12 pr-12 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {routingStatus && !error && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                {routingStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="w-full h-12 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Log In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary font-semibold hover:text-primary/80 transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
