import React from 'react';
import heroPlaneSvg from '../assets/hero-plane.svg';
import type { AppView, StakeholderRole } from '../types';
import { 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  Briefcase, 
  GraduationCap, 
  FileCheck, 
  Sparkles,
  ChevronRight,
  Database
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: AppView, role?: StakeholderRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col w-full">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full hero-gradient border-b border-[#D5CEAE] overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
        {/* Subtle Stipple grid overlay */}
        <div className="absolute inset-0 paper-stipple opacity-15 pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left: Headline & Actions */}
            <div className="lg:col-span-6 flex flex-col items-start">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/80 border border-[#D5CEAE] text-[10px] font-mono font-bold tracking-widest text-[#263B52] uppercase mb-6 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#F2C8B4] animate-pulse"></span>
                LONGITUDINAL SKILLING INTELLIGENCE · NCVET PARITY
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-[#0F253B] leading-[1.0] mb-6">
                Beyond the <br />
                <span className="font-serif italic font-normal text-[#263B52] tracking-normal">
                  Certificate.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#47617C] leading-relaxed max-w-xl mb-8">
                KaushalSetu tracks every vocational trainee beyond graduation — verifying employment through 
                <span className="text-[#0F253B] font-semibold"> 3-party consensus</span>, monitoring 
                <span className="text-[#0F253B] font-semibold"> 18-month wage trajectories</span>, and closing real-time curriculum gaps.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <button
                  onClick={() => onNavigate('trainee-dashboard', 'trainee')}
                  className="px-6 py-3.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] font-semibold text-xs uppercase tracking-wider rounded border border-[#263B52] flex items-center justify-center gap-2 transition-all shadow-sm group w-full sm:w-auto"
                >
                  <span>Explore Trainee Dossier (Priya)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => onNavigate('login')}
                  className="px-6 py-3.5 bg-white/80 hover:bg-white text-[#263B52] font-semibold text-xs uppercase tracking-wider rounded border border-[#263B52] flex items-center justify-center gap-2 transition-all shadow-sm w-full sm:w-auto"
                >
                  <span>Stakeholder Portal Login</span>
                </button>
              </div>

              {/* Micro-Trust Strip */}
              <div className="mt-8 pt-6 border-t border-[#D5CEAE]/80 flex flex-wrap items-center gap-4 text-xs font-mono text-[#52667A]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Aadhaar Biometric Linked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#263B52]" />
                  <span>EPFO Real-Time Pulse</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-amber-700" />
                  <span>Zero Ghost Placements</span>
                </div>
              </div>

            </div>

            {/* Right: SVG Illustration with Origami Paper Plane Certificate */}
            <div className="lg:col-span-6 relative flex justify-center">
              <div className="w-full max-w-[560px] bg-white border border-[#263B52] rounded-lg p-3 sm:p-4 shadow-sm relative">
                
                {/* Header tag */}
                <div className="flex items-center justify-between pb-3 border-b border-[#D5CEAE] mb-3 text-[11px] font-mono text-[#47617C]">
                  <span className="font-bold text-[#0F253B] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F2A57C]"></span>
                    LONGITUDINAL TRAJECTORY ARC
                  </span>
                  <span>TEL-NODE #4892</span>
                </div>

                {/* The SVG Plane Illustration from Stitch */}
                <div className="w-full h-auto rounded border border-[#D5CEAE] overflow-hidden bg-[#F7F4EB]">
                  <img 
                    src={heroPlaneSvg} 
                    alt="KaushalSetu Trajectory Arc & Paper Plane" 
                    className="w-full h-auto object-contain select-none"
                  />
                </div>

                {/* Trajectory Floating Metric Card */}
                <div className="mt-3 p-3 bg-[#F4F4E7] border border-[#D5CEAE] rounded flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[#47617C] text-[10px] block uppercase">Priya's Active Velocity:</span>
                    <span className="text-[#0F253B] font-bold">+22% Net Wage Lift (14M Tenure)</span>
                  </div>
                  <button 
                    onClick={() => onNavigate('trainee-dashboard', 'trainee')}
                    className="px-2.5 py-1 bg-[#263B52] text-[#F4F4E7] text-[10px] font-semibold uppercase tracking-wider rounded hover:bg-[#0F253B] transition-colors"
                  >
                    View Dossier
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 2. LIVE OUTCOME TELEMETRY STRIP */}
      <section id="metrics" className="w-full bg-white border-b border-[#D5CEAE] py-8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 divide-y md:divide-y-0 md:divide-x divide-[#D5CEAE]">
            
            <div className="flex flex-col pt-4 md:pt-0 md:px-4 first:pl-0">
              <span className="font-mono text-[11px] text-[#47617C] uppercase tracking-wider">
                Tracked Trainees
              </span>
              <div className="flex items-baseline gap-1 mt-1 text-[#0F253B]">
                <span className="text-3xl lg:text-4xl font-extrabold tracking-tight">1.42M</span>
                <span className="font-mono text-xs text-emerald-700 font-bold">+18% YoY</span>
              </div>
              <p className="text-xs text-[#52667A] mt-1">
                Continuous longitudinal tracking across 28 states & UTs
              </p>
            </div>

            <div className="flex flex-col pt-4 md:pt-0 md:px-4">
              <span className="font-mono text-[11px] text-[#47617C] uppercase tracking-wider">
                6-Month Retention
              </span>
              <div className="flex items-baseline gap-1 mt-1 text-[#0F253B]">
                <span className="text-3xl lg:text-4xl font-extrabold tracking-tight">89.2%</span>
                <span className="font-mono text-xs text-[#263B52] font-semibold">Verified</span>
              </div>
              <p className="text-xs text-[#52667A] mt-1">
                Automated monthly confirmation via EPFO contribution pulse
              </p>
            </div>

            <div className="flex flex-col pt-4 md:pt-0 md:px-4">
              <span className="font-mono text-[11px] text-[#47617C] uppercase tracking-wider">
                Consensus Standard
              </span>
              <div className="flex items-baseline gap-1 mt-1 text-[#0F253B]">
                <span className="text-3xl lg:text-4xl font-extrabold tracking-tight">3-Party</span>
                <span className="font-mono text-xs text-[#263B52] font-semibold">Protocol</span>
              </div>
              <p className="text-xs text-[#52667A] mt-1">
                Zero ghost placements: Trainee + Employer + VTP Triangulation
              </p>
            </div>

            <div className="flex flex-col pt-4 md:pt-0 md:px-4">
              <span className="font-mono text-[11px] text-[#47617C] uppercase tracking-wider">
                Avg. Wage Lift
              </span>
              <div className="flex items-baseline gap-1 mt-1 text-[#0F253B]">
                <span className="text-3xl lg:text-4xl font-extrabold tracking-tight">+38.2%</span>
                <span className="font-mono text-xs text-[#263B52] font-semibold">At 12M</span>
              </div>
              <p className="text-xs text-[#52667A] mt-1">
                Real salary enhancement verified against state minimum wage
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* 3. THE 5-STAGE LONGITUDINAL SKILLING LIFECYCLE */}
      <section id="lifecycle" className="w-full py-16 lg:py-24 bg-[#F4F4E7] border-b border-[#D5CEAE]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-[#263B52] mb-12">
            <div>
              <span className="font-mono text-[11px] text-[#263B52] uppercase font-bold tracking-widest block mb-2">
                Longitudinal Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F253B] tracking-tight">
                The 5-Stage Outcome Lifecycle
              </h2>
            </div>
            <p className="text-sm text-[#47617C] max-w-md mt-4 md:mt-0 font-medium">
              Moving beyond static credential issuance to continuous, multi-stakeholder outcome verification over an 18-month horizon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* Stage 1 */}
            <div className="bg-white border border-[#D5CEAE] p-5 rounded flex flex-col justify-between hover:border-[#263B52] transition-colors group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52] px-2 py-0.5 bg-[#F2C8B4]/50 rounded">
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
              <div className="mt-6 pt-3 border-t border-[#D5CEAE]/60 font-mono text-[10px] text-[#47617C]">
                420+ Hours · Digital Badge
              </div>
            </div>

            {/* Stage 2 */}
            <div className="bg-white border border-[#D5CEAE] p-5 rounded flex flex-col justify-between hover:border-[#263B52] transition-colors group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52] px-2 py-0.5 bg-[#C8C4F2]/50 rounded">
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
              <div className="mt-6 pt-3 border-t border-[#D5CEAE]/60 font-mono text-[10px] text-[#47617C]">
                Tata Motors · Month 0 Baseline
              </div>
            </div>

            {/* Stage 3 */}
            <div className="bg-white border border-[#263B52] p-5 rounded flex flex-col justify-between shadow-sm relative group bg-gradient-to-b from-white to-[#F7EEDC]/40">
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
              <div className="mt-6 pt-3 border-t border-[#D5CEAE]/60 font-mono text-[10px] text-[#47617C]">
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
              <div className="mt-6 pt-3 border-t border-[#D5CEAE]/60 font-mono text-[10px] text-[#47617C]">
                Active PLC Gap Alert
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 4. FOUR STAKEHOLDER PORTAL GATEWAYS */}
      <section id="stakeholders" className="w-full py-16 lg:py-24 bg-white border-b border-[#D5CEAE]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-[#D5CEAE] mb-12">
            <div>
              <span className="font-mono text-[11px] text-[#263B52] uppercase font-bold tracking-widest block mb-2">
                Unified Ecosystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F253B] tracking-tight">
                Stakeholder Dashboards
              </h2>
            </div>
            <p className="text-sm text-[#47617C] max-w-md mt-4 md:mt-0 font-medium">
              Every participant across the vocational skilling continuum operates through a tailored, high-density ledger view.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Trainee Card */}
            <div className="bg-[#F4F4E7]/60 border border-[#D5CEAE] rounded p-6 flex flex-col justify-between hover:bg-white hover:border-[#263B52] transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52]">01</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#F2C8B4] text-[#182A3A] border border-[#182A3A]/20">
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
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors group-hover:shadow"
              >
                <span>Launch Trainee Portal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Employer Card */}
            <div className="bg-[#F4F4E7]/60 border border-[#D5CEAE] rounded p-6 flex flex-col justify-between hover:bg-white hover:border-[#263B52] transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52]">02</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#C8C4F2] text-[#182A3A] border border-[#182A3A]/20">
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
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors group-hover:shadow"
              >
                <span>Launch Employer View</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Provider Card */}
            <div className="bg-[#F4F4E7]/60 border border-[#D5CEAE] rounded p-6 flex flex-col justify-between hover:bg-white hover:border-[#263B52] transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52]">03</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#F3E8A8] text-[#182A3A] border border-[#182A3A]/20">
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
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors group-hover:shadow"
              >
                <span>Launch Provider View</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Government Card */}
            <div className="bg-[#F4F4E7]/60 border border-[#D5CEAE] rounded p-6 flex flex-col justify-between hover:bg-white hover:border-[#263B52] transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-xs text-[#263B52]">04</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#C9DCF1] text-[#182A3A] border border-[#182A3A]/20">
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
                  <span>1.42M Records · Zero Comp</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('government-dashboard', 'government')}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors group-hover:shadow"
              >
                <span>Launch Sovereign View</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </section>


      {/* 5. ANTI-GHOSTING VERIFICATION ARCHITECTURE */}
      <section id="anti-ghosting" className="w-full py-16 lg:py-24 bg-[#F7F4EB] border-b border-[#D5CEAE]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
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
                    <p className="text-xs text-[#52667A] mt-0.5">
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
                    <p className="text-xs text-[#52667A] mt-0.5">
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
                    <p className="text-xs text-[#52667A] mt-0.5">
                      Accredited VTP center principals conduct random quarterly in-person or geofenced tele-audits.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white border border-[#263B52] rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#D5CEAE] mb-6">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#263B52]" />
                    <span className="font-mono font-bold text-xs text-[#0F253B] uppercase tracking-wider">
                      Live Consensus Telemetry Audit
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-800 bg-[#D8EEDF] px-2 py-0.5 rounded font-bold">
                    SYSTEM SECURE
                  </span>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between p-3 bg-[#F4F4E7] border border-[#D5CEAE] rounded">
                    <span className="text-[#47617C]">Candidate:</span>
                    <span className="font-bold text-[#0F253B]">Priya Sharma (KS-9812-PUN)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F4F4E7] border border-[#D5CEAE] rounded">
                    <span className="text-[#47617C]">Employer:</span>
                    <span className="font-bold text-[#0F253B]">Tata Motors Ancillary Ltd.</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F4F4E7] border border-[#D5CEAE] rounded">
                    <span className="text-[#47617C]">EPFO Linkage:</span>
                    <span className="text-emerald-700 font-bold">MH/PUN/0088219 ✓ Verified</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F4F4E7] border border-[#D5CEAE] rounded">
                    <span className="text-[#47617C]">VTP Center Sign-Off:</span>
                    <span className="text-emerald-700 font-bold">TC-NCVET-CENTURION-01 ✓ Verified</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#D5CEAE] flex items-center justify-between text-[11px] font-mono text-[#52667A]">
                  <span>Cryptographic Proof:</span>
                  <code className="bg-[#F4F4E7] px-2 py-1 rounded text-[#263B52] border border-[#D5CEAE]">
                    0x9b4a8e23f001c9a174d82bce49f72c
                  </code>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};
