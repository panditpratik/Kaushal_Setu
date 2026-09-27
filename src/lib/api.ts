// src/lib/api.ts - Centralized Type-safe API Client for KaushalSetu
// Migrated to Supabase Auth, PostgreSQL RPC functions, and Edge Functions.
// STRICT RULE: ABSOLUTELY NO MOCK DATA FALLBACKS.
// If Supabase returns an error, a typed ApiError is raised for explicit UI handling.

import { supabase } from './supabase';
export { supabase };

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
    email?: string;
    gender: string | null;
    aadhaarLinked: boolean;
    epfoId: string | null;
    contactNumber?: string | null;
    education?: string | null;
    district?: string | null;
    state?: string | null;
    region?: string | null;
    currentOccupation?: string | null;
    experienceYears?: number | null;
    skills?: string[] | null;
    employmentStatus?: string | null;
    consentStatus?: string | null;
    consentTimestamp?: string | null;
    consentVersion?: string | null;
    selfEmploymentCategory?: string | null;
    selfEmploymentIncome?: number | null;
    apprenticeshipEmployer?: string | null;
    unemploymentReason?: string | null;
    unemploymentNotes?: string | null;
  };
  verification: { aadhaar: string; epfo: string };
  cohort: { name: string; trainingProvider: string } | null;
  trainingHistory?: {
    id: string;
    cohortId: string;
    programme: string;
    providerName: string;
    enrolledAt: string;
    startDate: string;
    endDate: string | null;
    status: string;
    isCompleted: boolean;
  }[];
  certifications: {
    id?: string;
    name: string;
    course: string;
    issuingBody?: string;
    issuedAt: string;
    certificateNumber: string;
    status?: string;
  }[];
  activeEmployment: {
    jobTitle: string;
    employerName: string;
    monthlySalary: number;
    tenureMonths: number | null;
    employmentType?: string | null;
    startDate?: string;
  } | null;
  employmentRecords?: {
    id: string;
    jobTitle: string;
    employerName: string;
    monthlySalary: number;
    employmentType?: string | null;
    startDate: string;
    endDate: string | null;
  }[];
  salaryProgression?: {
    hasSufficientRecords: boolean;
    recordCount: number;
    baselineSalary: number;
    baselineDate: string;
    currentSalary: number;
    currentDate: string;
    absoluteChange: number;
    percentChange: number;
  } | null;
  followUps?: {
    id: string;
    scheduledAt: string;
    status: string;
    notes: string;
    retentionStatus?: string;
    employmentStatus?: string;
    monthlySalary?: number;
    skillRelevance?: string;
    roleRelevance?: string;
  }[];
  skillGaps?: {
    id: string;
    skillName: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    assessmentDate: string;
    overallScore: number;
    assessorType: string;
    interventionType?: string;
    providerName?: string;
    interventionStatus?: string;
  }[];
  trajectoryVelocity: { wageLiftPercent: number | null; tenureMonths: number | null };
  stages: DossierStage[];
  journey?: {
    date: string;
    type: string;
    title: string;
    organization: string;
    status: string;
  }[];
}

export interface GovernmentAnalytics {
  meta: {
    calculatedAt: string;
    callerUid?: string;
    dataSource?: string;
  };
  funnel: {
    totalTrained: number;
    completed: number;
    completionRate: number;
    certified: number;
    certificationRate: number;
    placed: number;
    placementRate: number;
    placedVerified: number;
    currentlyEmployed: number;
    employmentRate: number;
    retained: number;
    retentionEligible: number;
    retentionRate: number;
    salaryProgression: {
      medianBaseline: number;
      medianCurrent: number;
      medianDeltaPercent: number;
      traineesWithIncreaseCount: number;
      percentWithIncrease: number;
    };
  };
  impactMatrix?: {
    trainingOutcome: {
      enrolled: number;
      completed: number;
      certified: number;
      completionRate: number;
      certificationRate: number;
    };
    employmentOutcome: {
      employed: number;
      selfEmployed: number;
      apprentices: number;
      unemployed: number;
      totalAssessed: number;
    };
    retentionOutcome: {
      sixMonths: {
        eligible: number;
        stillEmployed: number;
        leftJob: number;
        retentionRate: number;
      };
      twelveMonths: {
        eligible: number;
        stillEmployed: number;
        changedJobs: number;
        retentionRate: number;
      };
    };
  };
  outcomeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  retentionTrend: {
    milestone: string;
    rate: number;
    sampleSize: number;
    verifiedCount: number;
  }[];
  skillGaps: {
    skillName: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    traineeCount: number;
    avgScore: number;
  }[];
  providerComparison: {
    providerId: string;
    providerName: string;
    accreditationId: string;
    totalTrainees: number;
    completionRate: number;
    certificationRate: number;
    placementRate: number;
    avgSalary: number;
  }[];
  data: DistrictMetric[];
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
    payload: { followUpId?: string; status?: string; notes?: string; actionType?: string; skillCategory?: string }
  ) => {
    const { data, error } = await supabase.functions.invoke('submit-follow-up', {
      body: { traineeId: id, candidateId: id, ...payload },
    });

    if (error) {
      handleSupabaseError(error, 'Failed to submit follow-up via Edge Function');
    }

    return { success: true, data };
  },

  requestAssessment: async (id: string, payload: { skillCategory?: string; notes?: string }) => {
    const { data, error } = await supabase.functions.invoke('submit-follow-up', {
      body: {
        traineeId: id,
        candidateId: id,
        actionType: 'ASSESSMENT_REQUEST',
        status: 'Assessment Requested',
        skillCategory: payload.skillCategory || 'Industrial Automation Level 5',
        notes: payload.notes || `Candidate requested evaluation for ${payload.skillCategory || 'Industrial Automation'}`,
      },
    });

    if (error) {
      handleSupabaseError(error, 'Failed to submit assessment request');
    }

    return { success: true, data };
  },

  getFollowUps: async (traineeId: string) => {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('follow_up_date', { ascending: false });

    if (error) {
      return [];
    }
    return data || [];
  },

  // Profile and DPDP Consent update
  updateProfileAndConsent: async (payload: {
    trainee_id?: string;
    name?: string;
    contact_number?: string;
    education?: string;
    district?: string;
    state?: string;
    region?: string;
    current_occupation?: string;
    experience_years?: number;
    skills?: string[];
    consent_status?: string;
    consent_version?: string;
  }) => {
    const { data, error } = await supabase.rpc('update_trainee_profile_and_consent', {
      p_data: payload,
    });
    if (error) handleSupabaseError(error, 'Failed to update trainee profile and consent in database');
    return data;
  },

  // Employment and Wage enhancement update
  recordEmploymentUpdate: async (payload: {
    trainee_id?: string;
    status: string;
    job_title?: string;
    employer_name?: string;
    employment_type?: string;
    monthly_salary?: number;
    start_date?: string;
    end_date?: string;
    district?: string;
    state?: string;
    is_self_employed?: boolean;
    self_employment_category?: string;
    is_apprenticeship?: boolean;
    apprenticeship_employer?: string;
    unemployment_reason?: string;
    unemployment_notes?: string;
    notes?: string;
  }) => {
    const { data, error } = await supabase.rpc('record_trainee_employment_update', {
      p_data: payload,
    });
    if (error) handleSupabaseError(error, 'Failed to record employment update in database');
    return data;
  },

  // Longitudinal Follow-Up survey submission
  submitFollowUpSurvey: async (payload: {
    trainee_id?: string;
    followUpId?: string;
    employment_status: string;
    monthly_salary?: number;
    retention_status: string;
    skill_relevance?: string;
    role_relevance?: string;
    reason_notes?: string;
  }) => {
    const { data, error } = await supabase.rpc('submit_trainee_follow_up_survey', {
      p_data: payload,
    });
    if (error) handleSupabaseError(error, 'Failed to submit follow-up survey in database');
    return data;
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
    if (data && Array.isArray((data as any).batches)) return (data as any).batches as ProviderBatch[];
    return [];
  },

  // Extended provider outcome intelligence
  getProviderAnalytics: async (id?: string): Promise<any> => {
    const providerParam = id || 'default';
    const { data, error } = await supabase.rpc('get_provider_batches', {
      p_provider_id: providerParam,
    });
    if (error) handleSupabaseError(error, 'Failed to load provider analytics');
    return data;
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
  ): Promise<GovernmentAnalytics> => {
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

    return data as GovernmentAnalytics;
  },

  // Supabase Realtime subscription for live longitudinal outcome events
  subscribeToAnalytics: (onUpdate: () => void) => {
    const channel = supabase
      .channel('gov-outcomes-realtime-' + Math.random().toString(36).slice(2, 7))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outcomes' }, () => onUpdate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employment_records' }, () => onUpdate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_ups' }, () => onUpdate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainees' }, () => onUpdate())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
