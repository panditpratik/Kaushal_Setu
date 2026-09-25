import type { TraineeProfile, TrajectoryMilestone, SkillGauge, FollowUpItem, EmployerCandidate, ProviderBatch } from '../types';
import { 
  PRIYA_PROFILE, 
  TRAJECTORY_MILESTONES, 
  SKILL_GAUGES, 
  FOLLOW_UP_ITEMS,
  EMPLOYER_CANDIDATES,
  PROVIDER_BATCHES 
} from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// ---------------------------------------------------------------------------
// Longitudinal Trainee Dossier Types (Express /api/trainees/:id/dossier)
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

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// In-flight request deduplication map to prevent duplicate wire requests during concurrent renders/StrictMode
const inFlightRequests = new Map<string, Promise<unknown>>();

async function request<T>(path: string): Promise<T> {
  if (inFlightRequests.has(path)) {
    return inFlightRequests.get(path) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.error || `Request failed: ${res.status}`);
      }
      return await (res.json() as Promise<T>);
    } finally {
      setTimeout(() => {
        inFlightRequests.delete(path);
      }, 500);
    }
  })();

  inFlightRequests.set(path, promise);
  return promise;
}

export const api = {
  getTraineeDossier: (traineeId: string) =>
    request<TraineeDossier>(`/trainees/${traineeId}/dossier`),
  getOutcomesSummary: () =>
    request<OutcomesSummary>('/outcomes/summary'),
};

// ---------------------------------------------------------------------------
// Existing Dashboard & Telemetry API types & helpers
// ---------------------------------------------------------------------------

export interface TraineeDossierResponse {
  profile: TraineeProfile;
  milestones: TrajectoryMilestone[];
  skillGaps: SkillGauge[];
  followUps: FollowUpItem[];
  activeVelocity: string;
}

export interface OutcomesSummaryResponse {
  trackedTrainees: {
    formatted: string;
    rawCount: number;
    growthYoY: string;
  };
  sixMonthRetention: {
    formatted: string;
    rate: number;
    verified: boolean;
  };
  consensusStandard: {
    label: string;
    protocol: string;
    zeroGhostPlacements: boolean;
  };
  avgWageLift: {
    formatted: string;
    rate: number;
    benchmark: string;
  };
}

/**
 * Fetch full trainee dossier from PostgreSQL via Express API
 * Falls back gracefully to baseline mock data if backend is offline
 */
export async function fetchTraineeDossier(id: string = 'priya'): Promise<TraineeDossierResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/trainees/${encodeURIComponent(id)}/dossier`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      return {
        profile: json.data.profile,
        milestones: json.data.milestones || TRAJECTORY_MILESTONES,
        skillGaps: json.data.skillGaps || SKILL_GAUGES,
        followUps: json.data.followUps || FOLLOW_UP_ITEMS,
        activeVelocity: json.data.activeVelocity || "+22% Net Wage Lift (14M Tenure)"
      };
    }
  } catch (err) {
    console.warn('[API] Could not fetch live dossier, using fallback:', err);
  }

  return {
    profile: PRIYA_PROFILE,
    milestones: TRAJECTORY_MILESTONES,
    skillGaps: SKILL_GAUGES,
    followUps: FOLLOW_UP_ITEMS,
    activeVelocity: "+22% Net Wage Lift (14M Tenure)"
  };
}

/**
 * Fetch aggregate outcome summary telemetry
 */
export async function fetchOutcomesSummary(): Promise<OutcomesSummaryResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/outcomes/summary`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (err) {
    console.warn('[API] Could not fetch live outcomes summary, using fallback:', err);
  }
  return null;
}

/**
 * Fetch employer candidates roster
 */
export async function fetchEmployerCandidates(id: string = 'tata'): Promise<EmployerCandidate[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/employers/${encodeURIComponent(id)}/candidates`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
  } catch (err) {
    console.warn('[API] Could not fetch live employer candidates, using fallback:', err);
  }
  return EMPLOYER_CANDIDATES;
}

/**
 * Fetch training provider batches
 */
export async function fetchProviderBatches(id: string = 'centurion'): Promise<ProviderBatch[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/training-providers/${encodeURIComponent(id)}/batches`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
  } catch (err) {
    console.warn('[API] Could not fetch live provider batches, using fallback:', err);
  }
  return PROVIDER_BATCHES;
}
