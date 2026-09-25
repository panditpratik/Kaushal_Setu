import type { TraineeProfile, TrajectoryMilestone, SkillGauge, FollowUpItem, EmployerCandidate, ProviderBatch } from '../types';
import { 
  PRIYA_PROFILE, 
  TRAJECTORY_MILESTONES, 
  SKILL_GAUGES, 
  FOLLOW_UP_ITEMS,
  EMPLOYER_CANDIDATES,
  PROVIDER_BATCHES 
} from '../data/mockData';

const API_BASE = 'http://localhost:4000/api';

export interface RawTraineeDossier {
  trainee: {
    id: string;
    name: string;
    gender: string | null;
    aadhaarLinked: boolean;
    epfoId: string | null;
  };
  verification: {
    aadhaar: string;
    epfo: string;
  };
  cohort: {
    name: string;
    trainingProvider: string;
  } | null;
  certifications: Array<{
    name: string;
    course: string;
    issuedAt: string;
    certificateNumber: string;
  }>;
  activeEmployment: {
    jobTitle: string;
    employerName: string;
    monthlySalary: number;
    tenureMonths: number | null;
  } | null;
  trajectoryVelocity: {
    wageLiftPercent: number | null;
    tenureMonths: number | null;
  };
  stages: any[];
}

export interface TraineeDossierResponse {
  profile: TraineeProfile;
  milestones: TrajectoryMilestone[];
  skillGaps: SkillGauge[];
  followUps: FollowUpItem[];
  activeVelocity: string;
  raw?: RawTraineeDossier;
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
    const res = await fetch(`${API_BASE}/trainees/${encodeURIComponent(id)}/dossier`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();

    // Canonical direct dossier shape with trajectoryVelocity
    if (json.trajectoryVelocity) {
      const wageLift = json.trajectoryVelocity.wageLiftPercent ?? 22;
      const tenure = json.trajectoryVelocity.tenureMonths ?? 14;
      const activeVelocity = `+${wageLift}% Net Wage Lift (${tenure}M Tenure)`;
      
      const primaryCert = json.certifications?.[0];
      const activeEmp = json.activeEmployment;
      const currentSalary = activeEmp?.monthlySalary || 22000;
      const baselineSalary = Math.round(currentSalary / (1 + wageLift / 100));

      const profile: TraineeProfile = {
        id: json.trainee.id,
        name: json.trainee.name,
        course: primaryCert?.course || 'Warehouse Operations & Inventory Management',
        level: primaryCert?.name || 'Certified Warehouse Associate',
        trainingPartner: json.cohort?.trainingProvider || 'SkillBridge Academy',
        partnerDistrict: 'Delhi NCR Region',
        currentRole: activeEmp?.jobTitle || 'Warehouse Associate',
        company: activeEmp?.employerName || 'Nexora Logistics Pvt Ltd',
        companyLocation: 'Sector 62, Industrial Corridor, Delhi NCR',
        tenureMonths: tenure,
        currentSalary,
        baselineSalary,
        wageDeltaPercent: wageLift,
        epfoId: json.trainee.epfoId || 'EPFO-MH-88213',
        supervisorName: 'Vikram R.',
        supervisorRole: 'Lead Operations & Inventory',
        aadhaarVerified: json.verification?.aadhaar === 'VERIFIED',
        threePartyVerified: json.verification?.aadhaar === 'VERIFIED' && json.verification?.epfo === 'VERIFIED',
        skillsCount: { total: 4, verified: 3 }
      };

      return {
        profile,
        milestones: TRAJECTORY_MILESTONES,
        skillGaps: SKILL_GAUGES,
        followUps: FOLLOW_UP_ITEMS,
        activeVelocity,
        raw: json
      };
    }

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
    const res = await fetch(`${API_BASE}/outcomes/summary`);
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
    const res = await fetch(`${API_BASE}/employers/${encodeURIComponent(id)}/candidates`);
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
    const res = await fetch(`${API_BASE}/training-providers/${encodeURIComponent(id)}/batches`);
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
