// src/lib/api.ts - Centralized Type-safe API Client for KaushalSetu
// Direct connection to PostgreSQL Express API - NO MOCK DATA FALLBACKS

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

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

// Token management in localStorage
export function getAuthToken(): string | null {
  return localStorage.getItem('kaushalsetu_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('kaushalsetu_token', token);
  } else {
    localStorage.removeItem('kaushalsetu_token');
  }
}

// Centralized fetch with authentication header and error extraction
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = data?.error?.message || data?.error || data?.message || `Request failed with status ${res.status}`;
      const errorCode = data?.error?.code || 'API_ERROR';
      throw new ApiError(res.status, errorMessage, errorCode);
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, err.message || 'Unable to connect to KaushalSetu services. Please check your connection.', 'NETWORK_ERROR');
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

// ---------------------------------------------------------------------------
// Service Modules
// ---------------------------------------------------------------------------

export const authService = {
  login: async (email: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const res = await apiRequest<{ success: boolean; data: { token: string; user: AuthUser } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.data.token);
    return res.data;
  },

  register: async (payload: { name: string; email: string; password: string; role: string; [key: string]: any }) => {
    const res = await apiRequest<{ success: boolean; data: { token: string; user: AuthUser } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(res.data.token);
    return res.data;
  },

  getMe: async (): Promise<AuthUser | null> => {
    try {
      const res = await apiRequest<{ success: boolean; data: { user: AuthUser } }>('/auth/me');
      return res.data.user;
    } catch {
      setAuthToken(null);
      return null;
    }
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },
};

export const traineeService = {
  getDossier: async (id: string = 'priya'): Promise<TraineeDossier> => {
    return await apiRequest<TraineeDossier>(`/trainees/${encodeURIComponent(id)}/dossier`);
  },

  updateOutcome: async (id: string, payload: { outcomeType: string; monthlySalary: number; jobTitle?: string; employerName?: string; wageLiftPercent?: number; notes?: string }) => {
    return await apiRequest<{ success: boolean; data: any }>(`/trainees/${encodeURIComponent(id)}/outcome`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  requestAssessment: async (id: string, payload: { skillCategory?: string; notes?: string }) => {
    return await apiRequest<{ success: boolean; data: any }>(`/trainees/${encodeURIComponent(id)}/assessment-request`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  submitFollowUp: async (id: string, payload: { followUpId?: string; status?: string; notes?: string }) => {
    return await apiRequest<{ success: boolean; data: any }>(`/trainees/${encodeURIComponent(id)}/follow-up`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export const employerService = {
  getCandidates: async (id: string = 'tata'): Promise<EmployerCandidate[]> => {
    const res = await apiRequest<{ success: boolean; data: EmployerCandidate[] }>(`/employers/${encodeURIComponent(id)}/candidates`);
    return res.data || [];
  },

  verifyRetention: async (candidateId: string, milestone: '3m' | '6m' | '12m') => {
    const res = await apiRequest<{ success: boolean; data: any }>(`/employers/candidates/${encodeURIComponent(candidateId)}/verify-retention`, {
      method: 'PATCH',
      body: JSON.stringify({ milestone, status: 'verified' }),
    });
    return res.data;
  },

  submitFeedback: async (payload: { candidateId: string; deficiencyCategory: string; severity: string; notes: string; employerId?: string }) => {
    const res = await apiRequest<{ success: boolean; message: string; data: any }>('/employers/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },
};

export const providerService = {
  getBatches: async (id: string = 'centurion'): Promise<ProviderBatch[]> => {
    const res = await apiRequest<{ success: boolean; data: ProviderBatch[] }>(`/training-providers/${encodeURIComponent(id)}/batches`);
    return res.data || [];
  },

  deployModule: async (providerId: string = 'centurion', payload: { moduleName: string; batchId?: string; cohortName?: string }) => {
    const res = await apiRequest<{ success: boolean; message: string; data: any }>(`/training-providers/${encodeURIComponent(providerId)}/deploy-module`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },
};

export const governmentService = {
  getAnalytics: async (filters: { district?: string; programme?: string; provider?: string; outcome?: string } = {}): Promise<{ meta: any; data: DistrictMetric[] }> => {
    const query = new URLSearchParams();
    if (filters.district && filters.district !== 'All') query.set('district', filters.district);
    if (filters.programme && filters.programme !== 'All') query.set('programme', filters.programme);
    if (filters.provider && filters.provider !== 'All') query.set('provider', filters.provider);
    if (filters.outcome && filters.outcome !== 'All') query.set('outcome', filters.outcome);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiRequest<{ success: boolean; meta: any; data: DistrictMetric[] }>(`/government/analytics${queryString}`);
    return { meta: res.meta, data: res.data || [] };
  },

  recordAction: async (payload: { actionType: string; district?: string; amount?: string; notes?: string }) => {
    const res = await apiRequest<{ success: boolean; message: string; data: any }>('/government/actions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },
};

export const outcomesService = {
  getSummary: async (): Promise<OutcomesSummary> => {
    const res = await apiRequest<any>('/outcomes/summary');
    return res.data || res;
  },
};

// Aliases for compatibility
export const api = {
  getTraineeDossier: traineeService.getDossier,
  getOutcomesSummary: outcomesService.getSummary,
};

export async function fetchTraineeDossier(id: string = 'priya') {
  return await traineeService.getDossier(id);
}

export async function fetchOutcomesSummary() {
  return await outcomesService.getSummary();
}

export async function fetchEmployerCandidates(id: string = 'tata') {
  return await employerService.getCandidates(id);
}

export async function fetchProviderBatches(id: string = 'centurion') {
  return await providerService.getBatches(id);
}
