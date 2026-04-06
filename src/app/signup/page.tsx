'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { authDebug } from '@/lib/auth/debug';
import AppLogo from '@/components/ui/AppLogo';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SignUpPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { signUp, getPostLoginRoute } = useAuth();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const signUpResult = await signUp(email, password, { fullName: name });

      const signedUpUser = signUpResult?.user ?? signUpResult?.session?.user ?? null;
      const hasImmediateSession = Boolean(signUpResult?.session?.user);

      toast.success('🎉 Account created!', {
        description: hasImmediateSession
          ? 'Welcome to InHouse!'
          : 'Check your email to confirm your account.',
        duration: 3000,
      });

      if (!signedUpUser || !hasImmediateSession) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, onboarding_complete, vendor_onboarding_complete')
        .eq('id', signedUpUser.id)
        .maybeSingle();

      authDebug('signup.profile-fetch', {
        pathname,
        sessionExists: hasImmediateSession,
        userId: signedUpUser.id,
        profileRole: profile?.role ?? null,
        onboardingComplete: profile?.onboarding_complete ?? null,
        vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
        redirectTarget: null,
        reason: profile ? 'found-profile' : 'using-fallback-profile-shape',
      });

      const destination = getPostLoginRoute(profile ?? {
        role: null,
        onboarding_complete: false,
        vendor_onboarding_complete: false,
      });

      authDebug('signup.final-redirect', {
        pathname,
        sessionExists: hasImmediateSession,
        userId: signedUpUser.id,
        profileRole: profile?.role ?? null,
        onboardingComplete: profile?.onboarding_complete ?? false,
        vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? false,
        redirectTarget: destination,
        reason: 'post-signup-route',
      });
      router.replace(destination);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError('');
    setOauthLoading(provider);
    try {
      const redirectTo = provider === 'google'
        ? `${window.location.origin}/role-selection`
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
      setError(err?.message || `Failed to sign up with ${provider}. Please try again.`);
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
            <AppLogo size={52} />
            <span className="text-2xl font-bold tracking-tight">InHouse</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Join a community<br />of food<br />lovers.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm">
            Connect with personal chefs, discover hidden gems, and order meals made with real ingredients.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-3">
            {[
              { emoji: '👨‍🍳', label: '500+ chefs', sub: 'Local & verified' },
              { emoji: '🌮', label: '2,000+ meals', sub: 'New daily' },
              { emoji: '⭐', label: '4.9 rating', sub: 'Avg. review' },
              { emoji: '🚀', label: 'Same-day', sub: 'Delivery' },
            ].map((item) => (
              <div key={item.label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3">
                <div className="text-xl mb-1">{item.emoji}</div>
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="text-xs text-white/70">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <AppLogo size={56} />
            <span className="text-2xl font-bold text-foreground">InHouse</span>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground mb-2">Create account</h2>
            <p className="text-muted-foreground">Join InHouse and start discovering local chefs</p>
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2">How it works</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. Create your account with Google, Apple, or email.</p>
              <p>2. Choose how you want to use InHouse after you sign in.</p>
              <p>3. Finish setup and start ordering or selling.</p>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading || loading}
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
            <span className="text-xs text-muted-foreground font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-lg shadow-primary/25 mt-1"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
            By creating an account, you agree to our{' '}
            <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>{' '}
            and{' '}
            <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
          </p>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

