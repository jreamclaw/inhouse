'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

const TEST_ACCOUNTS = [
  {
    label: 'No Role',
    description: '→ Role Selection',
    email: 'test.norole@inhouse.app',
    password: 'Test1234!',
    badge: 'role-selection',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  {
    label: 'Customer (no onboarding)',
    description: '→ Customer Onboarding',
    email: 'test.customer@inhouse.app',
    password: 'Test1234!',
    badge: 'onboarding',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    label: 'Customer (onboarded)',
    description: '→ Home Feed',
    email: 'test.customer.done@inhouse.app',
    password: 'Test1234!',
    badge: 'home-feed',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    label: 'Chef (no onboarding)',
    description: '→ Chef Onboarding',
    email: 'test.chef@inhouse.app',
    password: 'Test1234!',
    badge: 'onboarding',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    label: 'Chef (fully onboarded)',
    description: '→ Chef Menu',
    email: 'test.chef.done@inhouse.app',
    password: 'Test1234!',
    badge: 'chef-menu',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn, getPostLoginRoute } = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const [routingStatus, setRoutingStatus] = useState('');
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setRoutingStatus('Signing in…');
    try {
      const authData = await signIn(email, password);
      const signedInUser = authData?.user ?? authData?.session?.user ?? null;
      const userId = signedInUser?.id;

      console.log('[Login] Auth success, user id:', userId);

      if (!userId) {
        setError('Login succeeded but session could not be confirmed. Please try again.');
        setLoading(false);
        setRoutingStatus('');
        return;
      }

      setRoutingStatus('Checking your profile…');

      // Fetch profile with all routing fields
      let { data: profileData } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete')
        .eq('id', userId)
        .single();

      console.log('[Login] Fetched profile:', profileData);

      // If no profile row exists, create one
      if (!profileData) {
        console.log('[Login] No profile found — creating profile row for user:', userId);
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
        console.log('[Login] Created profile:', newProfile);
      }

      const destination = getPostLoginRoute(profileData ?? null);
      console.log('[Login] Role:', profileData?.role, '| onboarding_complete:', profileData?.onboarding_complete, '| vendor_onboarding_complete:', profileData?.vendor_onboarding_complete);
      console.log('[Login] Final route decision:', destination);

      setRoutingStatus('Redirecting…');

      toast.success('✅ Welcome back!', {
        description: 'Signing you in…',
        duration: 2000,
      });

      // Small delay ensures the session cookie is fully written before the next request
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Hard navigation ensures fresh cookies are sent with the next request
      window.location.href = destination;
    } catch (err: any) {
      console.error('[Login] signIn error:', err?.message);
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
      // Always use the current domain so OAuth works on both production and preview URLs
      const siteUrl = window.location.origin;
      console.log('[Login] Starting OAuth with provider:', provider, 'redirectTo:', `${siteUrl}/auth/callback?next=role-based`);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=role-based`,
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
      {/* Left decorative panel — hidden on mobile */}
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
          <div className="mt-12 flex gap-4">
            {[
              { emoji: '🍜', label: 'Home-cooked' },
              { emoji: '📍', label: 'Local chefs' },
              { emoji: '⚡', label: 'Fast delivery' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5">
                <span className="text-lg">{item.emoji}</span>
                <span className="text-sm font-medium text-white/90">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <Image
              src="/assets/images/Untitled-1773907427735.jpeg"
              alt="InHouse Logo"
              width={80}
              height={80}
              className="object-contain rounded-xl"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(255,100,0,0.35))',
              }}
            />
            <span className="mt-3 font-script text-3xl text-foreground">InHouse</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {/* OAuth Buttons */}
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

            <button
              onClick={() => handleOAuth('apple')}
              disabled={!!oauthLoading || loading}
              suppressHydrationWarning
              className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl border border-border bg-card hover:bg-muted hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 font-medium text-foreground text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none active:scale-[0.98]"
            >
              {oauthLoading === 'apple' ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              )}
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Routing status (loading indicator) */}
          {routingStatus && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {routingStatus}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                suppressHydrationWarning
                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                suppressHydrationWarning
                className="w-full h-12 pl-11 pr-12 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                suppressHydrationWarning
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              suppressHydrationWarning
              className="w-full h-12 bg-primary hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-lg shadow-primary/25"
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

          {/* ── Test Accounts Panel ── */}
          <div className="mt-6 border border-dashed border-amber-300 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTestAccounts(!showTestAccounts)}
              suppressHydrationWarning
              className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors text-amber-800"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <FlaskConical className="w-4 h-4" />
                Test Accounts
              </span>
              {showTestAccounts ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showTestAccounts && (
              <div className="px-4 pb-4 pt-3 bg-amber-50/50 flex flex-col gap-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Click any account to auto-fill credentials, then press <strong>Log In</strong>.
                </p>
                {TEST_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                      setError('');
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all hover:opacity-80 active:scale-[0.98] ${account.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{account.label}</span>
                      <span className="text-xs opacity-70 font-mono">{account.description}</span>
                    </div>
                    <div className="text-xs opacity-60 mt-0.5 font-mono">{account.email}</div>
                  </button>
                ))}
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Password for all accounts: <code className="bg-white px-1.5 py-0.5 rounded border text-amber-700 font-mono">Test1234!</code>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
