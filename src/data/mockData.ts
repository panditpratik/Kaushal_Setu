import type { 
  TraineeProfile, 
  TrajectoryMilestone, 
  SkillGauge, 
  FollowUpItem, 
  EmployerCandidate, 
  ProviderBatch 
} from '../types';

export const PRIYA_PROFILE: TraineeProfile = {
  id: 'KS-9812-PUN-2023',
  name: 'Priya Sharma',
  course: 'Industrial Electrician',
  level: 'Level 4 (NCVET Certified)',
  trainingPartner: 'Centurion Skill Academy',
  partnerDistrict: 'Pune Metro Region, Maharashtra',
  currentRole: 'Sr. Industrial Electrician (Diagnostic Lead)',
  company: 'Tata Motors Ancillary Ltd.',
  companyLocation: 'Chakan Industrial Estate, Unit 2, Pune, MH',
  tenureMonths: 14,
  currentSalary: 21500,
  baselineSalary: 17600,
  wageDeltaPercent: 22.1,
  epfoId: 'MH/PUN/0088219/000/0192',
  supervisorName: 'Vikram R.',
  supervisorRole: 'Lead Operations & Maintenance',
  aadhaarVerified: true,
  threePartyVerified: true,
  skillsCount: {
    total: 4,
    verified: 3
  }
};

export const TRAJECTORY_MILESTONES: TrajectoryMilestone[] = [
  {
    step: '01',
    date: 'Oct 2023',
    title: 'Training Completed',
    description: 'PMKVY 4.0 Centurion, 420 hrs practical workshop verified',
    type: 'completed',
    coordinate: { x: 50, y: 173 }
  },
  {
    step: '02',
    date: 'Dec 2023',
    title: 'NCVET Certified',
    description: 'Level 4 Industrial Electrician credential with 89.2% score',
    type: 'completed',
    coordinate: { x: 210, y: 155 }
  },
  {
    step: '03',
    date: 'Jan 2024',
    title: 'First Placement',
    description: 'Tata Motors Ancillary Ltd., Jr Tech at ₹17,600/month baseline',
    type: 'completed',
    coordinate: { x: 390, y: 132 }
  },
  {
    step: '04',
    date: 'Jul 2024',
    title: 'Role Escalation',
    description: 'Diagnostic Tech designation & Shift B maintenance co-lead',
    type: 'completed',
    coordinate: { x: 570, y: 105 }
  },
  {
    step: '05',
    date: 'Nov 2024',
    title: 'Wage Enhancement',
    description: '+22% logged (₹21,500/mo verified via automated EPFO pulse)',
    type: 'current',
    coordinate: { x: 750, y: 74 }
  },
  {
    step: '06',
    date: 'Present / Next',
    title: '18M Horizon',
    description: 'Scheduled audit due in 4 months; promotion to Level 5',
    type: 'projected',
    coordinate: { x: 920, y: 35 }
  }
];

export const SKILL_GAUGES: SkillGauge[] = [
  {
    id: 'gauge-1',
    name: '1. Technical Mastery & Circuit Diagnostics',
    category: 'Level 4 Standard',
    score: 88,
    benchmark: 80,
    status: 'exceeds',
    note: 'Exceeds Benchmark (+8%)'
  },
  {
    id: 'gauge-2',
    name: '2. Practical Tool Handling & Industrial Safety',
    category: 'Safety Audit Cleared',
    score: 92,
    benchmark: 85,
    status: 'exceeds',
    note: 'Exceeds Benchmark (+7%)'
  },
  {
    id: 'gauge-3',
    name: '3. Digital Tooling & PLC Systems Calibration',
    category: 'Active Gap Detected',
    score: 65,
    benchmark: 75,
    status: 'gap',
    note: 'Active Gap (-10%) · In-Job Upskilling Suggested'
  },
  {
    id: 'gauge-4',
    name: '4. Role-Specific Compliance & Factory SOPs',
    category: 'ISO 9001 / OSHA Alignment',
    score: 85,
    benchmark: 85,
    status: 'parity',
    note: 'Exact Parity Met'
  }
];

export const FOLLOW_UP_ITEMS: FollowUpItem[] = [
  {
    id: 'fu-1',
    date: '15 MAY 2025',
    title: '18-Month Longitudinal Audit',
    description: 'Automated employer wage slip pulse via EPFO linkage and attendance integrity audit.',
    status: 'scheduled',
    badge: 'SCHEDULED',
    actionText: 'Inspect Linkage'
  },
  {
    id: 'fu-2',
    date: '02 JUN 2025',
    title: 'PLC Advanced Diagnostic Assessment',
    description: 'Self-paced employer micro-credential module to bridge the 10% calibration deficit in PLC systems.',
    status: 'action_required',
    badge: 'MODULE OPEN',
    actionText: 'Review Syllabus'
  },
  {
    id: 'fu-3',
    date: '28 JUN 2025',
    title: 'Supervisor Retention Validation (Q2)',
    description: 'Direct supervisor Vikram R. confirmation for Level 5 promotion and continuous industrial placement.',
    status: 'pending_signoff',
    badge: 'PENDING SIGN-OFF',
    actionText: 'Send Reminder'
  }
];

export const EMPLOYER_CANDIDATES: EmployerCandidate[] = [
  {
    id: 'CAND-01',
    name: 'Priya Sharma',
    role: 'Sr. Industrial Electrician',
    batch: 'Centurion Pune Batch #14',
    joinDate: '15 Jan 2024',
    tenure: '14 Months',
    retention3m: 'verified',
    retention6m: 'verified',
    retention12m: 'verified',
    skillDeficiency: 'PLC Systems Calibration',
    wageStatus: '₹21,500/mo (+22%)'
  },
  {
    id: 'CAND-02',
    name: 'Rahul K. Verma',
    role: 'CNC Machine Operator',
    batch: 'SMART Delhi TC-401',
    joinDate: '01 Feb 2024',
    tenure: '13 Months',
    retention3m: 'verified',
    retention6m: 'verified',
    retention12m: 'verified',
    wageStatus: '₹19,800/mo (+18%)'
  },
  {
    id: 'CAND-03',
    name: 'Ananya Deshmukh',
    role: 'Automotive Quality Inspector',
    batch: 'Centurion Pune Batch #14',
    joinDate: '10 Apr 2024',
    tenure: '11 Months',
    retention3m: 'verified',
    retention6m: 'verified',
    retention12m: 'pending',
    wageStatus: '₹18,500/mo (+12%)'
  },
  {
    id: 'CAND-04',
    name: 'Mohit S. Rawat',
    role: 'Assembly Line Specialist',
    batch: 'Don Bosco ITI Faridabad',
    joinDate: '01 Oct 2024',
    tenure: '5 Months',
    retention3m: 'verified',
    retention6m: 'pending',
    retention12m: 'pending',
    skillDeficiency: 'Robotic Weld Fixture Safety',
    wageStatus: '₹16,800/mo (Baseline)'
  }
];

export const PROVIDER_BATCHES: ProviderBatch[] = [
  {
    id: 'BATCH-2023-PUN-01',
    name: 'Electrician & Automated Drives (Centurion)',
    sector: 'Capital Goods & Automotive',
    enrolled: 45,
    certified: 43,
    placed: 40,
    retentionRate6m: 92.5,
    retentionRate12m: 87.5,
    incentiveUnlocked: true,
    incentiveAmount: '₹3,40,000',
    status: 'audited'
  },
  {
    id: 'BATCH-2024-DEL-03',
    name: 'Solar PV Installation & Grid Connect',
    sector: 'Green Energy / Renewables',
    enrolled: 50,
    certified: 48,
    placed: 44,
    retentionRate6m: 89.1,
    retentionRate12m: 84.0,
    incentiveUnlocked: true,
    incentiveAmount: '₹4,10,000',
    status: 'active'
  },
  {
    id: 'BATCH-2024-PUN-02',
    name: 'CNC Milling & Diagnostic Telemetry',
    sector: 'Advanced Manufacturing',
    enrolled: 38,
    certified: 36,
    placed: 33,
    retentionRate6m: 85.0,
    retentionRate12m: 78.0,
    incentiveUnlocked: false,
    incentiveAmount: 'Pending Q3 Audit',
    status: 'pending_verification'
  }
];
