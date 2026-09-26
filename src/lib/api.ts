// src/lib/api.ts - Centralized Type-safe API Client for KaushalSetu
// Migrated to Supabase Auth, PostgreSQL RPC functions, and Edge Functions.
// STRICT RULE: ABSOLUTELY NO MOCK DATA FALLBACKS.
// If Supabase returns an error, a typed ApiError is raised for explicit UI handling.

import { supabase } from './supabase';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface DossierStage {
  assessment: { id: string; date: string; overallScore: number };
  skillGap: { id: string; skillName: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' };
  intervention: {
    id: string;
    type: string;
    providerName: string;
    status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'DROPPED';
    startDate: string;
    endDate: string | null;
  };
  outcome: {
    id: string;
    type: 'EMPLOYED' | 'UNEMPLOYED' | 'UPSKILLED' | 'NO_CHANGE';
    wageLiftPercent: number | null;
    employerName: string | null;
    recordedAt: string;
  };
  insights: { text: string; confidenceScore: number }[];
}

export interface TraineeDossier {
  trainee: {
    id: string;
    name: string;
    gender: string | null;
    aadhaarLinked: boolean;
    epfoId: string | null;
  };
  verification: { aadhaar: string; epfo: string };
  cohort: { name: string; trainingProvider: string } | null;
  certifications: {
    name: string;
    course: string;
    issuedAt: string;
    certificateNumber: string;
  }[];
  activeEmployment: {
    jobTitle: string;
    employerName: string;
    monthlySalary: number;
    tenureMonths: number | null;
  } | null;
  trajectoryVelocity: { wageLiftPercent: number | null; tenureMonths: number | null };
  stages: DossierStage[];
}

export interface OutcomesSummary {
  totalTrainees: number;
  totalOutcomes: number;
  employmentRate: number;
  averageWageLiftPercent: number | null;
  outcomeBreakdown: {
    type: string;
    count: number;
  }[];
  verification: {
    aadhaarVerifiedCount: number;
    epfoVerifiedCount: number;
  };
  trackedTrainees?: {
    formatted: string;
    rawCount: number;
    growthYoY: string;
  };
  sixMonthRetention?: {
    formatted: string;
    rate: number;
    verified: boolean;
  };
  consensusStandard?: {
    label: string;
    protocol: string;
    zeroGhostPlacements: boolean;
  };
  avgWageLift?: {
    formatted: string;
    rate: number;
    benchmark: string;
  };
}

export interface EmployerCandidate {
  id: string;
  traineeId: string;
  outcomeId?: string;
  name: string;
  role: string;
  batch: string;
  joinDate: string;
  tenure: string;
  retention3m: string;
  retention6m: string;
  retention12m: string;
  validationStatus: string;
  skillDeficiency?: string;
  wageStatus: string;
}

export interface ProviderBatch {
  id: string;
  name: string;
  sector: string;
  enrolled: number;
  certified: number;
  placed: number;
  retentionRate6m: number;
  retentionRate12m: number;
  incentiveUnlocked: boolean;
  incentiveAmount: string;
  status: string;
}

export interface DistrictMetric {
  district: string;
  activeTrainees: number;
  retention6m: number;
  retention12m: number;
  avgStartingWage: string;
  avgCurrentWage: string;
  wageDelta: string;
  complianceRate: number;
  leadEmployer: string;
  programme: string;
  provider: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  traineeId?: string;
  employerId?: string;
  providerId?: string;
  govId?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helper: Error extraction from Supabase responses
// ---------------------------------------------------------------------------
function handleSupabaseError(error: any, fallbackMessage: string): never {
  const status = error?.status || (error?.code === 'PGRST116' ? 404 : 500);
  const message = error?.message || error?.details || fallbackMessage;
  const code = error?.code || 'SUPABASE_ERROR';
  throw new ApiError(status, message, code);
}

// ---------------------------------------------------------------------------
// Service Modules: Supabase Auth, RPC, and Edge Functions
// ---------------------------------------------------------------------------

export const authService = {
  login: async (email: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      throw new ApiError(401, error?.message || 'Invalid email or password', 'AUTH_FAILED');
    }

    // Resolve profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      throw new ApiError(403, 'User profile not found in system database', 'NO_PROFILE');
    }

    const authUser: AuthUser = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
    };

    if (profile.role === 'TRAINEE') {
      const { data: tr } = await supabase.from('trainees').select('id').eq('user_id', profile.id).maybeSingle();
      if (tr) authUser.traineeId = tr.id;
    } else if (profile.role === 'EMPLOYER') {
      const { data: emp } = await supabase.from('employers').select('id').eq('user_id', profile.id).maybeSingle();
      if (emp) authUser.employerId = emp.id;
    } else if (profile.role === 'TRAINING_PROVIDER') {
      const { data: tp } = await supabase.from('training_providers').select('id').eq('user_id', profile.id).maybeSingle();
      if (tp) authUser.providerId = tp.id;
    }

    return { token: data.session.access_token, user: authUser };
  },

  getMe: async (): Promise<AuthUser | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', user.id)
        .single();

      if (error || !profile) return null;

      const authUser: AuthUser = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
      };

      if (profile.role === 'TRAINEE') {
        const { data: tr } = await supabase.from('trainees').select('id').eq('user_id', profile.id).maybeSingle();
        if (tr) authUser.traineeId = tr.id;
      } else if (profile.role === 'EMPLOYER') {
        const { data: emp } = await supabase.from('employers').select('id').eq('user_id', profile.id).maybeSingle();
        if (emp) authUser.employerId = emp.id;
      } else if (profile.role === 'TRAINING_PROVIDER') {
        const { data: tp } = await supabase.from('training_providers').select('id').eq('user_id', profile.id).maybeSingle();
        if (tp) authUser.providerId = tp.id;
      }

      return authUser;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },
};

export const traineeService = {
  // Read operation via PostgreSQL RPC function: get_trainee_dossier
  getDossier: async (id?: string): Promise<TraineeDossier> => {
    const targetId = id || 'me';
    const { data, error } = await supabase.rpc('get_trainee_dossier', { p_id: targetId });

    if (error) {
      handleSupabaseError(error, `Failed to load trainee dossier for identifier: ${targetId}`);
    }

    if (!data || data.success === false) {
      throw new ApiError(404, data?.error || 'Trainee dossier not found in database', 'NOT_FOUND');
    }

    return data as TraineeDossier;
  },

  // Write operation via Supabase Edge Function: record-outcome
  updateOutcome: async (
    id: string,
    payload: {
      outcomeType: string;
      monthlySalary: number;
      jobTitle?: string;
      employerName?: string;
      wageLiftPercent?: number;
      notes?: string;
    }
  ) => {
    const { data, error } = await supabase.functions.invoke('record-outcome', {
      body: { candidateId: id, ...payload },
    });

    if (error) {
      handleSupabaseError(error, 'Failed to record outcome via Edge Function');
    }

    return { success: true, data };
  },

  // Write operation via Supabase Edge Function: submit-follow-up
  submitFollowUp: async (
    id: string,
    payload: { followUpId?: string; status?: string; notes?: string }
  ) => {
    const { data, error } = await supabase.functions.invoke('submit-follow-up', {
      body: { candidateId: id, ...payload },
    });

    if (error) {
      handleSupabaseError(error, 'Failed to submit follow-up via Edge Function');
    }

    return { success: true, data };
  },

  requestAssessment: async (id: string, payload: { skillCategory?: string; notes?: string }) => {
    // Uses submit-follow-up edge function with status Assessment Requested
    const { data, error } = await supabase.functions.invoke('submit-follow-up', {
      body: { candidateId: id, status: 'Assessment Requested', notes: payload.notes || payload.skillCategory },
    });

    if (error) {
      handleSupabaseError(error, 'Failed to submit assessment request');
    }

    return { success: true, data };
  },
};

export const employerService = {
  // Read operation via PostgreSQL RPC function: get_employer_candidates
  getCandidates: async (id?: string): Promise<EmployerCandidate[]> => {
    const employerParam = id || 'default';
    const { data, error } = await supabase.rpc('get_employer_candidates', {
      p_employer_id: employerParam,
    });

    if (error) {
      handleSupabaseError(error, 'Failed to load employer candidates from database');
    }

    if (Array.isArray(data)) return data as EmployerCandidate[];
    if (data && Array.isArray((data as any).data)) return (data as any).data as EmployerCandidate[];
    return [];
  },

  // Write operation via Supabase Edge Function: verify-retention
  verifyRetention: async (candidateId: string, milestone: '3m' | '6m' | '12m') => {
    const { data, error } = await supabase.functions.invoke('verify-retention', {
      body: { candidateId, milestone, status: 'verified' },
    });

    if (error) {
      handleSupabaseError(error, `Failed to verify ${milestone} retention milestone`);
    }

    return data;
  },

  // Write operation via Supabase Edge Function: submit-feedback
  submitFeedback: async (payload: {
    candidateId: string;
    deficiencyCategory: string;
    severity: string;
    notes: string;
    employerId?: string;
  }) => {
    const { data, error } = await supabase.functions.invoke('submit-feedback', {
      body: payload,
    });

    if (error) {
      handleSupabaseError(error, 'Failed to submit employer feedback');
    }

    return { success: true, message: 'Feedback recorded successfully', data };
  },
};

export const providerService = {
  // Read operation via PostgreSQL RPC function: get_provider_batches
  getBatches: async (id?: string): Promise<ProviderBatch[]> => {
    const providerParam = id || 'default';
    const { data, error } = await supabase.rpc('get_provider_batches', {
      p_provider_id: providerParam,
    });

    if (error) {
      handleSupabaseError(error, 'Failed to load provider batches from database');
    }

    if (Array.isArray(data)) return data as ProviderBatch[];
    if (data && Array.isArray((data as any).data)) return (data as any).data as ProviderBatch[];
    return [];
  },

  // Write operation via Supabase Edge Function: deploy-intervention
  deployModule: async (
    providerId: string = 'centurion',
    payload: { moduleName: string; batchId?: string; cohortName?: string }
  ) => {
    const { data, error } = await supabase.functions.invoke('deploy-intervention', {
      body: { providerId, ...payload },
    });

    if (error) {
      handleSupabaseError(error, 'Failed to deploy intervention module via Edge Function');
    }

    return { success: true, message: 'Module deployed successfully', data };
  },
};

export const governmentService = {
  // Read operation via PostgreSQL RPC function: get_government_analytics
  getAnalytics: async (
    filters: { district?: string; programme?: string; provider?: string; outcome?: string } = {}
  ): Promise<{ meta: any; data: DistrictMetric[] }> => {
    const district = !filters.district || filters.district === 'All' ? null : filters.district;
    const programme = !filters.programme || filters.programme === 'All' ? null : filters.programme;
    const provider = !filters.provider || filters.provider === 'All' ? null : filters.provider;
    const outcome = !filters.outcome || filters.outcome === 'All' ? null : filters.outcome;

    const { data, error } = await supabase.rpc('get_government_analytics', {
      p_district: district,
      p_programme: programme,
      p_provider: provider,
      p_outcome: outcome,
    });

    if (error) {
      handleSupabaseError(error, 'Failed to load government analytics');
    }

    const payload = data as { meta: any; data: DistrictMetric[] };
    return { meta: payload?.meta || {}, data: payload?.data || [] };
  },

  // Transactional action via PostgreSQL RPC function: record_programme_action
  recordAction: async (payload: {
    actionType: string;
    district?: string;
    amount?: string | number;
    notes?: string;
  }) => {
    const numAmount = payload.amount ? parseFloat(String(payload.amount).replace(/[^0-9.]/g, '')) : null;
    const { data, error } = await supabase.rpc('record_programme_action', {
      p_action_type: payload.actionType,
      p_district: payload.district || null,
      p_amount: numAmount || null,
      p_notes: payload.notes || null,
    });

    if (error) {
      handleSupabaseError(error, 'Failed to execute government programme action');
    }

    return { success: true, message: 'Programme action recorded to audit ledger', data };
  },
};

export const outcomesService = {
  // Read operation via PostgreSQL RPC function: get_outcomes_summary
  getSummary: async (): Promise<OutcomesSummary> => {
    const { data, error } = await supabase.rpc('get_outcomes_summary');

    if (error) {
      handleSupabaseError(error, 'Failed to load sovereign outcomes summary');
    }

    return data as OutcomesSummary;
  },
};

export const notificationService = {
  // Read notifications directly from public.notifications with RLS
  getNotifications: async (): Promise<NotificationItem[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, read, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError(error, 'Failed to retrieve notifications');
    }

    return (data as NotificationItem[]) || [];
  },

  // Mark notification read
  markAsRead: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, 'Failed to update notification state');
    }
  },

  // Supabase Realtime subscription strictly scoped to authenticated user
  subscribeToUserNotifications: (
    userId: string,
    onNotification: (notification: NotificationItem) => void,
    onError?: (err: any) => void
  ): (() => void) => {
    if (!userId) {
      return () => {};
    }

    const channelName = `user-notifications-${userId}`;

    // Clean up existing channel for this user if already active to prevent duplicates
    const existing = (supabase as any)._activeNotificationChannels?.get?.(userId);
    if (existing) {
      supabase.removeChannel(existing);
      (supabase as any)._activeNotificationChannels.delete(userId);
    }

    if (!(supabase as any)._activeNotificationChannels) {
      (supabase as any)._activeNotificationChannels = new Map<string, any>();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).id) {
            onNotification(payload.new as NotificationItem);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // Connected successfully
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (err && onError) {
            onError(err);
          }
        }
      });

    (supabase as any)._activeNotificationChannels.set(userId, channel);

    return () => {
      if ((supabase as any)._activeNotificationChannels?.get(userId) === channel) {
        (supabase as any)._activeNotificationChannels.delete(userId);
      }
      supabase.removeChannel(channel);
    };
  },
};

// Aliases for compatibility
export const api = {
  getTraineeDossier: traineeService.getDossier,
  getOutcomesSummary: outcomesService.getSummary,
};

export async function fetchTraineeDossier(id?: string) {
  return await traineeService.getDossier(id);
}

export async function fetchOutcomesSummary() {
  return await outcomesService.getSummary();
}

export async function fetchEmployerCandidates(id?: string) {
  return await employerService.getCandidates(id);
}

export async function fetchProviderBatches(id?: string) {
  return await providerService.getBatches(id);
}
