import { useState, useEffect, useCallback } from 'react';
import type { EmployerCandidate } from '../types';
import { employerService } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, 
  Clock, 
  Send, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface EmployerDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function EmployerDashboard({ onNavigateHome, onSwitchRole }: EmployerDashboardProps) {
  const { profile: authProfile } = useAuth();
  const [candidates, setCandidates] = useState<EmployerCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<EmployerCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  
  // Feedback Transmitter Form State
  const [feedbackCandidate, setFeedbackCandidate] = useState('CAND-01');
  const [deficiencyCategory, setDeficiencyCategory] = useState('PLC & Automation Systems Calibration');
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'critical'>('moderate');
  const [feedbackNotes, setFeedbackNotes] = useState(
    'Batch 14 graduates understand basic circuit diagrams, but require hands-on calibration experience with Siemens S7-1200 PLCs.'
  );
  const [feedbackSent, setFeedbackSent] = useState(false);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const employerId = authProfile?.employerId || 'default';
      const data = await employerService.getCandidates(employerId);
      setCandidates(data);
      if (data.length > 0 && !selectedCandidate) {
        setSelectedCandidate(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load employer candidates:', err);
      setError(err.message || 'Unable to load candidates from PostgreSQL.');
    } finally {
      setLoading(false);
    }
  }, [selectedCandidate, authProfile?.employerId]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleTransmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSent(true);
    try {
      await employerService.submitFeedback({
        candidateId: feedbackCandidate,
        deficiencyCategory,
        severity,
        notes: feedbackNotes,
      });
      setNotice('NCVET Curriculum Loop: Feedback stored in PostgreSQL and transmitted to Training Partner.');
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice(`Feedback submission error: ${err.message}`);
    } finally {
      setFeedbackSent(false);
    }
  };

  const handleVerifyRetention = async (id: string, milestone: '3m' | '6m' | '12m') => {
    try {
      await employerService.verifyRetention(id, milestone);
      const updated = await employerService.getCandidates('tata');
      setCandidates(updated);
      setNotice(`Verified ${milestone.toUpperCase()} retention in PostgreSQL. Change is saved permanently.`);
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setNotice(`Failed to verify retention: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-[#263B52] border-t-transparent animate-spin mb-4" />
        <p className="font-mono text-sm text-[#47617C]">Loading Employer Verification Roster from PostgreSQL...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">KaushalSetu Database Connection Error</h2>
        <p className="text-sm font-mono text-red-700 max-w-md mb-6">{error}</p>
        <button
          onClick={loadCandidates}
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
              className="flex items-center gap-2 group text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded bg-[#263B52] text-[#F4F4E7] flex items-center justify-center font-serif font-bold text-sm tracking-wider">
                क
              </div>
              <div>
                <div className="font-serif font-bold text-sm tracking-wide text-[#0F253B] group-hover:text-[#263B52] transition-colors">
                  KAUSHAL SETU <span className="text-xs font-normal text-[#5A6E85]">| कौशल सेतु</span>
                </div>
                <div className="text-[10px] font-mono tracking-wider text-[#7A8C9E] uppercase">
                  Industry Partner Verification Gateway
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#D5CEAE]" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D8EEDF] text-[#164627] text-xs font-mono border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              ESTABLISHMENT ID: MH/PUN/0088219 · Connected to PostgreSQL
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSwitchRole('trainee')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#263B52] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Switch to Trainee View →
            </button>
            <button
              onClick={() => onSwitchRole('provider')}
              className="px-2.5 py-1.5 bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Training Partner View →
            </button>
          </div>
        </div>
      </div>

      {/* Action Notice Alert */}
      {notice && (
        <div className="bg-emerald-100 border-b border-emerald-300 px-4 py-2 text-center text-xs font-mono text-emerald-800 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* Industry Partner Header */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-6 space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Authorized Industry Enterprise
              </span>
              <h1 className="text-2xl font-serif font-bold text-[#0F253B]">
                Tata Motors Ancillary Ltd.
              </h1>
              <p className="text-xs text-[#52667A]">
                Plant: Chakan Industrial Estate, Unit 2, Pune, MH · 42 NCVET Hires Tracked
              </p>
            </div>

            <div className="md:col-span-6 flex flex-wrap items-center justify-start md:justify-end gap-3 pt-2 md:pt-0">
              <div className="p-3 bg-white border border-[#D5CEAE] rounded text-left min-w-[130px]">
                <div className="text-[10px] font-mono uppercase text-[#7A8C9E]">Active Hires</div>
                <div className="text-xl font-serif font-bold text-[#0F253B]">42 Trainees</div>
                <div className="text-[10px] text-[#16803D] font-mono">100% Retained</div>
              </div>

              <div className="p-3 bg-white border border-[#D5CEAE] rounded text-left min-w-[130px]">
                <div className="text-[10px] font-mono uppercase text-[#7A8C9E]">Avg. Wage Lift</div>
                <div className="text-xl font-serif font-bold text-[#16803D]">+22.4%</div>
                <div className="text-[10px] text-[#52667A] font-mono">₹21,500 Mean</div>
              </div>

              <div className="p-3 bg-white border border-[#D5CEAE] rounded text-left min-w-[130px]">
                <div className="text-[10px] font-mono uppercase text-[#7A8C9E]">Audit Status</div>
                <div className="text-xl font-serif font-bold text-[#263B52]">Compliant</div>
                <div className="text-[10px] text-[#16803D] font-mono">Tripartite Active</div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 1: Recruited Candidates Roster with Retention Signing */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D5CEAE] pb-3">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Section 01 · Longitudinal Retention Roster
              </span>
              <h2 className="text-lg font-serif font-bold text-[#0F253B]">
                Active Trainee Placement Roster & Retention Signoff
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#5A6E85]">
                {candidates.length} Candidate Records in PostgreSQL
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#D5CEAE] bg-[#EDE8D5] text-[#263B52] uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Trainee / Role</th>
                  <th className="py-2.5 px-3">Batch & Partner</th>
                  <th className="py-2.5 px-3">Tenure</th>
                  <th className="py-2.5 px-3 text-center">3M Check</th>
                  <th className="py-2.5 px-3 text-center">6M Check</th>
                  <th className="py-2.5 px-3 text-center">12M Check</th>
                  <th className="py-2.5 px-3">Wage Telemetry</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DEC3]">
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
                          onClick={() => handleVerifyRetention(cand.traineeId || cand.id, '6m')}
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
                        <button
                          onClick={() => handleVerifyRetention(cand.traineeId || cand.id, '12m')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#FAF7EE] text-[#263B52] hover:bg-[#EDE8D5] border border-[#D5CEAE] transition-colors cursor-pointer"
                        >
                          <Clock className="w-3 h-3" /> Verify 12M
                        </button>
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
          
          <div className="lg:col-span-7 bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-[#D5CEAE] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Section 02 · Industry Feedback Loop (NCVET Direct Conduit)
              </span>
              <h2 className="text-lg font-serif font-bold text-[#0F253B]">
                Transmit Observed Skill Deficits to Training Partner
              </h2>
            </div>

            <form onSubmit={handleTransmitFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#52667A] uppercase mb-1">
                  Candidate Under Evaluation
                </label>
                <select
                  value={feedbackCandidate}
                  onChange={(e) => setFeedbackCandidate(e.target.value)}
                  className="w-full bg-white border border-[#D5CEAE] rounded p-2 text-xs font-mono text-[#0F253B] focus:border-[#263B52] outline-none"
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.traineeId || c.id}>
                      {c.name} ({c.role}) · {c.batch}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#52667A] uppercase mb-1">
                    Deficiency Category
                  </label>
                  <select
                    value={deficiencyCategory}
                    onChange={(e) => setDeficiencyCategory(e.target.value)}
                    className="w-full bg-white border border-[#D5CEAE] rounded p-2 text-xs font-mono text-[#0F253B] focus:border-[#263B52] outline-none"
                  >
                    <option>PLC & Automation Systems Calibration</option>
                    <option>Industrial Sensor Diagnostic Protocols</option>
                    <option>Switchgear Maintenance & Safety PPE</option>
                    <option>Workplace Communication & Shift Logs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#52667A] uppercase mb-1">
                    Severity Level
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full bg-white border border-[#D5CEAE] rounded p-2 text-xs font-mono text-[#0F253B] focus:border-[#263B52] outline-none"
                  >
                    <option value="minor">Minor (Refresher Needed)</option>
                    <option value="moderate">Moderate (Module Lab Required)</option>
                    <option value="critical">Critical (NCVET Curriculum Revision)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#52667A] uppercase mb-1">
                  Technical Deficit Notes
                </label>
                <textarea
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-[#D5CEAE] rounded p-2 text-xs font-mono text-[#0F253B] focus:border-[#263B52] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={feedbackSent}
                className="px-4 py-2 bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] rounded text-xs font-mono flex items-center gap-2 shadow transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{feedbackSent ? 'Transmitting to PostgreSQL...' : 'Transmit Feedback to Partner & NCVET'}</span>
              </button>
            </form>
          </div>

          {/* Dossier Quick View */}
          <div className="lg:col-span-5 bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-[#D5CEAE] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Selected Candidate Dossier
              </span>
              <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                {selectedCandidate?.name || 'Priya Sharma'}
              </h3>
            </div>

            {selectedCandidate && (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-white border border-[#D5CEAE] rounded space-y-1">
                  <div className="text-[10px] text-[#7A8C9E] uppercase">Designation</div>
                  <div className="font-bold text-[#0F253B]">{selectedCandidate.role}</div>
                  <div className="text-[11px] text-[#4A5D70]">Batch: {selectedCandidate.batch}</div>
                </div>

                <div className="p-3 bg-white border border-[#D5CEAE] rounded space-y-1">
                  <div className="text-[10px] text-[#7A8C9E] uppercase">Tenure & Wages</div>
                  <div className="font-bold text-[#16803D]">{selectedCandidate.wageStatus}</div>
                  <div className="text-[11px] text-[#4A5D70]">Confirmed Tenure: {selectedCandidate.tenure}</div>
                </div>

                <div className="p-3 bg-white border border-[#D5CEAE] rounded space-y-1">
                  <div className="text-[10px] text-[#7A8C9E] uppercase">Validation Status</div>
                  <div className="font-bold text-[#0F253B]">
                    Status: <span className="text-emerald-700">{selectedCandidate.validationStatus}</span>
                  </div>
                  <div className="text-[11px] text-[#52667A]">
                    6M Retention: {selectedCandidate.retention6m} · 12M: {selectedCandidate.retention12m}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Footer */}
      <div className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3 px-4 text-center text-xs font-mono text-[#687C92]">
        KaushalSetu Industry Partner Gateway · Establishment #MH/PUN/0088219 · PostgreSQL Live Sync
      </div>
    </div>
  );
}
