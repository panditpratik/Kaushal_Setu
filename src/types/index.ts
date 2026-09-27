export type StakeholderRole = 'trainee' | 'employer' | 'provider' | 'government';

export type TraineeTab = 'overview' | 'training' | 'outcomes' | 'journey' | 'followups' | 'skills';

export type ProviderTab = 'overview' | 'programmes' | 'trainees' | 'training-records' | 'outcomes' | 'skills' | 'non-placement';

export type GovernmentTab = 
  | 'overview' 
  | 'analytics' 
  | 'programmes' 
  | 'providers' 
  | 'districts' 
  | 'skills' 
  | 'non-placement' 
  | 'attrition' 
  | 'interventions' 
  | 'follow-ups';

export type AppView = 
  | 'landing' 
  | 'login' 
  | 'auth-callback'
  | 'reset-password'
  | 'trainee-dashboard' 
  | 'provider-dashboard' 
  | 'employer-dashboard' 
  | 'government-dashboard';

export interface TraineeProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  course: string;
  level: string;
  trainingPartner: string;
  partnerDistrict: string;
  currentRole: string;
  company: string;
  companyLocation: string;
  tenureMonths: number;
  currentSalary: number;
  baselineSalary: number;
  wageDeltaPercent: number;
  epfoId: string;
  supervisorName: string;
  supervisorRole: string;
  aadhaarVerified: boolean;
  threePartyVerified: boolean;
  skillsCount: {
    total: number;
    verified: number;
  };
}

export interface TrajectoryMilestone {
  step: string;
  date: string;
  title: string;
  description: string;
  type: 'completed' | 'current' | 'projected';
  coordinate: { x: number; y: number };
}

export interface SkillGauge {
  id: string;
  name: string;
  category: string;
  score: number;
  benchmark: number;
  status: 'exceeds' | 'parity' | 'gap' | 'deficit';
  note: string;
}

export interface FollowUpItem {
  id: string;
  date: string;
  title: string;
  description: string;
  status?: 'scheduled' | 'action_required' | 'pending_signoff' | string;
  badge: string;
  actionText: string;
}

export interface EmployerCandidate {
  id: string;
  name: string;
  role: string;
  batch: string;
  joinDate: string;
  tenure: string;
  retention3m: 'verified' | 'pending' | 'flagged' | string;
  retention6m: 'verified' | 'pending' | 'flagged' | string;
  retention12m: 'verified' | 'pending' | 'flagged' | string;
  skillDeficiency?: string;
  wageStatus: string;
  traineeId?: string;
  validationStatus?: string;
  outcomeId?: string;
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
  status: 'active' | 'audited' | 'pending_verification' | string;
}
