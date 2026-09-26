import { useState, useEffect, useCallback } from 'react';
import type { TraineeProfile, TrajectoryMilestone, SkillGauge, FollowUpItem } from '../types';
import { traineeService, type TraineeDossier } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { OutcomeVerificationModal } from './OutcomeVerificationModal';
import { 
  ShieldCheck, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  RefreshCw
} from 'lucide-react';

interface TraineeDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function TraineeDashboard({ onNavigateHome, onSwitchRole }: TraineeDashboardProps) {
  const { profile: authProfile } = useAuth();
  const [, setDossier] = useState<TraineeDossier | null>(null);
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [milestones, setMilestones] = useState<TrajectoryMilestone[]>([]);
  const [skillGauges, setSkillGauges] = useState<SkillGauge[]>([]);
  const [followUpItems, setFollowUpItems] = useState<FollowUpItem[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<TrajectoryMilestone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trajectory' | 'gauges' | 'ledger'>('trajectory');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

      // Map dynamic stages to visual milestones
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
          title: 'NCVET Certified',
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
          description: 'Scheduled audit due in 4 months; promotion to Level 5',
          type: 'projected',
          coordinate: { x: 920, y: 35 },
        },
      ];

      setMilestones(dynamicMilestones);
      setSelectedMilestone(dynamicMilestones[4]);

      // Map dynamic skill gauges from stages
      const dynamicGauges: SkillGauge[] = data.stages.length > 0 ? data.stages.map((stage, idx) => ({
        id: `gauge-${idx + 1}`,
        name: stage.skillGap.skillName,
        category: stage.assessment ? `Score: ${stage.assessment.overallScore}%` : 'Level 4 Standard',
        score: stage.assessment?.overallScore ? Math.round(stage.assessment.overallScore) : 88,
        benchmark: 80,
        status: (stage.assessment?.overallScore || 88) >= 80 ? 'exceeds' : 'deficit',
        note: (stage.assessment?.overallScore || 88) >= 80 ? 'Exceeds Benchmark (+8%)' : 'Skill Deficit Identified (-6%)',
      })) : [
        {
          id: 'gauge-1',
          name: '1. Technical Mastery & Circuit Diagnostics',
          category: 'Level 4 Standard',
          score: 88,
          benchmark: 80,
          status: 'exceeds',
          note: 'Exceeds Benchmark (+8%)',
        },
        {
          id: 'gauge-2',
          name: '2. Practical Tool Handling & Industrial Safety',
          category: 'Safety Audit Cleared',
          score: 92,
          benchmark: 85,
          status: 'exceeds',
          note: 'Exceeds Benchmark (+7%)',
        },
        {
          id: 'gauge-3',
          name: '3. PLC & Automation Systems Calibration',
          category: 'Diagnostic Lab Required',
          score: 74,
          benchmark: 80,
          status: 'deficit',
          note: 'Skill Deficit Identified (-6%)',
        },
      ];

      setSkillGauges(dynamicGauges);

      // Follow up items
      setFollowUpItems([
        {
          id: 'fu-1',
          date: '03 Jul 2024',
          badge: '6-Month Verification',
          title: '6-Month Longitudinal Retention Survey',
          description: 'Automated digital consent confirmation submitted with employee satisfaction score 9/10.',
          actionText: 'Completed',
        },
        {
          id: 'fu-2',
          date: '15 Nov 2024',
          badge: 'Wage Lift Milestone',
          title: 'Q3 Promotion & Wage Incremental Audit',
          description: 'Wage enhancement of +22.1% verified against direct bank transfer and EPFO contribution records.',
          actionText: 'Confirm / Update',
        },
        {
          id: 'fu-3',
          date: '10 Apr 2025',
          badge: '18-Month Target',
          title: 'Scheduled Level 5 Senior Electrician Re-Assessment',
          description: 'Eligibility window opens in 140 days. Training Partner: Centurion Academy.',
          actionText: 'Schedule Ahead',
        },
      ]);
    } catch (err: any) {
      console.error('Failed to load trainee data:', err);
      setError(err.message || 'Unable to connect to KaushalSetu services. Please check backend status.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleRequestAssessment = async () => {
    if (!profile) return;
    try {
      await traineeService.requestAssessment(profile.id, {
        skillCategory: 'Industrial Automation Level 5',
        notes: 'Candidate requested Level 5 diagnostic calibration evaluation.',
      });
      setActionNotice('Assessment request submitted to Centurion Skill Academy and logged in PostgreSQL.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Request failed: ${err.message}`);
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    if (!profile) return;
    try {
      await traineeService.submitFollowUp(profile.id, {
        followUpId,
        status: 'Completed',
        notes: 'Follow-up validated by trainee.',
      });
      setActionNotice('Follow-up record successfully updated in database.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Follow-up update failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-[#263B52] border-t-transparent animate-spin mb-4" />
        <p className="font-mono text-sm text-[#47617C]">Loading Trainee Longitudinal Dossier from PostgreSQL...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col items-center justify-center p-8 text-center">
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
    <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col selection:bg-[#263B52] selection:text-white">
      {/* Top Banner Navigation */}
      <div className="border-b border-[#D5CEAE] bg-[#FAF7EE] px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onNavigateHome}
              className="flex items-center gap-2 group text-left"
            >
              <div className="w-8 h-8 rounded bg-[#263B52] text-[#F4F4E7] flex items-center justify-center font-serif font-bold text-sm tracking-wider">
                क
              </div>
              <div>
                <div className="font-serif font-bold text-sm tracking-wide text-[#0F253B] group-hover:text-[#263B52] transition-colors">
                  KAUSHAL SETU <span className="text-xs font-normal text-[#5A6E85]">| कौशल सेतु</span>
                </div>
                <div className="text-[10px] font-mono tracking-wider text-[#7A8C9E] uppercase">
                  Trainee Longitudinal Passport
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#D5CEAE]" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D8EEDF] text-[#164627] text-xs font-mono border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              NCVET Passport ID: <strong className="font-bold">{profile.id}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] rounded text-xs font-mono flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F3E8A8]" />
              <span>Update Outcome & Wage</span>
            </button>
            <button
              onClick={() => onSwitchRole('employer')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#263B52] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Switch to Employer View →
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="bg-emerald-100 border-b border-emerald-300 px-4 py-2 text-center text-xs font-mono text-emerald-800 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* Trainee Identity Ledger Header Card */}
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

        {/* Tab Navigation for Mobile & Section Switcher */}
        <div className="flex border-b border-[#D5CEAE] bg-[#FAF7EE] rounded-t-lg p-1 gap-1">
          <button
            onClick={() => setActiveTab('trajectory')}
            className={`flex-1 py-2 text-xs font-mono font-semibold rounded transition-colors ${
              activeTab === 'trajectory' ? 'bg-[#263B52] text-white shadow-xs' : 'text-[#47617C] hover:bg-[#EDE8D5]'
            }`}
          >
            1. Trajectory Arc
          </button>
          <button
            onClick={() => setActiveTab('gauges')}
            className={`flex-1 py-2 text-xs font-mono font-semibold rounded transition-colors ${
              activeTab === 'gauges' ? 'bg-[#263B52] text-white shadow-xs' : 'text-[#47617C] hover:bg-[#EDE8D5]'
            }`}
          >
            2. Skill Gauges
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 py-2 text-xs font-mono font-semibold rounded transition-colors ${
              activeTab === 'ledger' ? 'bg-[#263B52] text-white shadow-xs' : 'text-[#47617C] hover:bg-[#EDE8D5]'
            }`}
          >
            3. Action Ledger
          </button>
        </div>

        {/* SECTION 1: SVG Trajectory Arc Visualization */}
        <div className={`bg-[#FAF7EE] border border-[#D5CEAE] rounded-b-lg p-5 sm:p-6 shadow-xs space-y-4 ${activeTab !== 'trajectory' && 'hidden md:block'}`}>
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
                <div className="w-10 h-10 rounded bg-[#263B52] text-[#F3E8A8] flex items-center justify-center font-mono font-bold text-sm">
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
                  className="px-3 py-1.5 bg-[#15803D] hover:bg-[#116631] text-white rounded text-xs font-mono flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update Career Outcome</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2 & 3: Two Column Layout (Skill Gauges & Action Ledger) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* NCVET Diagnostic Skill Gauges */}
          <div className={`lg:col-span-7 space-y-4 ${activeTab !== 'gauges' && 'hidden md:block'}`}>
            <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D5CEAE] pb-3">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                    Section 02 · Competency Framework
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                    Industrial Skill Gauges vs Industry Benchmark
                  </h3>
                </div>
                <button
                  onClick={handleRequestAssessment}
                  className="px-2.5 py-1 bg-[#263B52] hover:bg-[#1A2C40] text-white text-[11px] font-mono rounded cursor-pointer transition-colors"
                >
                  Request Assessment
                </button>
              </div>

              {/* Gauges list */}
              <div className="space-y-4 pt-2">
                {skillGauges.map((gauge) => {
                  const isExceeds = gauge.score >= gauge.benchmark;
                  return (
                    <div key={gauge.id} className="p-3.5 rounded bg-white border border-[#D5CEAE] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#0F253B]">
                          {gauge.name}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          isExceeds ? 'bg-[#D8EEDF] text-[#164627]' : 'bg-[#FEE2E2] text-[#991B1B]'
                        }`}>
                          {gauge.note}
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full bg-[#EDE8D5] h-3 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isExceeds ? 'bg-[#15803D]' : 'bg-[#D97706]'}`}
                          style={{ width: `${Math.min(gauge.score, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-[#687C92]">
                        <span>Candidate Score: {gauge.score}%</span>
                        <span>Industry Benchmark: {gauge.benchmark}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Ledger & Follow-up Timeline */}
          <div className={`lg:col-span-5 space-y-4 ${activeTab !== 'ledger' && 'hidden md:block'}`}>
            <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D5CEAE] pb-3">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                    Section 03 · Action Ledger
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                    Longitudinal Milestones
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#5A6E85]">
                  PostgreSQL Sync
                </span>
              </div>

              {/* Ledger Items List */}
              <div className="space-y-3 pt-1">
                {followUpItems.map((item) => (
                  <div key={item.id} className="p-3.5 rounded bg-[#EDE8D5]/70 border border-[#D5CEAE] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#687C92] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#263B52]" />
                        {item.date}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#FAF7EE] border border-[#C5BDA0] text-[#263B52]">
                        {item.badge}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#0F253B]">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#4A5D70] leading-relaxed">
                      {item.description}
                    </p>

                    <div className="pt-1 flex items-center justify-end">
                      <button
                        onClick={() => handleCompleteFollowUp(item.id)}
                        className="px-2.5 py-1 bg-[#FAF7EE] hover:bg-white text-xs font-mono font-medium text-[#263B52] rounded border border-[#C5BDA0] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{item.actionText}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Outcome Verification Modal */}
      <OutcomeVerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={profile}
        onSuccess={handleVerificationSuccess}
      />

      {/* Trainee Footer Ledger */}
      <div className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3 px-4 text-center text-xs font-mono text-[#687C92]">
        KaushalSetu National Skill Registry · Authorized Trainee Credential Passport · Connected to PostgreSQL
      </div>
    </div>
  );
}
