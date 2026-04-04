'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { authDebug } from '@/lib/auth/debug';
import { resolvePostLoginRoute } from '@/lib/auth/routeResolver';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  role: 'chef' | 'customer' | null;
  availability_override?: 'open' | 'closed' | null;
  onboarding_complete: boolean;
  vendor_onboarding_complete: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
}

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const supabase = createClient();
      const pathname = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
      authDebug('auth-context.profile-fetch.start', {
        pathname,
        sessionExists: !!session,
        userId,
        profileRole: profile?.role ?? null,
        onboardingComplete: profile?.onboarding_complete ?? null,
        vendorOnboardingComplete: profile?.vendor_onboarding_complete ?? null,
        redirectTarget: null,
      });
      const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        setProfile(data as UserProfile);
        authDebug('auth-context.profile-fetch.success', {
          pathname,
          sessionExists: !!session,
          userId,
          profileRole: data.role ?? null,
          onboardingComplete: data.onboarding_complete ?? null,
          vendorOnboardingComplete: data.vendor_onboarding_complete ?? null,
          redirectTarget: null,
        });
        return data as UserProfile;
      }

      setProfile(null);
      authDebug('auth-context.profile-fetch.miss', {
        pathname,
        sessionExists: !!session,
        userId,
        profileRole: null,
        onboardingComplete: null,
        vendorOnboardingComplete: null,
        redirectTarget: null,
        reason: error?.message ?? 'missing-profile',
      });
      return null;
    } catch (error: any) {
      setProfile(null);
      authDebug('auth-context.profile-fetch.error', {
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        sessionExists: !!session,
        userId,
        profileRole: null,
        onboardingComplete: null,
        vendorOnboardingComplete: null,
        redirectTarget: null,
        reason: error?.message ?? 'unknown',
      });
      return null;
    }
  };

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      authDebug('auth-context.session-init', {
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        sessionExists: !!initialSession,
        userId: initialSession?.user?.id ?? null,
        profileRole: null,
        onboardingComplete: null,
        vendorOnboardingComplete: null,
        redirectTarget: null,
      });
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        fetchProfile(initialSession.user.id).finally(() => setLoading(false));
      } else {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      authDebug('auth-context.auth-state-change', {
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        sessionExists: !!newSession,
        userId: newSession?.user?.id ?? null,
        profileRole: null,
        onboardingComplete: null,
        vendorOnboardingComplete: null,
        redirectTarget: null,
        reason: event,
      });
      setSession(newSession);

      if (newSession?.user) {
        setUser(newSession.user);
        fetchProfile(newSession.user.id).finally(() => setLoading(false));
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || '',
          role: metadata?.role || 'customer',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.user) {
      setSession(data.session);
      setUser(data.session.user);
      authDebug('auth-context.sign-in.success', {
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        sessionExists: true,
        userId: data.session.user.id,
        profileRole: null,
        onboardingComplete: null,
        vendorOnboardingComplete: null,
        redirectTarget: null,
      });
    }
    return data;
  };

  const signOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const getCurrentUser = async () => {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => user?.email_confirmed_at !== null;

  const getUserProfile = async () => {
    if (!user) return null;
    const supabase = createClient();
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    return data;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const getPostLoginRoute = (userProfile: UserProfile | null): string => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
    const { destination, reason } = resolvePostLoginRoute(userProfile);

    authDebug('auth-context.get-post-login-route', {
      pathname,
      sessionExists: !!session,
      userId: user?.id ?? null,
      profileRole: userProfile?.role ?? null,
      onboardingComplete: userProfile?.onboarding_complete ?? null,
      vendorOnboardingComplete: userProfile?.vendor_onboarding_complete ?? null,
      redirectTarget: destination,
      reason,
    });

    return destination;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profile,
      signUp,
      signIn,
      signOut,
      getCurrentUser,
      isEmailVerified,
      getUserProfile,
      refreshProfile,
      getPostLoginRoute,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
