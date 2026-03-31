'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setProfile(data as UserProfile);
        return data as UserProfile;
      } else {
        setProfile(null);
        return null;
      }
    } catch {
      setProfile(null);
      return null;
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Initialize: get session first (fast, local), then verify user server-side
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('[Auth] Initial session check:', initialSession ? 'session found' : 'no session');
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

    // Listen for auth state changes — use the session/user from the event directly
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] onAuthStateChange event:', event, 'user:', newSession?.user?.id ?? 'none');
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

  // Email/Password Sign Up — accepts role in metadata
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

  // Email/Password Sign In
  const signIn = async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    console.log('[Auth] signIn success, user:', data.session?.user?.id);
    // Immediately update context state so it's ready before redirect
    if (data.session?.user) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return data;
  };

  // Sign Out
  const signOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Get Current User
  const getCurrentUser = async () => {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  // Check if Email is Verified
  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  // Get User Profile from Database
  const getUserProfile = async () => {
    if (!user) return null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  /**
   * Determine the correct post-login route based on user profile state.
   * Routing rules:
   *  - No role set              → /role-selection
   *  - customer, onboarding incomplete → /onboarding
   *  - chef, onboarding incomplete     → /onboarding
   *  - customer, onboarding complete   → /home-feed
   *  - chef, onboarding complete, vendor onboarding incomplete → /vendor-onboarding
   *  - chef, both complete             → /chef-menu
   */
  const getPostLoginRoute = (userProfile: UserProfile | null): string => {
    if (!userProfile) {
      console.log('[Auth] getPostLoginRoute: no profile → /role-selection');
      return '/role-selection';
    }

    const { role, onboarding_complete, vendor_onboarding_complete } = userProfile;

    console.log('[Auth] getPostLoginRoute: role=', role, 'onboarding_complete=', onboarding_complete, 'vendor_onboarding_complete=', vendor_onboarding_complete);

    // No role selected yet
    if (!role) {
      console.log('[Auth] getPostLoginRoute: no role → /role-selection');
      return '/role-selection';
    }

    if (role === 'customer') {
      if (!onboarding_complete) {
        console.log('[Auth] getPostLoginRoute: customer onboarding incomplete → /onboarding');
        return '/onboarding';
      }
      console.log('[Auth] getPostLoginRoute: customer done → /home-feed');
      return '/home-feed';
    }

    if (role === 'chef') {
    if (!vendor_onboarding_complete)
    {
    console.log('[Auth]
    getPostLoginRoute: chef vendor
    onboarding incomplete -> /vendor-
    onboarding');
    return '/vendor-onboarding';
    }
    console.log('[Auth] getPostLoginRoute: chef done -> /chef-menu');
    return '/chef-menu';
    }

    console.log('[Auth] getPostLoginRoute: fallback → /home-feed');
    return '/home-feed';
  };

  const value = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
