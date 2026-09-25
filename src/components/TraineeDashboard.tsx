import { useState, useEffect } from 'react';
import type { TraineeProfile, TrajectoryMilestone, SkillGauge, FollowUpItem } from '../types';
import { 
  PRIYA_PROFILE, 
  TRAJECTORY_MILESTONES, 
  SKILL_GAUGES, 
  FOLLOW_UP_ITEMS 
} from '../data/mockData';
import { fetchTraineeDossier } from '../lib/api';
import { OutcomeVerificationModal } from './OutcomeVerificationModal';
import { 
  ShieldCheck, 
  TrendingUp, 
  Building2, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  Compass, 
  Layers, 
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

interface TraineeDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function TraineeDashboard({ onNavigateHome, onSwitchRole }: TraineeDashboardProps) {
  const [profile, setProfile] = useState<TraineeProfile>(PRIYA_PROFILE);
  const [milestones, setMilestones] = useState<TrajectoryMilestone[]>(TRAJECTORY_MILESTONES);
  const [skillGauges, setSkillGauges] = useState<SkillGauge[]>(SKILL_GAUGES);
  const [followUpItems, setFollowUpItems] = useState<FollowUpItem[]>(FOLLOW_UP_ITEMS);
  const [selectedMilestone, setSelectedMilestone] = useState<TrajectoryMilestone>(TRAJECTORY_MILESTONES[4]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trajectory' | 'gauges' | 'ledger'>('trajectory');

  useEffect(() => {
    fetchTraineeDossier('priya').then(res => {
      if (res && res.profile) {
        setProfile(res.profile);
        if (res.milestones) setMilestones(res.milestones);
        if (res.skillGaps) setSkillGauges(res.skillGaps);
        if (res.followUps) setFollowUpItems(res.followUps);
        if (res.milestones && res.milestones.length >= 5) {
          setSelectedMilestone(res.milestones[4]);
        }
      }
    });
  }, []);

  const handleVerificationSuccess = (newSalary: number, uan: string) => {
    const delta = ((newSalary - profile.baselineSalary) / profile.baselineSalary) * 100;
    setProfile(prev => ({
      ...prev,
      currentSalary: newSalary,
      wageDeltaPercent: parseFloat(delta.toFixed(1)),
      epfoId: uan
    }));
  };

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
              <span>Verify Wage / EPFO</span>
            </button>
            <button
              onClick={() => onSwitchRole('employer')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#263B52] rounded text-xs font-mono transition-colors"
            >
              Switch to Employer View →
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* Trainee Identity Ledger Header Card */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Beneficiary Avatar & Title */}
            <div className="lg:col-span-4 flex items-start gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-[#263B52] text-[#F4F4E7] flex items-center justify-center font-serif text-2xl font-bold shadow border-2 border-[#D5CEAE]">
                  PS
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#15803D] text-white flex items-center justify-center border-2 border-white" title="Aadhaar Authenticated">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0F253B]">
                    {profile.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#C8C4F2] text-[#23215C] font-semibold">
                    {profile.level}
                  </span>
                </div>
                <p className="text-xs text-[#5A6E85] mt-0.5">
                  {profile.course} · Registered under PMKVY 4.0
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs font-mono text-[#7A8C9E]">
                  <GraduationCap className="w-3.5 h-3.5 text-[#263B52]" />
                  <span>{profile.trainingPartner}</span>
                </div>
              </div>
            </div>

            {/* Placement Metric Badges */}
            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Current Wage</span>
                <span className="text-base sm:text-lg font-bold font-mono text-[#0F253B]">
                  ₹{profile.currentSalary.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-[#15803D] flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-3 h-3" />
                  +{profile.wageDeltaPercent}% vs Base
                </span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Retention Tenure</span>
                <span className="text-base sm:text-lg font-bold font-mono text-[#0F253B]">
                  {profile.tenureMonths} Months
                </span>
                <span className="text-[10px] font-mono text-[#263B52] block mt-0.5">
                  18M Milestone: 4m left
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Consensus Status</span>
                <span className="text-xs font-bold font-mono text-[#15803D] flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-4 h-4" /> 3-Way Verified
                </span>
                <span className="text-[10px] font-mono text-[#7A8C9E] block truncate mt-0.5">
                  EPFO: {profile.epfoId.slice(0, 10)}...
                </span>
              </div>
            </div>

            {/* Current Employer Snippet */}
            <div className="lg:col-span-3 bg-white p-3.5 rounded border border-[#D5CEAE] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#7A8C9E] uppercase">Live Placement Entity</span>
                <Building2 className="w-3.5 h-3.5 text-[#263B52]" />
              </div>
              <div className="font-bold text-[#0F253B] truncate">
                {profile.company}
              </div>
              <div className="text-[11px] text-[#5A6E85] truncate">
                {profile.companyLocation}
              </div>
              <div className="text-[10px] font-mono text-[#263B52] pt-1 border-t border-[#EDE8D5]">
                Supervisor: {profile.supervisorName} ({profile.supervisorRole})
              </div>
            </div>

          </div>
        </div>

        {/* Tab Switcher for Mobile & Quick Inspection */}
        <div className="flex items-center gap-2 border-b border-[#D5CEAE] pb-2">
          <button
            onClick={() => setActiveTab('trajectory')}
            className={`px-3 py-1.5 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'trajectory'
                ? 'bg-[#263B52] text-[#F4F4E7] font-bold'
                : 'bg-[#FAF7EE] text-[#4A5D70] hover:bg-[#EDE8D5]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>18-Month Flight Path</span>
          </button>
          <button
            onClick={() => setActiveTab('gauges')}
            className={`px-3 py-1.5 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'gauges'
                ? 'bg-[#263B52] text-[#F4F4E7] font-bold'
                : 'bg-[#FAF7EE] text-[#4A5D70] hover:bg-[#EDE8D5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>NCVET Benchmark Gauges</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-[#263B52] text-[#F4F4E7] font-bold'
                : 'bg-[#FAF7EE] text-[#4A5D70] hover:bg-[#EDE8D5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Action Ledger ({followUpItems.length})</span>
          </button>
        </div>

        {/* SECTION 1: 18-Month Curvilinear Flight Path */}
        <div className={`space-y-6 ${activeTab !== 'trajectory' && 'hidden md:block'}`}>
          <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#263B52]">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                  Section 01 · Curvilinear Trajectory Flight Path
                </div>
                <h2 className="text-lg sm:text-xl font-serif font-bold text-[#0F253B]">
                  Longitudinal Wage & Retention Progression (18-Month Horizon)
                </h2>
              </div>
              <div className="text-xs font-mono text-[#5A6E85] flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" /> Completed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Current Active (14M)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#263B52] bg-white" /> Projected (18M)
                </span>
              </div>
            </div>

            {/* Curvilinear SVG Graph Container */}
            <div className="relative w-full bg-[#EDE8D5]/60 rounded-lg border border-[#D5CEAE] p-4 sm:p-6 overflow-x-auto">
              <div className="min-w-[800px]">
                <svg viewBox="0 0 1000 240" className="w-full h-56 select-none overflow-visible">
                  {/* Grid Lines */}
                  <line x1="40" y1="200" x2="960" y2="200" stroke="#D5CEAE" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="140" x2="960" y2="140" stroke="#D5CEAE" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="80" x2="960" y2="80" stroke="#D5CEAE" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="20" x2="960" y2="20" stroke="#D5CEAE" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Y Axis Labels */}
                  <text x="35" y="204" textAnchor="end" fill="#7A8C9E" fontSize="10" fontFamily="monospace">₹15k</text>
                  <text x="35" y="144" textAnchor="end" fill="#7A8C9E" fontSize="10" fontFamily="monospace">₹18k</text>
                  <text x="35" y="84" textAnchor="end" fill="#7A8C9E" fontSize="10" fontFamily="monospace">₹22k</text>
                  <text x="35" y="24" textAnchor="end" fill="#7A8C9E" fontSize="10" fontFamily="monospace">₹26k</text>

                  {/* Projected Path (Dashed) */}
                  <path
                    d="M 50 173 C 210 155, 390 132, 570 105 S 750 74, 920 35"
                    fill="none"
                    stroke="#263B52"
                    strokeWidth="3"
                    strokeDasharray="6 6"
                    className="opacity-40"
                  />

                  {/* Completed / Active Path (Solid Highlight) */}
                  <path
                    d="M 50 173 C 210 155, 390 132, 570 105 S 700 85, 750 74"
                    fill="none"
                    stroke="#15803D"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  {/* Shaded Area Under Curve */}
                  <path
                    d="M 50 173 C 210 155, 390 132, 570 105 S 700 85, 750 74 L 750 200 L 50 200 Z"
                    fill="#D8EEDF"
                    className="opacity-30"
                  />

                  {/* Milestone Interactive Nodes */}
                  {milestones.map((milestone) => {
                    const isSelected = selectedMilestone.step === milestone.step;
                    const isCompleted = milestone.type === 'completed';
                    const isCurrent = milestone.type === 'current';

                    let circleFill = '#FFFFFF';
                    let circleStroke = '#263B52';
                    if (isCompleted) {
                      circleFill = '#15803D';
                      circleStroke = '#164627';
                    } else if (isCurrent) {
                      circleFill = '#D97706';
                      circleStroke = '#B45309';
                    }

                    return (
                      <g 
                        key={milestone.step} 
                        className="cursor-pointer group"
                        onClick={() => setSelectedMilestone(milestone)}
                      >
                        {/* Outer Glow on Selected or Current */}
                        {(isSelected || isCurrent) && (
                          <circle
                            cx={milestone.coordinate.x}
                            cy={milestone.coordinate.y}
                            r={isSelected ? "16" : "12"}
                            fill={isCurrent ? "#F3E8A8" : "#C9DCF1"}
                            className="animate-pulse opacity-80"
                          />
                        )}

                        {/* Milestone Circle */}
                        <circle
                          cx={milestone.coordinate.x}
                          cy={milestone.coordinate.y}
                          r="8"
                          fill={circleFill}
                          stroke={circleStroke}
                          strokeWidth="2.5"
                          className="transition-transform group-hover:scale-125"
                        />

                        {/* Milestone Step Tag */}
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

                        {/* Milestone Title */}
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
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                      selectedMilestone.type === 'completed'
                        ? 'bg-[#D8EEDF] text-[#164627]'
                        : selectedMilestone.type === 'current'
                        ? 'bg-[#F3E8A8] text-[#54480A]'
                        : 'bg-[#C9DCF1] text-[#163558]'
                    }`}>
                      {selectedMilestone.type}
                    </span>
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
                {selectedMilestone.type === 'current' && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3 py-1.5 bg-[#15803D] hover:bg-[#116631] text-white rounded text-xs font-mono flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Q3 Wage Increment</span>
                  </button>
                )}
                <span className="text-[11px] font-mono text-[#687C92] bg-[#EDE8D5] px-2.5 py-1 rounded border border-[#D5CEAE]">
                  Cryptographic Ledger Entry #09812
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 2 & 3: Two Column Layout (Skill Gauges & Action Ledger) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* NCVET Diagnostic Skill Gauges */}
          <div className={`lg:col-span-7 space-y-4 ${activeTab !== 'gauges' && 'hidden md:block'}`}>
            <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D5CEAE] pb-3">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                    Section 02 · NCVET Competency Matrix
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                    Industrial Skill Gauges vs Industry Benchmark
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[#15803D] bg-[#D8EEDF] px-2 py-0.5 rounded border border-[#B6DBC0]">
                  Level 4 Standard
                </span>
              </div>

              {/* Gauges List */}
              <div className="space-y-4 pt-1">
                {skillGauges.map((gauge) => {
                  const isGap = gauge.status === 'gap';
                  return (
                    <div key={gauge.id} className="p-3.5 rounded bg-[#FAF7EE] border border-[#D5CEAE] space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#0F253B]">
                            {gauge.name}
                          </div>
                          <div className="text-[11px] text-[#7A8C9E] font-mono">
                            {gauge.category}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            isGap 
                              ? 'bg-[#F2C8B4] text-[#5C2814]' 
                              : 'bg-[#D8EEDF] text-[#164627]'
                          }`}>
                            Candidate: {gauge.score}% | Req: {gauge.benchmark}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar with Benchmark Pin */}
                      <div className="relative pt-1">
                        <div className="h-3 w-full bg-[#EDE8D5] rounded-full overflow-hidden flex">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isGap ? 'bg-[#D97706]' : 'bg-[#15803D]'
                            }`}
                            style={{ width: `${gauge.score}%` }}
                          />
                        </div>
                        {/* Benchmark Line */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-[#0F253B] z-10"
                          style={{ left: `${gauge.benchmark}%` }}
                          title={`Industry Benchmark: ${gauge.benchmark}%`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-mono ${isGap ? 'text-[#B45309] font-semibold' : 'text-[#164627]'}`}>
                          {gauge.note}
                        </span>

                        {isGap && (
                          <button 
                            onClick={() => alert("Redirecting to Centurion Skill Academy: Module 'PLC Troubleshooting & Industrial Calibration' (18h self-paced)")}
                            className="text-[#263B52] hover:underline font-mono text-[10px] flex items-center gap-1 font-semibold"
                          >
                            <span>Upskill Module Available</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* In-Job Upskilling Recommendation Alert */}
              <div className="p-3 bg-[#F2C8B4]/20 border border-[#F2C8B4] rounded flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div className="text-xs text-[#0F253B]">
                  <strong className="font-semibold">Curriculum Gap Detected:</strong> Employer telemetry flags a 10% calibration deficit in PLC systems. Centurion Academy has assigned micro-credential module #IND-409 to bridge before the 18-month audit.
                </div>
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
                  Auto-Synchronized
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
                        onClick={() => setIsModalOpen(true)}
                        className="px-2.5 py-1 bg-[#FAF7EE] hover:bg-white text-xs font-mono font-medium text-[#263B52] rounded border border-[#C5BDA0] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{item.actionText}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sovereign Trust Signoff */}
              <div className="p-3 bg-[#FAF7EE] border border-[#D5CEAE] rounded text-xs space-y-1.5 text-[#5A6E85]">
                <div className="flex items-center gap-1.5 text-[#0F253B] font-semibold">
                  <Info className="w-3.5 h-3.5 text-[#263B52]" />
                  <span>3-Party Cryptographic Consensus</span>
                </div>
                <p className="text-[11px]">
                  All milestones are cross-referenced across Trainee Mobile OTP, Employer Shram Suvidha filing, and State ITI training logs.
                </p>
                <div className="text-[10px] font-mono text-[#7A8C9E] pt-1">
                  Hash: SHA256:7b29e01...c84fa
                </div>
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
        KaushalSetu National Skill Registry · Authorized Trainee Credential Passport · NCVET Compliant
      </div>
    </div>
  );
}
