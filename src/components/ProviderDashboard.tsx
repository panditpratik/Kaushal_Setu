import { useState, useEffect, useCallback } from 'react';
import type { ProviderBatch } from '../types';
import { providerService } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen,
  RefreshCw
} from 'lucide-react';

interface ProviderDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function ProviderDashboard({ onNavigateHome, onSwitchRole }: ProviderDashboardProps) {
  const { profile: authProfile } = useAuth();
  const [batches, setBatches] = useState<ProviderBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ProviderBatch | null>(null);
  const [moduleDeployed, setModuleDeployed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const providerId = authProfile?.providerId || 'default';
      const data = await providerService.getBatches(providerId);
      setBatches(data);
      if (data.length > 0) {
        setSelectedBatch(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load provider batches:', err);
      setError(err.message || 'Unable to load batches from PostgreSQL.');
    } finally {
      setLoading(false);
    }
  }, [authProfile?.providerId]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const handleDeployModule = async () => {
    if (!selectedBatch) return;
    try {
      const providerId = authProfile?.providerId || 'default';
      await providerService.deployModule(providerId, {
        moduleName: 'PLC Troubleshooting & Industrial Calibration (18h)',
        batchId: selectedBatch.id,
        cohortName: selectedBatch.name,
      });
      setModuleDeployed(true);
      setNotice('Intervention deployed: Micro-credential logged in PostgreSQL and dispatched to trainees.');
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice(`Failed to deploy module: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-[#263B52] border-t-transparent animate-spin mb-4" />
        <p className="font-mono text-sm text-[#47617C]">Loading Training Partner Batches from PostgreSQL...</p>
      </div>
    );
  }

  if (error || !selectedBatch) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">KaushalSetu Database Connection Error</h2>
        <p className="text-sm font-mono text-red-700 max-w-md mb-6">{error || 'No batches found in database.'}</p>
        <button
          onClick={loadBatches}
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
                  Training Partner Performance & DBT Portal
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#D5CEAE]" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D8EEDF] text-[#164627] text-xs font-mono border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              SMART ID: NCVET-TP-MH-9481 · Connected to PostgreSQL
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSwitchRole('employer')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#263B52] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Switch to Employer View →
            </button>
            <button
              onClick={() => onSwitchRole('government')}
              className="px-2.5 py-1.5 bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Government Directorate View →
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {notice && (
        <div className="bg-emerald-100 border-b border-emerald-300 px-4 py-2 text-center text-xs font-mono text-emerald-800 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* Partner Header */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-6 space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Accredited Vocational Partner
              </span>
              <h1 className="text-2xl font-serif font-bold text-[#0F253B]">
                Centurion Skill Academy Pune
              </h1>
              <p className="text-xs text-[#52667A]">
                Centre: Chakan Auto Cluster, Pune, MH · {batches.length} Active Cohorts in Database
              </p>
            </div>

            <div className="md:col-span-6 flex flex-wrap items-center justify-start md:justify-end gap-3 pt-2 md:pt-0">
              <div className="p-3 bg-white border border-[#D5CEAE] rounded text-left min-w-[130px]">
                <div className="text-[10px] font-mono uppercase text-[#7A8C9E]">Total Enrolled</div>
                <div className="text-xl font-serif font-bold text-[#0F253B]">145 Trainees</div>
                <div className="text-[10px] text-[#16803D] font-mono">92% Certified</div>
              </div>

              <div className="p-3 bg-white border border-[#D5CEAE] rounded text-left min-w-[130px]">
                <div className="text-[10px] font-mono uppercase text-[#7A8C9E]">6M Retention</div>
                <div className="text-xl font-serif font-bold text-[#16803D]">91.2%</div>
                <div className="text-[10px] text-[#52667A] font-mono">Benchmark: 70%</div>
              </div>

              <div className="p-3 bg-white border border-[#D5CEAE] rounded text-left min-w-[130px]">
                <div className="text-[10px] font-mono uppercase text-[#7A8C9E]">DBT Incentive</div>
                <div className="text-xl font-serif font-bold text-[#263B52]">₹7,50,000</div>
                <div className="text-[10px] text-[#16803D] font-mono">Tranches 1-2 Unlocked</div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 1: Batch Cohort Performance Telemetry */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D5CEAE] pb-3">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Section 01 · Cohort Performance Telemetry
              </span>
              <h2 className="text-lg font-serif font-bold text-[#0F253B]">
                Active Batches & Long-Term Placement Ledger
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batches.map((batch) => {
              const isSelected = selectedBatch.id === batch.id;
              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch)}
                  className={`p-4 rounded border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#263B52] shadow-xs ring-1 ring-[#263B52]'
                      : 'bg-[#FAF7EE] border-[#D5CEAE] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[#263B52]">
                      {batch.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D8EEDF] text-[#164627] font-semibold border border-[#B6DBC0]">
                      {batch.sector}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs font-mono border-y border-[#EDE8D5]">
                    <div>
                      <div className="text-[#7A8C9E] text-[10px]">Enrolled</div>
                      <div className="font-bold text-[#0F253B]">{batch.enrolled}</div>
                    </div>
                    <div>
                      <div className="text-[#7A8C9E] text-[10px]">Placed</div>
                      <div className="font-bold text-[#16803D]">{batch.placed}</div>
                    </div>
                    <div>
                      <div className="text-[#7A8C9E] text-[10px]">6M Retention</div>
                      <div className="font-bold text-[#263B52]">{batch.retentionRate6m}%</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-[11px] font-mono">
                    <span className="text-[#52667A]">Incentive: {batch.incentiveAmount}</span>
                    <span className="text-emerald-700 font-semibold">12M: {batch.retentionRate12m}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: DBT Performance-Linked Incentive Unlock Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
            <div className="border-b border-[#D5CEAE] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Section 02 · Performance Disbursement Protocol
              </span>
              <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                Tranche Incentive Unlock Ledger: {selectedBatch.id}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white rounded border border-[#D5CEAE] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D8EEDF] text-[#164627] flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0F253B]">Tranche 1: Mobilization & Training (30%)</div>
                    <div className="text-[11px] text-[#7A8C9E]">420 Practical Hours verified via biometric attendance</div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#15803D]">Disbursed (₹4.20L)</span>
              </div>

              <div className="p-3 bg-white rounded border border-[#D5CEAE] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D8EEDF] text-[#164627] flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0F253B]">Tranche 2: Assessment & Placement (50%)</div>
                    <div className="text-[11px] text-[#7A8C9E]">89% pass rate, placed in Tier-1 manufacturing</div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#15803D]">Disbursed (₹7.00L)</span>
              </div>

              <div className="p-3 bg-[#EDE8D5] rounded border border-[#263B52] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#263B52] text-[#F3E8A8] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0F253B]">Tranche 3: 12-Month Retention Bonus (20% Premium)</div>
                    <div className="text-[11px] text-[#5A6E85]">Verified {selectedBatch.retentionRate12m}% retention exceeds threshold</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-[#15803D] block">{selectedBatch.incentiveAmount}</span>
                  <span className="text-[10px] font-mono text-[#263B52]">Automated DBT Transfer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Incoming Employer Feedback & Syllabus Interventions */}
          <div className="lg:col-span-5 bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
            <div className="border-b border-[#D5CEAE] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Section 03 · Dynamic Curriculum Action
              </span>
              <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                Incoming Employer Telemetry
              </h3>
            </div>

            <div className="p-4 bg-[#EDE8D5] rounded border border-[#D5CEAE] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-[#263B52] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                  Tata Motors Operational Report
                </span>
                <span className="text-[10px] font-mono text-[#7A8C9E]">Live Feed</span>
              </div>

              <p className="text-[11px] text-[#0F253B] leading-relaxed">
                "Batch 14 graduates understand basic circuit diagrams, but require hands-on calibration experience with Siemens S7-1200 PLCs."
              </p>

              <div className="pt-2 border-t border-[#D5CEAE] flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#5A6E85]">
                  Micro-Credential #IND-409
                </span>
                <button
                  onClick={handleDeployModule}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                    moduleDeployed 
                      ? 'bg-[#D8EEDF] text-[#164627] font-semibold' 
                      : 'bg-[#263B52] hover:bg-[#1A2C40] text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{moduleDeployed ? 'Module Deployed to PostgreSQL' : 'Deploy PLC Module'}</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#687C92] bg-white p-3 rounded border border-[#D5CEAE] space-y-1">
              <div className="font-semibold text-[#0F253B]">Closing the Skilling Gap:</div>
              <div>Deploying this micro-credential automatically logs an intervention record in PostgreSQL and alerts all certified trainees from {selectedBatch.name}.</div>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <div className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3 px-4 text-center text-xs font-mono text-[#687C92]">
        KaushalSetu Training Partner Terminal · National Council for Vocational Education and Training · Live PostgreSQL Sync
      </div>
    </div>
  );
}
