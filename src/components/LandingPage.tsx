import React from 'react';
import type { AppView, StakeholderRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTraineeDossier } from '../hooks/useTraineeDossier';
import { useOutcomesSummary } from '../hooks/useOutcomesSummary';
import { TrajectoryArcCard } from './TrajectoryArcCard';
import { 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  Briefcase, 
  GraduationCap, 
  Sparkles, 
  ChevronRight, 
  Database, 
  Layers, 
  ArrowUpRight 
} from 'lucide-react';

export const FEATURED_TRAINEE_ID = 'priya';

interface LandingPageProps {
  onNavigate: (view: AppView, role?: StakeholderRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { data: featuredDossier, loading: featuredLoading, error: featuredError } = useTraineeDossier(user ? FEATURED_TRAINEE_ID : '');
  const { data: outcomes, loading: outcomesLoading } = useOutcomesSummary();

  const totalTraineesDisplay = outcomes?.totalTrainees != null ? outcomes.totalTrainees.toLocaleString() : (outcomesLoading ? '...' : '0');
  const employmentRateDisplay = outcomes?.employmentRate != null ? `${Math.round(outcomes.employmentRate * 100)}%` : (outcomesLoading ? '...' : '0%');
  const avgWageLiftDisplay = outcomes?.averageWageLiftPercent != null 
    ? `+${outcomes.averageWageLiftPercent}%` 
    : (outcomesLoading ? '...' : '—');
  return (
    <div className="flex flex-col w-full selection:bg-[#263B52] selection:text-white overflow-x-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full hero-gradient border-b border-[#D5CEAE] overflow-hidden pt-[64px] pb-[72px] lg:pt-[72px] lg:pb-[72px]">
        {/* Subtle Stipple grid overlay */}
        <div className="absolute inset-0 paper-stipple opacity-15 pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10 lg:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)] gap-10 lg:gap-12 xl:gap-[72px] items-center">
            
            {/* Left: Eyebrow, Headline, Description, Dual 56px CTAs, Verification Row */}
            <div className="flex flex-col items-start w-full">
              
              {/* Eyebrow with moved Telemetry status element */}
              <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded bg-white/90 border border-[#D5CEAE] text-[10px] sm:text-[11px] font-mono font-bold tracking-wider sm:tracking-widest text-[#263B52] uppercase mb-6 shadow-xs max-w-full">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                  <span className="truncate">LONGITUDINAL SKILLING INTELLIGENCE</span>
                </span>
                <span className="hidden md:inline h-3 w-px bg-[#D5CEAE]" />
                <span className="hidden md:inline text-[#52667A]">NCVET PARITY</span>
                <span className="hidden sm:inline h-3 w-px bg-[#D5CEAE]" />
                <span className="hidden sm:inline text-[#52667A] shrink-0">TEL-NODE: IN-DEL-9842</span>
              </div>

              {/* Headline: Sans "Beyond the" + Serif-Italic "Certificate." */}
              <h1 className="font-sans font-extrabold tracking-[-0.035em] text-[#0F253B] leading-[0.95] mb-6 text-[clamp(48px,5.5vw,92px)] sm:text-[clamp(56px,6vw,92px)]">
                Beyond the <br />
                <span className="font-serif italic font-normal text-[#263B52] tracking-normal block">
                  Certificate.
                </span>
              </h1>

              {/* Description: 20-22px, line-height 1.55, max-width 680px */}
              <p className="text-[18px] sm:text-[20px] lg:text-[22px] text-[#102A43] leading-[1.55] max-w-[680px] mb-8">
                KaushalSetu tracks every vocational trainee beyond graduation — verifying employment through{' '}
                <span className="text-[#0F253B] font-semibold">3-party consensus</span>, monitoring{' '}
                <span className="text-[#0F253B] font-semibold">18-month wage trajectories</span>, and closing real-time curriculum gaps.
              </p>

              {/* Dual 56px Action Buttons */}
              <div className="flex flex-col xl:flex-row gap-3.5 xl:gap-[18px] items-stretch xl:items-center w-full max-w-[520px] xl:max-w-none">
                <button
                  onClick={() => onNavigate('trainee-dashboard', 'trainee')}
                  className="h-[56px] px-4 sm:px-6 xl:px-8 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] font-semibold text-xs uppercase tracking-wider rounded border border-[#263B52] flex items-center justify-center gap-2 sm:gap-2.5 transition-all shadow-xs group w-full xl:w-auto shrink-0 cursor-pointer"
                >
                  <span className="text-center">EXPLORE TRAINEE DOSSIER (PRIYA)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                <button
                  onClick={() => onNavigate('login')}
                  className="h-[56px] px-4 sm:px-6 xl:px-8 bg-white hover:bg-[#FAF7EE] text-[#263B52] font-semibold text-xs uppercase tracking-wider rounded border border-[#263B52] flex items-center justify-center gap-2 transition-all shadow-xs w-full xl:w-auto shrink-0 cursor-pointer"
                >
                  <span className="text-center">STAKEHOLDER PORTAL LOGIN</span>
                </button>
              </div>

              {/* Editorial Verification Row (no pills/badges) */}
              <div className="mt-9 pt-6 border-t border-[#D5CEAE] flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8 text-xs font-mono text-[#52667A] w-full">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${featuredDossier?.verification.aadhaar === 'VERIFIED' ? 'text-emerald-700' : 'text-[#263B52]'}`} />
                  <span className="text-[#102A43]">Aadhaar Biometric Linked</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${featuredDossier?.verification.epfo === 'VERIFIED' ? 'text-emerald-700' : 'text-[#263B52]'}`} />
                  <span className="text-[#102A43]">EPFO Real-Time Pulse</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-[#102A43]">Zero Ghost Placements</span>
                </div>
              </div>

            </div>

            {/* Right: Longitudinal Trajectory Arc card (concept preserved, polished) */}
            <div className="w-full flex justify-center lg:justify-end">
              <TrajectoryArcCard 
                traineeId={FEATURED_TRAINEE_ID}
                data={featuredDossier}
                loading={featuredLoading}
                error={featuredError}
                onViewDossier={() => onNavigate('trainee-dashboard', 'trainee')}
              />
            </div>

          </div>
        </div>
      </section>


      {/* 2. LIVE OUTCOME TELEMETRY STRIP */}
      <section id="metrics" className="w-full bg-white border-b border-[#D5CEAE] py-10">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 divide-y md:divide-y-0 md:divide-x divide-[#D5CEAE]">
            
            <div className="flex flex-col pt-4 md:pt-0 md:px-6 first:pl-0">
              <span className="font-mono text-[11px] text-[#52667A] uppercase tracking-wider">
                Tracked Trainees
              </span>
              <div className="flex items-baseline gap-2 mt-1 text-[#0F253B] min-h-[40px]">
                {outcomesLoading ? (
                  <div className="h-9 w-20 bg-[#D5CEAE]/50 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-3xl lg:text-4xl font-extrabold tracking-tight">{totalTraineesDisplay}</span>
                    <span className="font-mono text-xs text-emerald-700 font-bold">+18% YoY</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[#52667A] mt-1.5 leading-relaxed">
                Continuous longitudinal tracking across 28 states & UTs
              </p>
            </div>

            <div className="flex flex-col pt-4 md:pt-0 md:px-6">
              <span className="font-mono text-[11px] text-[#52667A] uppercase tracking-wider">
                Employment Rate
              </span>
              <div className="flex items-baseline gap-2 mt-1 text-[#0F253B] min-h-[40px]">
                {outcomesLoading ? (
                  <div className="h-9 w-20 bg-[#D5CEAE]/50 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-3xl lg:text-4xl font-extrabold tracking-tight">{employmentRateDisplay}</span>
                    <span className="font-mono text-xs text-[#263B52] font-semibold">Verified</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[#52667A] mt-1.5 leading-relaxed">
                Automated monthly confirmation via EPFO contribution pulse
              </p>
            </div>

            <div className="flex flex-col pt-4 md:pt-0 md:px-6">
              <span className="font-mono text-[11px] text-[#52667A] uppercase tracking-wider">
                Consensus Standard
              </span>
              <div className="flex items-baseline gap-2 mt-1 text-[#0F253B] min-h-[40px]">
                <span className="text-3xl lg:text-4xl font-extrabold tracking-tight">3-Party</span>
                <span className="font-mono text-xs text-emerald-700 font-semibold">Protocol</span>
              </div>
              <p className="text-xs text-[#52667A] mt-1.5 leading-relaxed">
                Zero ghost placements: Trainee + Employer + VTP Triangulation
              </p>
            </div>

            <div className="flex flex-col pt-4 md:pt-0 md:px-6">
              <span className="font-mono text-[11px] text-[#52667A] uppercase tracking-wider">
                Avg. Wage Lift
              </span>
              <div className="flex items-baseline gap-2 mt-1 text-[#0F253B] min-h-[40px]">
                {outcomesLoading ? (
                  <div className="h-9 w-24 bg-[#D5CEAE]/50 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-3xl lg:text-4xl font-extrabold tracking-tight">{avgWageLiftDisplay}</span>
                    <span className="font-mono text-xs text-[#263B52] font-semibold">At 12M</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[#52667A] mt-1.5 leading-relaxed">
                Real salary enhancement verified against state minimum wage
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* 3. THE 5-STAGE LONGITUDINAL SKILLING LIFECYCLE */}
      <section id="lifecycle" className="w-full py-[96px] lg:py-[120px] bg-[#F4F4E7] border-b border-[#D5CEAE]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10 lg:px-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-[#263B52] mb-12">
            <div>
              <span className="font-mono text-[11px] text-[#263B52] uppercase font-bold tracking-widest block mb-2">
                Longitudinal Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F253B] tracking-tight">
                The 5-Stage Outcome Lifecycle
              </h2>
            </div>
            <p className="text-sm text-[#47617C] max-w-md mt-4 md:mt-0 font-medium leading-relaxed">
              Moving beyond static credential issuance to continuous, multi-stakeholder outcome verification over an 18-month horizon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            
            {/* Stage 1 */}
            <div className="bg-white border border-[#D5CEAE] p-5 rounded flex flex-col justify-between hover:border-[#263B52] transition-colors group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52] px-2 py-0.5 bg-[#F2C8B4]/40 rounded">
                    STAGE 01
                  </span>
                  <GraduationCap className="w-4 h-4 text-[#263B52]" />
                </div>
                <h3 className="font-bold text-base text-[#0F253B] mb-2 group-hover:text-[#263B52]">
                  Skill Attainment
                </h3>
                <p className="text-xs text-[#52667A] leading-relaxed">
                  NCVET / NSQF aligned training certification logged with verified Aadhaar biometric attendance.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#D5CEAE]/60 font-mono text-[10px] text-[#52667A]">
                420+ Hours · Digital Badge
              </div>
            </div>

            {/* Stage 2 */}
            <div className="bg-white border border-[#D5CEAE] p-5 rounded flex flex-col justify-between hover:border-[#263B52] transition-colors group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52] px-2 py-0.5 bg-[#C8C4F2]/40 rounded">
                    STAGE 02
                  </span>
                  <Briefcase className="w-4 h-4 text-[#263B52]" />
                </div>
                <h3 className="font-bold text-base text-[#0F253B] mb-2 group-hover:text-[#263B52]">
                  Employment Placement
                </h3>
                <p className="text-xs text-[#52667A] leading-relaxed">
                  Direct formal placement entry backed by corporate LIN/CIN code and baseline wage registry.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#D5CEAE]/60 font-mono text-[10px] text-[#52667A]">
                Tata Motors · Month 0 Baseline
              </div>
            </div>

            {/* Stage 3 (Core Protocol) */}
            <div className="bg-white border border-[#263B52] p-5 rounded flex flex-col justify-between shadow-xs relative group bg-gradient-to-b from-white to-[#F7EEDC]/40">
              <div className="absolute -top-2.5 right-3 bg-[#263B52] text-[#F4F4E7] font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                CORE PROTOCOL
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52] px-2 py-0.5 bg-[#F3E8A8] rounded">
                    STAGE 03
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-800" />
                </div>
                <h3 className="font-bold text-base text-[#0F253B] mb-2 group-hover:text-[#263B52]">
                  3-Party Consensus
                </h3>
                <p className="text-xs text-[#52667A] leading-relaxed">
                  Zero ghosting: Trainee self-log, employer EPFO contribution, and training partner field audit must match.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#D5CEAE]/60 font-mono text-[10px] text-emerald-800 font-bold">
                100% Cryptographic Lock ✓
              </div>
            </div>

            {/* Stage 4 */}
            <div className="bg-white border border-[#D5CEAE] p-5 rounded flex flex-col justify-between hover:border-[#263B52] transition-colors group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52] px-2 py-0.5 bg-[#D8EEDF] rounded">
                    STAGE 04
                  </span>
                  <TrendingUp className="w-4 h-4 text-[#263B52]" />
                </div>
                <h3 className="font-bold text-base text-[#0F253B] mb-2 group-hover:text-[#263B52]">
                  Retention & Wage Lift
                </h3>
                <p className="text-xs text-[#52667A] leading-relaxed">
                  Telemetry checks at 3, 6, 12, and 18 months measuring career tenure stability and salary escalation.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#D5CEAE]/60 font-mono text-[10px] text-[#52667A]">
                +22% logged at 14 months
              </div>
            </div>

            {/* Stage 5 */}
            <div className="bg-white border border-[#D5CEAE] p-5 rounded flex flex-col justify-between hover:border-[#263B52] transition-colors group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52] px-2 py-0.5 bg-[#C9DCF1] rounded">
                    STAGE 05
                  </span>
                  <Sparkles className="w-4 h-4 text-[#263B52]" />
                </div>
                <h3 className="font-bold text-base text-[#0F253B] mb-2 group-hover:text-[#263B52]">
                  Skill Calibration
                </h3>
                <p className="text-xs text-[#52667A] leading-relaxed">
                  Real-time employer deficiency flags feed into syllabus remediation & micro-credential modules.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#D5CEAE]/60 font-mono text-[10px] text-[#52667A]">
                Active PLC Gap Alert
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 4. FOUR STAKEHOLDER PORTAL GATEWAYS */}
      <section id="stakeholders" className="w-full py-[96px] lg:py-[120px] bg-white border-b border-[#D5CEAE]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10 lg:px-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-[#D5CEAE] mb-12">
            <div>
              <span className="font-mono text-[11px] text-[#263B52] uppercase font-bold tracking-widest block mb-2">
                Unified Ecosystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F253B] tracking-tight">
                Stakeholder Dashboards
              </h2>
            </div>
            <p className="text-sm text-[#47617C] max-w-md mt-4 md:mt-0 font-medium leading-relaxed">
              Every participant across the vocational skilling continuum operates through a tailored, high-density ledger view.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Trainee Card */}
            <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded p-6 flex flex-col justify-between hover:bg-white hover:border-[#263B52] transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52]">01</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#F2C8B4] text-[#182A3A]">
                    Trainee
                  </span>
                </div>
                <h3 className="font-bold text-lg text-[#0F253B] mb-2">
                  Trainee Dossier
                </h3>
                <p className="text-xs text-[#52667A] leading-relaxed mb-4">
                  Personal career trajectory tracking, verified credentials, wage hike confirmations, and upskilling pathways.
                </p>
                <div className="p-3 bg-white border border-[#D5CEAE] rounded text-[11px] font-mono text-[#47617C] mb-4">
                  <span className="text-[#0F253B] font-bold block">Priya Sharma (Electrician L4)</span>
                  <span>14m Tenure · ₹21,500/mo (+22%)</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('trainee-dashboard', 'trainee')}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Launch Trainee Portal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Employer Card */}
            <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded p-6 flex flex-col justify-between hover:bg-white hover:border-[#263B52] transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52]">02</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#C8C4F2] text-[#182A3A]">
                    Employer
                  </span>
                </div>
                <h3 className="font-bold text-lg text-[#0F253B] mb-2">
                  Employer Workspace
                </h3>
                <p className="text-xs text-[#52667A] leading-relaxed mb-4">
                  Validate trainee tenure, automate EPFO confirmation, and send real-time curriculum deficiency feedback.
                </p>
                <div className="p-3 bg-white border border-[#D5CEAE] rounded text-[11px] font-mono text-[#47617C] mb-4">
                  <span className="text-[#0F253B] font-bold block">Tata Motors Ancillary Ltd.</span>
                  <span>4 Candidates · 1 Flagged Gap</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('employer-dashboard', 'employer')}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Launch Employer View</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Provider Card */}
            <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded p-6 flex flex-col justify-between hover:bg-white hover:border-[#263B52] transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52]">03</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#F3E8A8] text-[#182A3A]">
                    Provider
                  </span>
                </div>
                <h3 className="font-bold text-lg text-[#0F253B] mb-2">
                  Training Partner
                </h3>
                <p className="text-xs text-[#52667A] leading-relaxed mb-4">
                  Audit cohort placement telemetry, remediate skill drop-offs, and unlock government milestone incentives.
                </p>
                <div className="p-3 bg-white border border-[#D5CEAE] rounded text-[11px] font-mono text-[#47617C] mb-4">
                  <span className="text-[#0F253B] font-bold block">Centurion Skill Academy</span>
                  <span>3 Batches · ₹7.5L Unlocked</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('provider-dashboard', 'provider')}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Launch Provider View</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Government Card */}
            <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded p-6 flex flex-col justify-between hover:bg-white hover:border-[#263B52] transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52]">04</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#C9DCF1] text-[#182A3A]">
                    Government
                  </span>
                </div>
                <h3 className="font-bold text-lg text-[#0F253B] mb-2">
                  State Missions / MSDE
                </h3>
                <p className="text-xs text-[#52667A] leading-relaxed mb-4">
                  District-level wage lift analytics, public fund disbursement ROI, and automated ghost placement audits.
                </p>
                <div className="p-3 bg-white border border-[#D5CEAE] rounded text-[11px] font-mono text-[#47617C] mb-4">
                  <span className="text-[#0F253B] font-bold block">Sovereign Registry</span>
                  <span>{totalTraineesDisplay} Verified Records · Live PostgreSQL Telemetry</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('government-dashboard', 'government')}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Launch Sovereign View</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </section>


      {/* 5. ANTI-GHOSTING VERIFICATION ARCHITECTURE */}
      <section id="anti-ghosting" className="w-full py-[96px] lg:py-[120px] bg-[#FAF7EE] border-b border-[#D5CEAE]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10 lg:px-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6">
              <span className="font-mono text-[11px] text-[#263B52] uppercase font-bold tracking-widest block mb-2">
                Public Trust & Integrity
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F253B] tracking-tight mb-6">
                Eliminating Ghost Placements Through 3-Party Consensus
              </h2>
              <p className="text-sm text-[#47617C] leading-relaxed mb-6">
                Traditional skilling schemes suffer from falsified paper records and one-day placements. 
                KaushalSetu enforces a continuous cryptographic triangle:
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-white border border-[#D5CEAE] rounded flex items-start gap-3">
                  <div className="p-2 bg-[#F2C8B4]/40 text-[#0F253B] rounded shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wide text-[#0F253B]">
                      1. Trainee Self-Reporting & Biometric Pulse
                    </h4>
                    <p className="text-xs text-[#52667A] mt-0.5 leading-relaxed">
                      Trainee confirms employment status and logs monthly wage receipts with Aadhaar OTP authentication.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white border border-[#D5CEAE] rounded flex items-start gap-3">
                  <div className="p-2 bg-[#C8C4F2]/40 text-[#0F253B] rounded shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wide text-[#0F253B]">
                      2. Employer EPFO Contribution Pulse
                    </h4>
                    <p className="text-xs text-[#52667A] mt-0.5 leading-relaxed">
                      Direct integration with the Employees' Provident Fund Organization confirms active payroll deposits.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white border border-[#D5CEAE] rounded flex items-start gap-3">
                  <div className="p-2 bg-[#F3E8A8]/40 text-[#0F253B] rounded shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wide text-[#0F253B]">
                      3. Training Partner Field Audit Sign-Off
                    </h4>
                    <p className="text-xs text-[#52667A] mt-0.5 leading-relaxed">
                      Accredited VTP center principals conduct random quarterly in-person or geofenced tele-audits.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white border border-[#263B52] rounded-lg p-4 sm:p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#D5CEAE] mb-6">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#263B52] shrink-0" />
                    <span className="font-mono font-bold text-xs text-[#0F253B] uppercase tracking-wider">
                      Live Consensus Telemetry Audit
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-800 bg-[#D8EEDF] px-2 py-0.5 rounded font-bold border border-[#B6DBC0] shrink-0">
                    SYSTEM SECURE
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#FAF7EE] border border-[#D5CEAE] rounded gap-1">
                    <span className="text-[#47617C] shrink-0">Candidate:</span>
                    <span className="font-bold text-[#0F253B] break-all sm:break-normal">Priya Sharma (KS-9812-PUN)</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#FAF7EE] border border-[#D5CEAE] rounded gap-1">
                    <span className="text-[#47617C] shrink-0">Employer:</span>
                    <span className="font-bold text-[#0F253B] break-all sm:break-normal">Tata Motors Ancillary Ltd.</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#FAF7EE] border border-[#D5CEAE] rounded gap-1">
                    <span className="text-[#47617C] shrink-0">EPFO Linkage:</span>
                    <span className="text-emerald-700 font-bold break-all sm:break-normal">MH/PUN/0088219 ✓ Verified</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#FAF7EE] border border-[#D5CEAE] rounded gap-1">
                    <span className="text-[#47617C] shrink-0">VTP Center Sign-Off:</span>
                    <span className="text-emerald-700 font-bold break-all sm:break-normal">TC-NCVET-CENTURION-01 ✓ Verified</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#D5CEAE] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-[#52667A] gap-2">
                  <span className="shrink-0">Cryptographic Proof:</span>
                  <code className="bg-[#FAF7EE] px-2 py-1 rounded text-[#263B52] border border-[#D5CEAE] break-all text-[10px] sm:text-[11px]">
                    0x9b4a8e23f001c9a174d82bce49f72c
                  </code>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. INSTITUTIONAL CALL-TO-ACTION */}
      <section className="w-full py-[80px] lg:py-[96px] bg-[#263B52] text-[#F4F4E7] border-b border-[#0F253B]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10 lg:px-12 text-center">
          <span className="font-mono text-[11px] text-[#F3E8A8] uppercase font-bold tracking-widest block mb-3">
            National Skilling Infrastructure
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-[#F4F4E7]">
            Integrate With The Sovereign Registry
          </h2>
          <p className="text-sm sm:text-base text-[#C9DCF1] max-w-2xl mx-auto mb-8 leading-relaxed font-sans">
            Whether you are a State Directorate, an industrial hiring partner, or an accredited vocational institute — connect via standardized telemetry APIs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('login')}
              className="h-[52px] px-8 bg-[#F3E8A8] hover:bg-[#FCEBA5] text-[#0F253B] font-bold text-xs uppercase tracking-wider rounded transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Access Institutional Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('government-dashboard', 'government')}
              className="h-[52px] px-8 bg-transparent hover:bg-white/10 text-[#F4F4E7] font-semibold text-xs uppercase tracking-wider rounded border border-[#C9DCF1]/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Inspect Sovereign Telemetry</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
