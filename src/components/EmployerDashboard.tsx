import { useState } from 'react';
import { EMPLOYER_CANDIDATES } from '../data/mockData';
import type { EmployerCandidate } from '../types';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Send, 
  ShieldCheck, 
  Filter
} from 'lucide-react';

interface EmployerDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function EmployerDashboard({ onNavigateHome, onSwitchRole }: EmployerDashboardProps) {
  const [candidates, setCandidates] = useState<EmployerCandidate[]>(EMPLOYER_CANDIDATES);
  const [selectedCandidate, setSelectedCandidate] = useState<EmployerCandidate | null>(null);
  
  // Feedback Transmitter Form State
  const [feedbackCandidate, setFeedbackCandidate] = useState('CAND-01');
  const [deficiencyCategory, setDeficiencyCategory] = useState('PLC & Automation Systems Calibration');
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'critical'>('moderate');
  const [feedbackNotes, setFeedbackNotes] = useState(
    'Batch 14 graduates understand basic circuit diagrams, but require hands-on calibration experience with Siemens S7-1200 PLCs.'
  );
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleTransmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      alert('NCVET Curriculum Loop: Feedback transmitted to Centurion Skill Academy & State Apprenticeship Directorate.');
    }, 1500);
  };

  const handleVerifyRetention = (id: string, milestone: '3m' | '6m' | '12m') => {
    setCandidates(prev => prev.map(cand => {
      if (cand.id === id) {
        if (milestone === '3m') return { ...cand, retention3m: 'verified' };
        if (milestone === '6m') return { ...cand, retention6m: 'verified' };
        if (milestone === '12m') return { ...cand, retention12m: 'verified' };
      }
      return cand;
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
                  Employer Retention & Audit Portal
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#D5CEAE]" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D8EEDF] text-[#164627] text-xs font-mono border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              GSTIN: 27AABCT2391K1Z2 · LIN Verified
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSwitchRole('provider')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#263B52] rounded text-xs font-mono transition-colors"
            >
              Switch to Training Partner View →
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* Corporate Header Snapshot */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            <div className="lg:col-span-5 flex items-start gap-4">
              <div className="w-14 h-14 rounded bg-[#263B52] text-[#F3E8A8] flex items-center justify-center font-serif font-bold text-xl border-2 border-[#D5CEAE] shadow-xs">
                TM
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0F253B]">
                    Tata Motors Ancillary Ltd.
                  </h1>
                </div>
                <p className="text-xs text-[#5A6E85] mt-0.5">
                  Unit 2, Chakan Industrial Estate, Pune, Maharashtra
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs font-mono text-[#7A8C9E]">
                  <Building2 className="w-3.5 h-3.5 text-[#263B52]" />
                  <span>Authorized HR & Ops Terminal: Vikram R. (Lead Ops)</span>
                </div>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Active Placed</span>
                <span className="text-lg font-bold font-mono text-[#0F253B]">4 Trainees</span>
                <span className="text-[10px] font-mono text-[#15803D] block mt-0.5">100% Shram Linked</span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">6M Retention</span>
                <span className="text-lg font-bold font-mono text-[#15803D]">100%</span>
                <span className="text-[10px] font-mono text-[#5A6E85] block mt-0.5">3 of 3 Eligible</span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">12M Retention</span>
                <span className="text-lg font-bold font-mono text-[#15803D]">100%</span>
                <span className="text-[10px] font-mono text-[#5A6E85] block mt-0.5">2 of 2 Eligible</span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Avg Wage Growth</span>
                <span className="text-lg font-bold font-mono text-[#0F253B] flex items-center gap-0.5">
                  <TrendingUp className="w-4 h-4 text-[#15803D]" /> +17.3%
                </span>
                <span className="text-[10px] font-mono text-[#15803D] block mt-0.5">Verified via EPFO</span>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 1: Candidate Longitudinal Retention Audit Table */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5CEAE] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#263B52]">
                <Users className="w-3.5 h-3.5 text-[#263B52]" />
                Section 01 · Longitudinal Retention Audit Ledger
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#0F253B]">
                Active Trainee Verification & Retention Audit (3M / 6M / 12M)
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1 text-[#5A6E85]">
                <Filter className="w-3.5 h-3.5" /> All Batches
              </span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EDE8D5] border-b border-[#D5CEAE] font-mono text-[11px] text-[#263B52] uppercase tracking-wider">
                  <th className="py-3 px-3">Candidate / Role</th>
                  <th className="py-3 px-3">Training Batch</th>
                  <th className="py-3 px-3">Tenure</th>
                  <th className="py-3 px-3 text-center">3-Month</th>
                  <th className="py-3 px-3 text-center">6-Month</th>
                  <th className="py-3 px-3 text-center">12-Month</th>
                  <th className="py-3 px-3">Wage Progression</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5CEAE] font-mono text-xs">
                {candidates.map((cand) => (
                  <tr 
                    key={cand.id}
                    className="hover:bg-[#F2EFE4] transition-colors"
                  >
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-[#0F253B] flex items-center gap-1.5">
                        {cand.name}
                        {cand.skillDeficiency && (
                          <span className="w-2 h-2 rounded-full bg-[#D97706]" title="Curriculum gap flagged" />
                        )}
                      </div>
                      <div className="text-[11px] text-[#5A6E85] font-mono">{cand.role}</div>
                    </td>

                    <td className="py-3 px-3 text-[#4A5D70] font-sans">
                      <div className="text-[11px]">{cand.batch}</div>
                      <div className="text-[10px] text-[#7A8C9E] font-mono">Joined {cand.joinDate}</div>
                    </td>

                    <td className="py-3 px-3 font-bold text-[#0F253B]">
                      {cand.tenure}
                    </td>

                    {/* 3-Month Status */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#D8EEDF] text-[#164627] font-semibold border border-[#B6DBC0]">
                        <CheckCircle2 className="w-3 h-3" /> Cleared
                      </span>
                    </td>

                    {/* 6-Month Status */}
                    <td className="py-3 px-3 text-center">
                      {cand.retention6m === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#D8EEDF] text-[#164627] font-semibold border border-[#B6DBC0]">
                          <CheckCircle2 className="w-3 h-3" /> Cleared
                        </span>
                      ) : (
                        <button
                          onClick={() => handleVerifyRetention(cand.id, '6m')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#FAF7EE] text-[#D97706] hover:bg-[#F3E8A8] border border-[#D5CEAE] transition-colors cursor-pointer"
                        >
                          <Clock className="w-3 h-3" /> Pending (Sign)
                        </button>
                      )}
                    </td>

                    {/* 12-Month Status */}
                    <td className="py-3 px-3 text-center">
                      {cand.retention12m === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#D8EEDF] text-[#164627] font-semibold border border-[#B6DBC0]">
                          <CheckCircle2 className="w-3 h-3" /> Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#EDE8D5] text-[#7A8C9E]">
                          <Clock className="w-3 h-3" /> In Progress
                        </span>
                      )}
                    </td>

                    {/* Wage Status */}
                    <td className="py-3 px-3 font-semibold text-[#0F253B]">
                      {cand.wageStatus}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedCandidate(cand)}
                        className="px-2.5 py-1 bg-white hover:bg-[#263B52] hover:text-white text-[#263B52] rounded border border-[#D5CEAE] text-[11px] transition-colors cursor-pointer"
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: Curriculum Gap Feedback Loop Transmitter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
            <div className="border-b border-[#D5CEAE] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Section 02 · Dynamic Curriculum Feedback Loop
              </span>
              <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                Transmit Deficiencies Directly to Training Providers (ITI/NSTI)
              </h3>
              <p className="text-xs text-[#5A6E85] mt-1">
                Direct statutory loop mandated under NCVET guidelines. Your feedback triggers real-time module updates for upcoming batches.
              </p>
            </div>

            <form onSubmit={handleTransmitFeedback} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono uppercase text-[#263B52] font-semibold mb-1">
                    Select Target Batch / Candidate
                  </label>
                  <select
                    value={feedbackCandidate}
                    onChange={(e) => setFeedbackCandidate(e.target.value)}
                    className="w-full bg-white border border-[#C5BDA0] focus:border-[#263B52] rounded px-3 py-2 text-xs font-mono text-[#0F253B] outline-none"
                  >
                    <option value="CAND-01">Priya Sharma · Centurion Pune #14</option>
                    <option value="CAND-02">Rahul K. Verma · SMART Delhi #04</option>
                    <option value="CAND-03">Ananya Deshmukh · Centurion Pune #14</option>
                    <option value="CAND-04">Mohit S. Rawat · Don Bosco Faridabad</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono uppercase text-[#263B52] font-semibold mb-1">
                    Deficiency Classification
                  </label>
                  <select
                    value={deficiencyCategory}
                    onChange={(e) => setDeficiencyCategory(e.target.value)}
                    className="w-full bg-white border border-[#C5BDA0] focus:border-[#263B52] rounded px-3 py-2 text-xs font-mono text-[#0F253B] outline-none"
                  >
                    <option value="PLC & Automation Systems Calibration">PLC & Automation Systems Calibration (-10%)</option>
                    <option value="Robotic Weld Fixture Safety">Robotic Weld Fixture Safety & Interlocks</option>
                    <option value="Digital Telemetry & Multimeter Calibration">Digital Telemetry & Diagnostics</option>
                    <option value="Shopfloor OSHA 18001 SOP Adherence">Shopfloor OSHA 18001 SOP Adherence</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono uppercase text-[#263B52] font-semibold mb-1">
                  Severity Level
                </label>
                <div className="flex gap-4">
                  {(['minor', 'moderate', 'critical'] as const).map((lvl) => (
                    <label key={lvl} className="flex items-center gap-1.5 cursor-pointer capitalize font-mono text-xs">
                      <input
                        type="radio"
                        name="severity"
                        checked={severity === lvl}
                        onChange={() => setSeverity(lvl)}
                        className="text-[#263B52] focus:ring-[#263B52]"
                      />
                      <span>{lvl}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono uppercase text-[#263B52] font-semibold mb-1">
                  Detailed Operational Recommendation
                </label>
                <textarea
                  rows={3}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full bg-white border border-[#C5BDA0] focus:border-[#263B52] rounded p-2.5 text-xs text-[#0F253B] outline-none font-mono"
                  placeholder="Describe the exact skill gap observed on the shop floor..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-mono text-[#7A8C9E]">
                  Cryptographically signed by Vikram R. (Tata Motors)
                </span>
                <button
                  type="submit"
                  disabled={feedbackSent}
                  className="px-4 py-2 bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] rounded text-xs font-mono flex items-center gap-1.5 shadow transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#F3E8A8]" />
                  <span>{feedbackSent ? 'Broadcasting...' : 'Broadcast to Partner & NCVET'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Shram Suvidha & EPFO Automated Pulse Status */}
          <div className="lg:col-span-5 bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
            <div className="border-b border-[#D5CEAE] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Section 03 · Shram Suvidha Telemetry
              </span>
              <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                Automated EPFO Electronic Linkage
              </h3>
            </div>

            <div className="p-3.5 bg-[#EDE8D5] rounded border border-[#D5CEAE] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#687C92]">Electronic Linkage Status</span>
                <span className="text-[#164627] font-mono text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> LIVE CONNECTED
                </span>
              </div>
              <div className="font-mono text-xs text-[#0F253B]">
                EPFO Establishment Code: <strong>MH/PUN/0088219/000</strong>
              </div>
              <div className="text-[11px] text-[#4A5D70]">
                Last synchronous wage pulse dispatched: <strong>24 Nov 2024 14:22 IST</strong>. 4 active trainee ECR returns confirmed without manual audit intervention.
              </div>
            </div>

            {/* Quick Candidate Snapshot Card if Selected */}
            {selectedCandidate ? (
              <div className="p-3.5 bg-white rounded border border-[#263B52] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F253B]">{selectedCandidate.name}</span>
                  <span className="text-[10px] font-mono bg-[#D8EEDF] text-[#164627] px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-[#5A6E85]">
                  {selectedCandidate.role} · {selectedCandidate.batch}
                </div>
                <div className="font-mono text-[11px] text-[#0F253B]">
                  Current Wage: {selectedCandidate.wageStatus}
                </div>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="text-[10px] font-mono text-[#263B52] hover:underline block pt-1"
                >
                  Close Snapshot
                </button>
              </div>
            ) : (
              <div className="p-3 bg-white rounded border border-[#D5CEAE] text-center text-xs text-[#7A8C9E]">
                Select any candidate row to view detailed Shram Suvidha audit trail.
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Footer */}
      <div className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3 px-4 text-center text-xs font-mono text-[#687C92]">
        KaushalSetu Employer Terminal · Ministry of Skill Development & Labour Employment Integration
      </div>
    </div>
  );
}
