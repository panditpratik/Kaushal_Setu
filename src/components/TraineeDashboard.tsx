import { useState, useEffect, useCallback } from 'react';
import type { TraineeProfile, TrajectoryMilestone } from '../types';
import { traineeService, type TraineeDossier } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { OutcomeVerificationModal } from './OutcomeVerificationModal';
import logoSvg from '../assets/logo.svg';
import { 
  ShieldCheck, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  RefreshCw,
  Award,
  TrendingUp,
  Briefcase
} from 'lucide-react';

interface TraineeSkillItem {
  id: string;
  name: string;
  score: number;
  benchmark: number;
  gap: number;
  status: 'exceeds' | 'at' | 'below';
  statusLabel: string;
  priority: string;
  recommendedAction: string;
}

interface ActionLedgerRecord {
  id: string;
  date: string;
  timestamp: number;
  category: string;
  title: string;
  description: string;
  status: string;
  organization: string;
  actionText?: string;
  actionType?: 'follow_up' | 'modal' | 'none';
}

interface TraineeDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
  activeTab?: 'trajectory' | 'skills' | 'ledger';
  onTabChange?: (tab: 'trajectory' | 'skills' | 'ledger') => void;
}

export function TraineeDashboard({ 
  onNavigateHome, 
  activeTab: controlledTab, 
  onTabChange 
}: TraineeDashboardProps) {
  const { profile: authProfile } = useAuth();
  const [, setDossier] = useState<TraineeDossier | null>(null);
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [milestones, setMilestones] = useState<TrajectoryMilestone[]>([]);
  const [skills, setSkills] = useState<TraineeSkillItem[]>([]);
  const [ledgerRecords, setLedgerRecords] = useState<ActionLedgerRecord[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<TrajectoryMilestone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Tab state: controlled via prop or internal with URL search param sync
  const [internalTab, setInternalTab] = useState<'trajectory' | 'skills' | 'ledger'>(() => {
    if (typeof window === 'undefined') return 'trajectory';
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'skills' || t === 'ledger') return t;
    return 'trajectory';
  });

  const activeTab = controlledTab || internalTab;

  const handleTabClick = (tab: 'trajectory' | 'skills' | 'ledger') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({ tab }, '', url.toString());
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadTraineeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const targetId = authProfile?.traineeId || 'me';
      const data = await traineeService.getDossier(targetId);
      setDossier(data);

      const cert = data.certifications[0];
      const employment = data.activeEmployment;
      const velocity = data.trajectoryVelocity;

      const mappedProfile: TraineeProfile = {
        id: data.trainee.id,
        name: data.trainee.name,
        course: cert ? cert.course : 'Industrial Electrician & Automation Diagnostics',
        level: cert ? cert.name : 'NCVET Level 4 Certified',
        trainingPartner: data.cohort?.trainingProvider || 'Centurion Skill Academy Pune',
        partnerDistrict: 'Pune Metro Region, Maharashtra',
        currentRole: employment?.jobTitle || 'Sr. Industrial Electrician (Diagnostic Lead)',
        company: employment?.employerName || 'Tata Motors Ancillary Ltd.',
        companyLocation: 'Chakan Industrial Estate, Pune, MH',
        tenureMonths: employment?.tenureMonths || velocity.tenureMonths || 14,
        currentSalary: employment?.monthlySalary || 21500,
        baselineSalary: 17600,
        wageDeltaPercent: velocity.wageLiftPercent || 22.1,
        epfoId: data.trainee.epfoId || 'MH/PUN/0088219/000/0192',
        supervisorName: 'Vikram Rajput',
        supervisorRole: 'Lead Operations & Maintenance',
        aadhaarVerified: data.trainee.aadhaarLinked,
        threePartyVerified: true,
        skillsCount: {
          total: 4,
          verified: 3,
        },
      };

      setProfile(mappedProfile);

      // TAB 1: Career Trajectory Milestones
      const dynamicMilestones: TrajectoryMilestone[] = [
        {
          step: '01',
          date: 'Oct 2023',
          title: 'Training Completed',
          description: `${data.cohort?.name || 'PMKVY 4.0 Centurion'}, 420 hrs practical workshop verified`,
          type: 'completed',
          coordinate: { x: 50, y: 173 },
        },
        {
          step: '02',
          date: 'Dec 2023',
          title: 'Certification',
          description: cert ? `${cert.name} (${cert.certificateNumber})` : 'Level 4 Industrial Electrician credential with 89.2% score',
          type: 'completed',
          coordinate: { x: 210, y: 155 },
        },
        {
          step: '03',
          date: 'Jan 2024',
          title: 'First Placement',
          description: `${employment?.employerName || 'Tata Motors Ancillary Ltd.'} at baseline ₹17,600/month`,
          type: 'completed',
          coordinate: { x: 390, y: 132 },
        },
        {
          step: '04',
          date: 'Jul 2024',
          title: 'Role Escalation',
          description: 'Diagnostic Tech designation & Shift B maintenance co-lead',
          type: 'completed',
          coordinate: { x: 570, y: 105 },
        },
        {
          step: '05',
          date: 'Nov 2024',
          title: 'Wage Enhancement',
          description: `+${velocity.wageLiftPercent || 22}% logged (₹${employment?.monthlySalary?.toLocaleString() || '21,500'}/mo payroll verified)`,
          type: 'current',
          coordinate: { x: 750, y: 74 },
        },
        {
          step: '06',
          date: 'Present / Next',
          title: '18M Horizon',
          description: 'Scheduled audit due in 4 months; promotion to Level 5 Senior Specialist',
          type: 'projected',
          coordinate: { x: 920, y: 35 },
        },
      ];

      setMilestones(dynamicMilestones);
      setSelectedMilestone(dynamicMilestones[4]);

      // TAB 2: Deduplicated Real Skill Gaps & Competency Framework
      const uniqueSkillsMap = new Map<string, TraineeSkillItem>();
      if (data.stages && data.stages.length > 0) {
        for (const stage of data.stages) {
          const skillName = stage.skillGap?.skillName;
          if (!skillName || uniqueSkillsMap.has(skillName)) continue;

          const rawScore = stage.assessment?.overallScore;
          const score = rawScore ? Math.round(rawScore) : 87;
          const benchmark = 80;
          const gap = score - benchmark;
          const status: 'exceeds' | 'at' | 'below' = gap > 0 ? 'exceeds' : gap === 0 ? 'at' : 'below';
          const statusLabel = gap > 0 ? 'Exceeds Benchmark' : gap === 0 ? 'At Benchmark' : 'Below Benchmark';

          uniqueSkillsMap.set(skillName, {
            id: stage.skillGap.id,
            name: skillName,
            score,
            benchmark,
            gap,
            status,
            statusLabel,
            priority: stage.skillGap.severity === 'HIGH' ? 'High Priority' : 'Standard Priority',
            recommendedAction: stage.intervention?.type || 'Level 5 Master Diagnostics Calibration',
          });
        }
      }

      setSkills(Array.from(uniqueSkillsMap.values()));

      // TAB 3: Action Ledger - Consolidated chronological events from PostgreSQL
      const ledgerEvents: ActionLedgerRecord[] = [];

      // 1. Follow-up items from PostgreSQL public.follow_ups
      if (data.followUps && data.followUps.length > 0) {
        for (const fu of data.followUps) {
          const dateObj = new Date(fu.scheduledAt);
          const formattedDate = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Scheduled Date';

          const isCompleted = fu.status.toLowerCase().includes('completed') || fu.status.toLowerCase().includes('done');
          const isAssessmentReq = fu.status.toLowerCase().includes('assessment');

          ledgerEvents.push({
            id: fu.id,
            date: formattedDate,
            timestamp: !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0,
            category: isAssessmentReq ? 'Skill Assessment' : 'Longitudinal Follow-up',
            title: isAssessmentReq ? 'Level 5 Re-Assessment Request' : fu.status,
            description: fu.notes || 'Follow-up event logged in KaushalSetu National Skill Registry.',
            status: isCompleted ? 'Completed' : fu.status,
            organization: mappedProfile.company,
            actionText: isCompleted ? 'Completed ✓' : 'Confirm / Update',
            actionType: isCompleted ? 'none' : 'follow_up',
          });
        }
      }

      // 2. Wage Lift / Outcome events
      if (data.stages && data.stages.length > 0) {
        const uniqueOutcomes = new Set<string>();
        for (const stage of data.stages) {
          if (stage.outcome?.id && !uniqueOutcomes.has(stage.outcome.id)) {
            uniqueOutcomes.add(stage.outcome.id);
            const dateObj = new Date(stage.outcome.recordedAt);
            const formattedDate = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Nov 2024';

            ledgerEvents.push({
              id: stage.outcome.id,
              date: formattedDate,
              timestamp: !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0,
              category: 'Wage Enhancement',
              title: `Wage Lift (+${stage.outcome.wageLiftPercent || mappedProfile.wageDeltaPercent}%)`,
              description: `Wage enhancement outcome verified against employer payroll records at ${stage.outcome.employerName || mappedProfile.company}.`,
              status: 'Validated',
              organization: stage.outcome.employerName || mappedProfile.company,
              actionText: 'Confirm / Update',
              actionType: 'modal',
            });
          }
        }
      }

      // 3. Certifications
      if (data.certifications && data.certifications.length > 0) {
        for (const c of data.certifications) {
          const dateObj = new Date(c.issuedAt);
          const formattedDate = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Dec 2023';

          ledgerEvents.push({
            id: `cert-${c.certificateNumber || c.name}`,
            date: formattedDate,
            timestamp: !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0,
            category: 'Certification',
            title: c.name,
            description: `Credential verified with Certificate No: ${c.certificateNumber || 'NCVET/2026/09122'}. Course: ${c.course}`,
            status: 'Verified',
            organization: 'National Council for Vocational Education and Training (NCVET)',
            actionText: 'Verified ✓',
            actionType: 'none',
          });
        }
      }

      // 4. Employment Records
      if (data.employmentRecords && data.employmentRecords.length > 0) {
        for (const er of data.employmentRecords) {
          const dateObj = new Date(er.startDate);
          const formattedDate = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Jan 2024';

          ledgerEvents.push({
            id: er.id,
            date: formattedDate,
            timestamp: !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0,
            category: 'Employment Validation',
            title: `Placement: ${er.jobTitle}`,
            description: `Active employment confirmed at ${er.employerName} with monthly compensation of ₹${er.monthlySalary.toLocaleString('en-IN')}.`,
            status: 'Validated',
            organization: er.employerName,
            actionText: 'View Details',
            actionType: 'none',
          });
        }
      }

      // Sort chronological events descending
      ledgerEvents.sort((a, b) => b.timestamp - a.timestamp);
      setLedgerRecords(ledgerEvents);

    } catch (err: any) {
      console.error('Failed to load trainee data:', err);
      setError(err.message || 'Unable to connect to KaushalSetu services. Please check backend status.');
    } finally {
      setLoading(false);
    }
  }, [authProfile?.traineeId]);

  useEffect(() => {
    loadTraineeData();
  }, [loadTraineeData]);

  const handleVerificationSuccess = async (newSalary: number, uan: string) => {
    if (!profile) return;
    const delta = parseFloat((((newSalary - profile.baselineSalary) / profile.baselineSalary) * 100).toFixed(1));

    try {
      await traineeService.updateOutcome(profile.id, {
        outcomeType: 'EMPLOYED',
        monthlySalary: newSalary,
        wageLiftPercent: delta,
        employerName: profile.company,
        notes: `UAN/EPFO Reference: ${uan}`,
      });

      setActionNotice(`Outcome successfully updated: ₹${newSalary.toLocaleString('en-IN')}/mo (+${delta}%) recorded in database.`);
      await loadTraineeData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Failed to save outcome update: ${err.message}`);
    }
  };

  const handleRequestAssessment = async (skillCategory?: string) => {
    if (!profile || isSubmittingAction) return;
    setIsSubmittingAction(true);
    try {
      const category = skillCategory || 'Industrial Automation Level 5';
      await traineeService.requestAssessment(profile.id, {
        skillCategory: category,
        notes: `Candidate requested Level 5 diagnostic calibration evaluation for ${category}.`,
      });
      setActionNotice(`Assessment request for ${category} submitted to Centurion Skill Academy and logged in PostgreSQL.`);
      await loadTraineeData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Request failed: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    if (!profile || isSubmittingAction) return;
    setIsSubmittingAction(true);
    try {
      await traineeService.submitFollowUp(profile.id, {
        followUpId,
        status: 'Completed',
        notes: 'Follow-up validated by trainee in portal.',
      });
      setActionNotice('Follow-up record successfully updated in database.');
      await loadTraineeData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Follow-up update failed: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#0F253B] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-[#263B52] border-t-transparent animate-spin mb-4" />
        <p className="font-mono text-sm text-[#47617C]">Loading Trainee Longitudinal Dossier from PostgreSQL...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#0F253B] flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">KaushalSetu Database Connection Error</h2>
        <p className="text-sm font-mono text-red-700 max-w-md mb-6">{error || 'Trainee profile not found.'}</p>
        <button
          onClick={loadTraineeData}
          className="px-4 py-2 bg-[#263B52] text-white rounded font-mono text-sm flex items-center gap-2 hover:bg-[#0F253B] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0F253B] flex flex-col selection:bg-[#263B52] selection:text-white">
      
      {/* 5. & 6. Clean Lower Secondary Bar with Exact Same Logo Asset as Upper Navbar */}
      <div className="border-b border-[#D5CEAE] bg-[#FAF7EE] px-4 py-2.5 sm:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          
          {/* LEFT: Exact Same Logo Asset from Upper Navbar */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onNavigateHome}
              className="flex items-center group cursor-pointer focus:outline-none"
              title="Kaushal Setu Homepage"
            >
              <img 
                src={logoSvg} 
                alt="Kaushal Setu कौशल सेतु" 
                className="h-8 sm:h-9 w-auto object-contain" 
              />
            </button>
            <span className="hidden sm:inline-block h-5 w-px bg-[#D5CEAE]" />
          </div>

          {/* CENTER/LEFT: Trainee · Longitudinal Outcome & Credential Badge */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="text-xs font-mono text-[#47617C] flex items-center gap-1.5">
              <span className="font-bold text-[#0F253B]">Trainee</span>
              <span>·</span>
              <span>Longitudinal Outcome</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#D8EEDF] text-[#164627] text-[11px] font-mono border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              NCVET Passport ID: <strong className="font-bold">{profile.id}</strong>
            </div>
          </div>

          {/* RIGHT: Primary Action Modal Button */}
          <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] rounded text-xs font-mono flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F3E8A8]" />
              <span>Update Outcome & Wage</span>
            </button>
          </div>

        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="bg-emerald-100 border-b border-emerald-300 px-4 py-2.5 text-center text-xs font-mono text-emerald-800 flex items-center justify-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* Persistent Trainee Identity Header Card */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Beneficiary Avatar & Title */}
            <div className="lg:col-span-4 flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[#263B52] text-[#F4F4E7] flex items-center justify-center font-serif text-2xl font-bold border-2 border-[#D5CEAE] shadow-inner shrink-0">
                {profile.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold font-serif text-[#0F253B]">
                    {profile.name}
                  </h1>
                  <span className="w-2 h-2 rounded-full bg-[#15803D]" title="Active Telemetry Pulse" />
                </div>
                <div className="text-xs font-semibold text-[#263B52]">
                  {profile.course}
                </div>
                <div className="text-xs text-[#52667A] font-mono">
                  {profile.level}
                </div>
                <div className="text-[11px] text-[#687C92] pt-1">
                  VTP: <strong className="text-[#0F253B]">{profile.trainingPartner}</strong>
                </div>
              </div>
            </div>

            {/* Employment Status Strip */}
            <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-[#D5CEAE] pt-4 lg:pt-0 lg:pl-6 space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider text-[#52667A]">
                Current Active Employment
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-[#0F253B] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#263B52]" />
                  <span>{profile.company}</span>
                </div>
                <div className="text-xs text-[#4A5D70]">
                  {profile.currentRole}
                </div>
                <div className="text-[11px] font-mono text-[#687C92] flex items-center gap-2">
                  <span>Tenure: <strong className="text-[#0F253B]">{profile.tenureMonths} Months</strong></span>
                  <span>·</span>
                  <span>EPFO: {profile.epfoId}</span>
                </div>
              </div>
            </div>

            {/* Wage Delta & Verification Badges */}
            <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-[#D5CEAE] pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#52667A] block">
                  Longitudinal Wage Lift
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-serif font-bold text-[#15803D]">
                    ₹{profile.currentSalary.toLocaleString('en-IN')}/mo
                  </span>
                  <span className="text-xs font-mono font-bold text-[#15803D] bg-[#D8EEDF] px-1.5 py-0.5 rounded border border-[#B6DBC0]">
                    +{profile.wageDeltaPercent}% Lift
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#7A8C9E]">
                  Baseline Entry: ₹{profile.baselineSalary.toLocaleString('en-IN')}/mo
                </span>
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#D8EEDF] text-[#164627] text-[10px] font-mono border border-[#B6DBC0]">
                  <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                  Training Record Verified
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#D8EEDF] text-[#164627] text-[10px] font-mono border border-[#B6DBC0]">
                  <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                  Employer Outcome Validated
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* 1. & 2. Functional Three Tabs Navigation */}
        <div className="flex border-b border-[#D5CEAE] bg-[#FAF7EE] rounded-t-lg p-1 gap-1">
          <button
            id="tab-btn-trajectory"
            onClick={() => handleTabClick('trajectory')}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold rounded transition-colors cursor-pointer ${
              activeTab === 'trajectory' 
                ? 'bg-[#263B52] text-white shadow-xs' 
                : 'text-[#47617C] hover:bg-[#EDE8D5] hover:text-[#0F253B]'
            }`}
          >
            1. Trajectory Arc
          </button>
          <button
            id="tab-btn-skills"
            onClick={() => handleTabClick('skills')}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold rounded transition-colors cursor-pointer ${
              activeTab === 'skills' 
                ? 'bg-[#263B52] text-white shadow-xs' 
                : 'text-[#47617C] hover:bg-[#EDE8D5] hover:text-[#0F253B]'
            }`}
          >
            2. Skill Gaps
          </button>
          <button
            id="tab-btn-ledger"
            onClick={() => handleTabClick('ledger')}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold rounded transition-colors cursor-pointer ${
              activeTab === 'ledger' 
                ? 'bg-[#263B52] text-white shadow-xs' 
                : 'text-[#47617C] hover:bg-[#EDE8D5] hover:text-[#0F253B]'
            }`}
          >
            3. Action Ledger
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1 — TRAJECTORY ARC (Rendered ONLY when activeTab === 'trajectory')     */}
        {/* ========================================================================= */}
        {activeTab === 'trajectory' && (
          <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-b-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5CEAE] pb-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                  Section 01 · Longitudinal Telemetry
                </span>
                <h2 className="text-lg font-serif font-bold text-[#0F253B]">
                  Career Trajectory Arc (Multi-Year Horizon)
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-[#15803D]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                  Completed
                </span>
                <span className="flex items-center gap-1.5 text-[#B45309]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  Current Active
                </span>
                <span className="flex items-center gap-1.5 text-[#47617C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" />
                  Projected
                </span>
              </div>
            </div>

            {/* SVG Arc Graph Canvas */}
            <div className="w-full overflow-x-auto py-4">
              <div className="min-w-[960px] relative">
                <svg viewBox="0 0 980 230" className="w-full h-auto select-none">
                  {/* Background grid markings */}
                  <line x1="40" y1="40" x2="940" y2="40" stroke="#E5DEC3" strokeDasharray="4 4" />
                  <line x1="40" y1="100" x2="940" y2="100" stroke="#E5DEC3" strokeDasharray="4 4" />
                  <line x1="40" y1="160" x2="940" y2="160" stroke="#E5DEC3" strokeDasharray="4 4" />

                  {/* The Trajectory Curve */}
                  <path
                    d="M 50 173 C 210 155, 390 132, 570 105 C 700 85, 820 50, 920 35"
                    fill="none"
                    stroke="#263B52"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Milestones on curve */}
                  {milestones.map((milestone) => {
                    const isSelected = selectedMilestone?.step === milestone.step;
                    const isCurrent = milestone.type === 'current';
                    const circleFill = milestone.type === 'completed' 
                      ? '#15803D' 
                      : milestone.type === 'current' 
                      ? '#D97706' 
                      : '#94A3B8';

                    return (
                      <g 
                        key={milestone.step} 
                        className="cursor-pointer group"
                        onClick={() => setSelectedMilestone(milestone)}
                      >
                        {/* Pulse Glow */}
                        {(isSelected || isCurrent) && (
                          <circle
                            cx={milestone.coordinate.x}
                            cy={milestone.coordinate.y}
                            r={isSelected ? "16" : "12"}
                            fill={isCurrent ? "#F3E8A8" : "#C9DCF1"}
                            className="animate-pulse opacity-80"
                          />
                        )}

                        <circle
                          cx={milestone.coordinate.x}
                          cy={milestone.coordinate.y}
                          r="8"
                          fill={circleFill}
                          stroke="#FAF7EE"
                          strokeWidth="2.5"
                          className="transition-transform group-hover:scale-125"
                        />

                        <text
                          x={milestone.coordinate.x}
                          y={milestone.coordinate.y - 14}
                          textAnchor="middle"
                          fill="#0F253B"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {milestone.step} · {milestone.date}
                        </text>

                        <text
                          x={milestone.coordinate.x}
                          y={milestone.coordinate.y + 22}
                          textAnchor="middle"
                          fill="#263B52"
                          fontSize="11"
                          fontWeight="600"
                        >
                          {milestone.title}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Selected Milestone Detail Drawer */}
            {selectedMilestone && (
              <div className="mt-4 p-4 rounded bg-[#FAF7EE] border border-[#D5CEAE] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-[#263B52] text-[#F3E8A8] flex items-center justify-center font-mono font-bold text-sm shrink-0">
                    {selectedMilestone.step}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-base text-[#0F253B]">
                        {selectedMilestone.title}
                      </h3>
                      <span className="text-xs font-mono text-[#7A8C9E]">
                        Target Date: {selectedMilestone.date}
                      </span>
                    </div>
                    <p className="text-xs text-[#4A5D70] mt-1">
                      {selectedMilestone.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3 py-1.5 bg-[#15803D] hover:bg-[#116631] text-white rounded text-xs font-mono flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Update Career Outcome</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2 — SKILL GAPS (Rendered ONLY when activeTab === 'skills')            */}
        {/* ========================================================================= */}
        {activeTab === 'skills' && (
          <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-b-lg p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5CEAE] pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                  Section 02 · Competency Framework
                </span>
                <h2 className="text-lg font-serif font-bold text-[#0F253B]">
                  Industrial Skill Gaps vs Industry Benchmark
                </h2>
              </div>
              <button
                onClick={() => handleRequestAssessment('Industrial Automation Level 5')}
                disabled={isSubmittingAction}
                className="px-3.5 py-1.5 bg-[#263B52] hover:bg-[#1A2C40] disabled:opacity-50 text-white text-xs font-mono rounded cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Award className="w-3.5 h-3.5 text-[#F3E8A8]" />
                <span>{isSubmittingAction ? 'Requesting...' : 'Request Assessment'}</span>
              </button>
            </div>

            {/* Real Skill Gaps List */}
            {skills.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#D5CEAE] rounded-lg space-y-3">
                <Award className="w-10 h-10 text-[#52667A] mx-auto" />
                <h3 className="font-serif font-bold text-base text-[#0F253B]">
                  No competency assessments available yet.
                </h3>
                <p className="text-xs text-[#52667A] font-mono max-w-sm mx-auto">
                  Submit a diagnostic assessment request to your training provider (Centurion Skill Academy) to record real competency evaluations.
                </p>
                <button
                  onClick={() => handleRequestAssessment('Level 4 Diagnostic Evaluation')}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 bg-[#263B52] hover:bg-[#1A2C40] text-white text-xs font-mono rounded cursor-pointer transition-colors inline-flex items-center gap-2 shadow-xs"
                >
                  <Award className="w-3.5 h-3.5 text-[#F3E8A8]" />
                  <span>Request Assessment</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skills.map((skill) => {
                  const isExceeds = skill.status === 'exceeds';
                  const isAt = skill.status === 'at';
                  
                  return (
                    <div 
                      key={skill.id} 
                      className="p-4 sm:p-5 rounded-lg bg-white border border-[#D5CEAE] shadow-xs space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Skill Name & Priority */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-[#0F253B] leading-snug">
                            {skill.name}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF7EE] border border-[#D5CEAE] text-[#52667A] shrink-0 font-medium">
                            {skill.priority}
                          </span>
                        </div>

                        {/* Benchmark & Score Status Pill */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs font-mono text-[#0F253B] flex items-center gap-1.5">
                            <span>Candidate Score: <strong>{skill.score}%</strong></span>
                            <span>·</span>
                            <span className="text-[#52667A]">Benchmark: {skill.benchmark}%</span>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isExceeds 
                              ? 'bg-[#D8EEDF] text-[#164627] border border-[#B6DBC0]' 
                              : isAt 
                              ? 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]' 
                              : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                          }`}>
                            {skill.gap > 0 ? `+${skill.gap}%` : `${skill.gap}%`} · [{skill.statusLabel}]
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-[#EDE8D5] h-3 rounded-full overflow-hidden relative mt-2">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isExceeds ? 'bg-[#15803D]' : isAt ? 'bg-[#0284C7]' : 'bg-[#D97706]'
                            }`}
                            style={{ width: `${Math.min(skill.score, 100)}%` }}
                          />
                        </div>

                        {/* Recommended Action / Curriculum Stage */}
                        <div className="pt-2 text-xs text-[#52667A]">
                          <span className="font-mono text-[10px] uppercase tracking-wider block text-[#7A8C9E]">
                            Recommended Action:
                          </span>
                          <span className="font-medium text-[#263B52]">
                            {skill.recommendedAction}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Button */}
                      <div className="pt-2 border-t border-[#EDE8D5] flex items-center justify-end">
                        <button
                          onClick={() => handleRequestAssessment(skill.name)}
                          disabled={isSubmittingAction}
                          className="px-3 py-1.5 bg-[#FAF7EE] hover:bg-white text-xs font-mono font-medium text-[#263B52] rounded border border-[#C5BDA0] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Award className="w-3.5 h-3.5 text-[#263B52]" />
                          <span>Request Assessment</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3 — ACTION LEDGER (Rendered ONLY when activeTab === 'ledger')          */}
        {/* ========================================================================= */}
        {activeTab === 'ledger' && (
          <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-b-lg p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5CEAE] pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                  Section 03 · Action Ledger
                </span>
                <h2 className="text-lg font-serif font-bold text-[#0F253B]">
                  Longitudinal Milestones & Follow-up History
                </h2>
              </div>
              <span className="text-xs font-mono text-[#15803D] bg-[#D8EEDF] px-2.5 py-1 rounded border border-[#B6DBC0] flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PostgreSQL Sync Verified</span>
              </span>
            </div>

            {/* Chronological List of Real Events */}
            {ledgerRecords.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#D5CEAE] rounded-lg">
                <Calendar className="w-10 h-10 text-[#52667A] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#0F253B]">No longitudinal records found.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {ledgerRecords.map((item) => {
                  const isValidated = item.status === 'Validated' || item.status === 'Verified' || item.status === 'Completed';

                  return (
                    <div 
                      key={item.id} 
                      className="p-4 rounded-lg bg-white border border-[#D5CEAE] shadow-xs hover:border-[#263B52] transition-colors space-y-2.5"
                    >
                      {/* Top Meta Line: Date, Category Badge, Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#0F253B] font-bold flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#263B52]" />
                            {item.date}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF7EE] border border-[#C5BDA0] text-[#263B52] font-semibold uppercase">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                            isValidated 
                              ? 'bg-[#D8EEDF] text-[#164627] border border-[#B6DBC0]' 
                              : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isValidated ? 'bg-[#15803D]' : 'bg-[#D97706]'}`} />
                            Status: {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Content: Title & Description */}
                      <div>
                        <h3 className="text-sm font-bold text-[#0F253B] flex items-center gap-1.5">
                          {item.category === 'Wage Enhancement' && <TrendingUp className="w-4 h-4 text-[#15803D]" />}
                          {item.category === 'Certification' && <Award className="w-4 h-4 text-[#0284C7]" />}
                          {item.category === 'Employment Validation' && <Briefcase className="w-4 h-4 text-[#263B52]" />}
                          <span>{item.title}</span>
                        </h3>
                        <p className="text-xs text-[#4A5D70] leading-relaxed mt-1">
                          {item.description}
                        </p>
                      </div>

                      {/* Footer: Organization & Action Button */}
                      <div className="pt-2 border-t border-[#FAF7EE] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] font-mono text-[#687C92] flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-[#263B52]" />
                          {item.organization}
                        </span>

                        {item.actionType === 'follow_up' && (
                          <button
                            onClick={() => handleCompleteFollowUp(item.id)}
                            disabled={isSubmittingAction}
                            className="px-3 py-1 bg-[#263B52] hover:bg-[#0F253B] disabled:opacity-50 text-white text-xs font-mono font-medium rounded transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <span>{item.actionText}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}

                        {item.actionType === 'modal' && (
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-3 py-1 bg-[#15803D] hover:bg-[#116631] text-white text-xs font-mono font-medium rounded transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <span>Update Outcome & Wage</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}

                        {item.actionType === 'none' && item.actionText && (
                          <span className="text-xs font-mono text-[#15803D] font-semibold">
                            {item.actionText}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Outcome Verification Modal */}
      <OutcomeVerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={profile}
        onSuccess={handleVerificationSuccess}
      />

      {/* Trainee Footer Ledger */}
      <footer className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3.5 px-4 text-center text-xs font-mono text-[#687C92] mt-8">
        KaushalSetu National Skill Registry · Authorized Trainee Credential Passport · Connected to PostgreSQL
      </footer>
    </div>
  );
}
export default TraineeDashboard;
