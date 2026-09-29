// src/context/AuthContext.tsx
// Supabase Authentication Context for KaushalSetu
// Enforces server-side authority: User role is strictly resolved from public.profiles,
// never from client-side parameters, forms, URLs, or local storage.

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { StakeholderRole, AppView } from '../types';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'TRAINEE' | 'EMPLOYER' | 'TRAINING_PROVIDER' | 'GOVERNMENT';
  traineeId?: string;
  employerId?: string;
  providerId?: string;
  govId?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  stakeholderRole: StakeholderRole | null;
  defaultView: AppView;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ user: User; profile: UserProfile }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    requestedRole: 'TRAINEE' | 'EMPLOYER' | 'TRAINING_PROVIDER'
  ) => Promise<{ user: User | null; session: Session | null; confirmationRequired: boolean }>;
  signInWithOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<{ user: User; profile: UserProfile | null }>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signInWithOAuth: (provider: 'google') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  resolveAndBootstrapProfile: (u?: User | null) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map database role enum to frontend StakeholderRole
  const stakeholderRole: StakeholderRole | null = useMemo(() => {
    if (!profile) return null;
    switch (profile.role) {
      case 'TRAINEE':
        return 'trainee';
      case 'EMPLOYER':
        return 'employer';
      case 'TRAINING_PROVIDER':
        return 'provider';
      case 'GOVERNMENT':
        return 'government';
      default:
        return null;
    }
  }, [profile]);

  // Map database role enum to target dashboard view
  const defaultView: AppView = useMemo(() => {
    if (!profile) return 'landing';
    switch (profile.role) {
      case 'TRAINEE':
        return 'trainee-dashboard';
      case 'EMPLOYER':
        return 'employer-dashboard';
      case 'TRAINING_PROVIDER':
        return 'provider-dashboard';
      case 'GOVERNMENT':
        return 'government-dashboard';
      default:
        return 'landing';
    }
  }, [profile]);

  // Strictly resolve profile from public.profiles in database
  const fetchProfileForUser = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', userId)
        .single();

      if (profileErr || !data) {
        console.error('Failed to resolve profile from public.profiles:', profileErr);
        return null;
      }

      const userProfile: UserProfile = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      };

      // Resolve role-specific domain entity ID if available
      if (data.role === 'TRAINEE') {
        const { data: traineeData } = await supabase
          .from('trainees')
          .select('id')
          .eq('user_id', data.id)
          .maybeSingle();
        if (traineeData) userProfile.traineeId = traineeData.id;
      } else if (data.role === 'EMPLOYER') {
        const { data: empData } = await supabase
          .from('employers')
          .select('id')
          .eq('user_id', data.id)
          .maybeSingle();
        if (empData) userProfile.employerId = empData.id;
      } else if (data.role === 'TRAINING_PROVIDER') {
        const { data: tpData } = await supabase
          .from('training_providers')
          .select('id')
          .eq('user_id', data.id)
          .maybeSingle();
        if (tpData) userProfile.providerId = tpData.id;
      } else if (data.role === 'GOVERNMENT') {
        const { data: govData } = await supabase
          .from('government_users')
          .select('id')
          .eq('user_id', data.id)
          .maybeSingle();
        if (govData) userProfile.govId = govData.id;
      }

      return userProfile;
    } catch (err: any) {
      console.error('Error in fetchProfileForUser:', err);
      return null;
    }
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    const p = await fetchProfileForUser(user.id);
    setProfile(p);
    return p;
  };

  const resolveAndBootstrapProfile = async (u?: User | null): Promise<UserProfile | null> => {
    const targetUser = u || user;
    if (!targetUser) return null;
    const p = await fetchProfileForUser(targetUser.id);
    if (p) setProfile(p);
    return p;
  };

  // Initialize session and register auth listener
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            const p = await fetchProfileForUser(initialSession.user.id);
            if (mounted) setProfile(p);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Error initializing authentication');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          if (newSession?.user) {
            const p = await fetchProfileForUser(newSession.user.id);
            if (mounted) setProfile(p);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setUser(null);
          setSession(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign In using Supabase GoTrue Auth
  const signIn = async (email: string, password: string): Promise<{ user: User; profile: UserProfile }> => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr || !data.user) {
        throw new Error(formatAuthError(signInErr || new Error('Invalid email or password')));
      }

      setUser(data.user);
      setSession(data.session);

      // Resolve role directly from public.profiles
      const resolvedProfile = await fetchProfileForUser(data.user.id);
      if (!resolvedProfile) {
        throw new Error('Authenticated user lacks an associated public profile');
      }

      setProfile(resolvedProfile);
      return { user: data.user, profile: resolvedProfile };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign Up using Supabase GoTrue Auth with role and metadata
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    requestedRole: 'TRAINEE' | 'EMPLOYER' | 'TRAINING_PROVIDER'
  ): Promise<{ user: User | null; session: Session | null; confirmationRequired: boolean }> => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            requested_role: requestedRole,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpErr) {
        throw new Error(formatAuthError(signUpErr));
      }

      if (data.session && data.user) {
        setUser(data.user);
        setSession(data.session);
        const resolvedProfile = await fetchProfileForUser(data.user.id);
        if (resolvedProfile) setProfile(resolvedProfile);
      }

      const confirmationRequired = !data.session;
      return { user: data.user, session: data.session, confirmationRequired };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Magic Link / Email OTP
  const signInWithOtp = async (email: string): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (otpErr) throw new Error(formatAuthError(otpErr));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP Code
  const verifyOtp = async (email: string, token: string): Promise<{ user: User; profile: UserProfile | null }> => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (verifyErr || !data.user) {
        throw new Error(formatAuthError(verifyErr || new Error('Invalid verification code')));
      }

      setUser(data.user);
      setSession(data.session);
      const p = await fetchProfileForUser(data.user.id);
      setProfile(p);
      return { user: data.user, profile: p };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Password Recovery Request
  const resetPasswordForEmail = async (email: string): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetErr) throw new Error(formatAuthError(resetErr));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update Password for recovery session
  const updatePassword = async (newPassword: string): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) throw new Error(formatAuthError(updateErr));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Continue with Google OAuth
  const signInWithOAuth = async (provider: 'google'): Promise<void> => {
    setError(null);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthErr) throw new Error(formatAuthError(oauthErr));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Sign Out
  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      stakeholderRole,
      defaultView,
      loading,
      error,
      signIn,
      signUp,
      signInWithOtp,
      verifyOtp,
      resetPasswordForEmail,
      updatePassword,
      signInWithOAuth,
      signOut,
      refreshProfile,
      resolveAndBootstrapProfile,
    }),
    [user, session, profile, stakeholderRole, defaultView, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// User-friendly error message transformer conforming to Requirement 18
export function formatAuthError(err: any): string {
  if (!err) return 'An unexpected authentication error occurred.';
  const msg = (err.message || String(err)).toLowerCase();
  const code = (err.code || '').toLowerCase();

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Email or password is incorrect. Please verify your credentials and try again.';
  }
  if (msg.includes('email not confirmed') || code === 'email_not_confirmed') {
    return 'Please confirm your email address before signing in. Check your inbox for the confirmation link.';
  }
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (msg.includes('email address invalid') || msg.includes('unable to validate email')) {
    return 'Please enter a valid, active email address.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (msg.includes('password') && (msg.includes('short') || msg.includes('least 6'))) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.includes('expired') || msg.includes('token has expired')) {
    return 'This sign-in link or verification code has expired. Please request a new one.';
  }
  if (msg.includes('provider is not enabled') || msg.includes('unsupported provider')) {
    return 'Google Sign-In is pending provider credentials in Supabase Cloud settings.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Unable to connect to KaushalSetu. Please check your internet connection.';
  }
  return err.message || 'Authentication error. Please try again.';
}
