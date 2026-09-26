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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
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

    // Listen to Supabase auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
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
        throw new Error(signInErr?.message || 'Invalid credentials or login failed');
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
      signOut,
      refreshProfile,
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
