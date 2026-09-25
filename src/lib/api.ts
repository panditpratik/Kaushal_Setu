// src/lib/api.ts
// Minimal API client. Keep this the single place that knows the backend URL.

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

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getTraineeDossier: (traineeId: string) =>
    request<TraineeDossier>(`/trainees/${traineeId}/dossier`),
};

export { ApiError };

// ---------------------------------------------------------------------------
// Compatibility helpers for other dashboards
// ---------------------------------------------------------------------------

export interface TraineeDossierResponse {
  profile: TraineeProfile;
  milestones: TrajectoryMilestone[];
  skillGaps: SkillGauge[];
  followUps: FollowUpItem[];
  activeVelocity: string;
  raw?: TraineeDossier;
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

export async function fetchTraineeDossier(id: string = 'priya'): Promise<TraineeDossierResponse> {
  try {
    const data = await api.getTraineeDossier(id);
    const wageLift = data.trajectoryVelocity?.wageLiftPercent ?? 22;
    const tenure = data.trajectoryVelocity?.tenureMonths ?? 14;
    const activeVelocity = `+${wageLift}% Net Wage Lift (${tenure}M Tenure)`;

    const primaryCert = data.certifications?.[0];
    const activeEmp = data.activeEmployment;
    const currentSalary = activeEmp?.monthlySalary || 22000;
    const baselineSalary = Math.round(currentSalary / (1 + wageLift / 100));

    const profile: TraineeProfile = {
      id: data.trainee.id,
      name: data.trainee.name,
      course: primaryCert?.course || 'Warehouse Operations & Inventory Management',
      level: primaryCert?.name || 'Certified Warehouse Associate',
      trainingPartner: data.cohort?.trainingProvider || 'SkillBridge Academy',
      partnerDistrict: 'Delhi NCR Region',
      currentRole: activeEmp?.jobTitle || 'Warehouse Associate',
      company: activeEmp?.employerName || 'Nexora Logistics Pvt Ltd',
      companyLocation: 'Sector 62, Industrial Corridor, Delhi NCR',
      tenureMonths: tenure,
      currentSalary,
      baselineSalary,
      wageDeltaPercent: wageLift,
      epfoId: data.trainee.epfoId || 'EPFO-MH-88213',
      supervisorName: 'Vikram R.',
      supervisorRole: 'Lead Operations & Inventory',
      aadhaarVerified: data.verification?.aadhaar === 'VERIFIED',
      threePartyVerified: data.verification?.aadhaar === 'VERIFIED' && data.verification?.epfo === 'VERIFIED',
      skillsCount: { total: 4, verified: 3 }
    };

    return {
      profile,
      milestones: TRAJECTORY_MILESTONES,
      skillGaps: SKILL_GAUGES,
      followUps: FOLLOW_UP_ITEMS,
      activeVelocity,
      raw: data
    };
  } catch (err) {
    console.warn('[API] Could not fetch live dossier, using fallback:', err);
    return {
      profile: PRIYA_PROFILE,
      milestones: TRAJECTORY_MILESTONES,
      skillGaps: SKILL_GAUGES,
      followUps: FOLLOW_UP_ITEMS,
      activeVelocity: "+22% Net Wage Lift (14M Tenure)"
    };
  }
}

export async function fetchOutcomesSummary(): Promise<OutcomesSummaryResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/outcomes/summary`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (err) {
    console.warn('[API] Outcomes summary offline, using defaults:', err);
  }
  return null;
}

export async function fetchEmployerCandidates(_employerId: string = 'default'): Promise<EmployerCandidate[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/employers/default/candidates`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && json.data && json.data.length > 0) {
      return json.data;
    }
  } catch (err) {
    console.warn('[API] Candidates API offline, using fallback:', err);
  }
  return EMPLOYER_CANDIDATES;
}

export async function fetchProviderBatches(_providerId: string = 'default'): Promise<ProviderBatch[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/training-providers/default/batches`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json.success && json.data && json.data.length > 0) {
      return json.data;
    }
  } catch (err) {
    console.warn('[API] Batches API offline, using fallback:', err);
  }
  return PROVIDER_BATCHES;
}
