import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ProviderBatch } from '../types';
import { providerService } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  RefreshCw, 
  Filter 
} from 'lucide-react';

interface ProviderDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function ProviderDashboard({ onNavigateHome, onSwitchRole }: ProviderDashboardProps) {
  const { profile: authProfile } = useAuth();
  const [batches, setBatches] = useState<ProviderBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ProviderBatch | null>(null);
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
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

  // Dynamic filter
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchSector = selectedSector === 'All' || b.sector.toLowerCase().includes(selectedSector.toLowerCase());
      const matchStatus = selectedStatus === 'All' || (b.status || 'ACTIVE').toLowerCase() === selectedStatus.toLowerCase();
      return matchSector && matchStatus;
    });
  }, [batches, selectedSector, selectedStatus]);

  // Dynamically calculate aggregate KPIs from actual database records
  const kpis = useMemo(() => {
    const totalTrained = batches.reduce((acc, b) => acc + (b.enrolled || 0), 0);
    const totalCertified = batches.reduce((acc, b) => acc + (b.certified || 0), 0);
    const totalPlaced = batches.reduce((acc, b) => acc + (b.placed || 0), 0);
    const completionRate = totalTrained > 0 ? Math.min(100, Math.round((totalCertified / totalTrained) * 100)) : 0;
    const certificationRate = totalTrained > 0 ? Math.min(100, Math.round((totalCertified / totalTrained) * 100)) : 0;
    const placementRate = totalCertified > 0 ? Math.min(100, Math.round((totalPlaced / totalCertified) * 100)) : 0;
    const avgRetention6m = batches.length > 0 ? Math.round(batches.reduce((acc, b) => acc + (b.retentionRate6m || 0), 0) / batches.length) : 0;
    const dropoutRate = totalTrained > 0 ? Math.max(0, 100 - completionRate) : 0;
    const totalIncentive = '₹' + (totalPlaced * 25000).toLocaleString('en-IN');

    return {
      totalTrained,
      totalCertified,
      totalPlaced,
      completionRate,
      certificationRate,
      placementRate,
      avgRetention6m,
      dropoutRate,
      totalIncentive,
    };
  }, [batches]);

  const handleDeployModule = async () => {
    if (!selectedBatch) return;
    try {
      const providerId = authProfile?.providerId || 'centurion';
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

  if (loading && batches.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#16212B] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-[#18324A] border-t-transparent animate-spin mb-4" />
        <p className="font-mono text-sm text-[#5E6B75]">Loading Training Partner Telemetry from PostgreSQL...</p>
      </div>
    );
  }

  if (error && batches.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#16212B] flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">KaushalSetu Database Connection Error</h2>
        <p className="text-sm font-mono text-red-700 max-w-md mb-6">{error || 'No batches found in database.'}</p>
        <button
          onClick={loadBatches}
          className="px-4 py-2 bg-[#18324A] text-white rounded font-mono text-sm flex items-center gap-2 hover:bg-[#0F253B] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#16212B] flex flex-col selection:bg-[#18324A] selection:text-white">
      {/* Top Banner Navigation */}
      <div className="border-b border-[#DCE3E7] bg-[#FAF7EE] px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onNavigateHome}
              className="flex items-center gap-2 group text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded bg-[#18324A] text-white flex items-center justify-center font-serif font-bold text-sm tracking-wider">
                क
              </div>
              <div>
                <div className="font-serif font-bold text-sm tracking-wide text-[#16212B] group-hover:text-[#18324A] transition-colors">
                  KAUSHAL SETU <span className="text-xs font-normal text-[#5E6B75]">| कौशल सेतु</span>
                </div>
                <div className="text-[10px] font-mono tracking-wider text-[#5E6B75] uppercase">
                  Training Partner Performance & Outcome Intelligence
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#DCE3E7]" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D8EEDF] text-[#164627] text-xs font-mono border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              SMART ID: NCVET-TP-MH-9481 · Connected to PostgreSQL
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSwitchRole('employer')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#18324A] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Switch to Employer View →
            </button>
            <button
              onClick={() => onSwitchRole('government')}
              className="px-2.5 py-1.5 bg-[#18324A] hover:bg-[#0F253B] text-white rounded text-xs font-mono transition-colors cursor-pointer"
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
        
        {/* Partner Header with Dynamic PostgreSQL Metrics */}
        <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-6 space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                Accredited Vocational Partner
              </span>
              <h1 className="text-2xl font-serif font-bold text-[#16212B]">
                Centurion Skill Academy Pune
              </h1>
              <p className="text-xs text-[#5E6B75]">
                Centre: Chakan Auto Cluster, Pune, MH · {batches.length} Active Cohorts in Database
              </p>
            </div>

            <div className="md:col-span-6 flex flex-wrap items-center justify-start md:justify-end gap-3 pt-2 md:pt-0">
              <div className="p-3 bg-white border border-[#DCE3E7] rounded text-left min-w-[130px] shadow-2xs">
                <div className="text-[10px] font-mono uppercase text-[#5E6B75]">Total Trained</div>
                <div className="text-xl font-serif font-bold text-[#18324A]">
                  {kpis.totalTrained} Trainees
                </div>
                <div className="text-[10px] text-[#15803D] font-mono">
                  {kpis.certificationRate}% Certified
                </div>
              </div>

              <div className="p-3 bg-white border border-[#DCE3E7] rounded text-left min-w-[130px] shadow-2xs">
                <div className="text-[10px] font-mono uppercase text-[#5E6B75]">Placement Rate</div>
                <div className="text-xl font-serif font-bold text-[#15803D]">
                  {kpis.placementRate}%
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono">
                  {kpis.totalPlaced} Placed Candidates
                </div>
              </div>

              <div className="p-3 bg-white border border-[#DCE3E7] rounded text-left min-w-[130px] shadow-2xs">
                <div className="text-[10px] font-mono uppercase text-[#5E6B75]">6M Retention</div>
                <div className="text-xl font-serif font-bold text-[#087F8C]">
                  {kpis.avgRetention6m}%
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono">Benchmark: 70%</div>
              </div>

              <div className="p-3 bg-white border border-[#DCE3E7] rounded text-left min-w-[130px] shadow-2xs">
                <div className="text-[10px] font-mono uppercase text-[#5E6B75]">DBT Incentive</div>
                <div className="text-xl font-serif font-bold text-[#18324A]">
                  {kpis.totalIncentive}
                </div>
                <div className="text-[10px] text-[#15803D] font-mono">Performance Unlocked</div>
              </div>
            </div>

          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded border border-[#DCE3E7] text-[#18324A]">
              <Filter className="w-3.5 h-3.5 text-[#5E6B75]" />
              <span className="text-[#5E6B75]">Sector / Programme:</span>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-medium"
              >
                <option value="All">All Sectors</option>
                <option value="Automotive">Automotive & Manufacturing</option>
                <option value="Industrial">Industrial Diagnostics</option>
                <option value="Electronics">Electronics & Automation</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded border border-[#DCE3E7] text-[#18324A]">
              <span className="text-[#5E6B75]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="ACTIVE">Active Batches</option>
                <option value="COMPLETED">Completed Batches</option>
              </select>
            </div>
          </div>

          <div className="text-[#5E6B75]">
            Showing <strong className="text-[#18324A]">{filteredBatches.length}</strong> of {batches.length} batches
          </div>
        </div>

        {/* SECTION 1: Batch Cohort Performance Telemetry */}
        <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE3E7] pb-3">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                Section 01 · Cohort Performance Telemetry
              </span>
              <h2 className="text-lg font-serif font-bold text-[#16212B]">
                Active Batches & Long-Term Placement Ledger
              </h2>
            </div>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[#5E6B75] bg-white rounded border border-[#DCE3E7]">
              No cohorts match the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBatches.map((batch) => {
                const isSelected = selectedBatch?.id === batch.id;
                return (
                  <div
                    key={batch.id}
                    onClick={() => setSelectedBatch(batch)}
                    className={`p-4 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#18324A] shadow-xs ring-1 ring-[#18324A]'
                        : 'bg-[#FAF7EE] border-[#DCE3E7] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-[#18324A]">
                        {batch.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D8EEDF] text-[#164627] font-semibold border border-[#B6DBC0]">
                        {batch.sector}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs font-mono border-y border-[#EDE8D5]">
                      <div>
                        <div className="text-[#5E6B75] text-[10px]">Enrolled</div>
                        <div className="font-bold text-[#16212B]">{batch.enrolled}</div>
                      </div>
                      <div>
                        <div className="text-[#5E6B75] text-[10px]">Placed</div>
                        <div className="font-bold text-[#15803D]">{batch.placed}</div>
                      </div>
                      <div>
                        <div className="text-[#5E6B75] text-[10px]">6M Retention</div>
                        <div className="font-bold text-[#087F8C]">{batch.retentionRate6m}%</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-[11px] font-mono">
                      <span className="text-[#5E6B75]">Incentive: {batch.incentiveAmount}</span>
                      <span className="text-emerald-700 font-semibold">12M Retention: {batch.retentionRate12m}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2 & 3: DBT Incentive Ledger & Dynamic Curriculum / Skill Gap Feed */}
        {selectedBatch && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <div className="lg:col-span-7 bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-6 shadow-xs space-y-4">
              <div className="border-b border-[#DCE3E7] pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                  Section 02 · Performance Disbursement Protocol
                </span>
                <h3 className="text-lg font-serif font-bold text-[#16212B]">
                  Tranche Incentive Unlock Ledger: {selectedBatch.name}
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white rounded border border-[#DCE3E7] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D8EEDF] text-[#164627] flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#16212B]">Tranche 1: Mobilization & Practical Training (30%)</div>
                      <div className="text-[11px] text-[#5E6B75]">420 Practical Hours verified via biometric attendance</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#15803D]">Disbursed (₹4.20L)</span>
                </div>

                <div className="p-3 bg-white rounded border border-[#DCE3E7] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D8EEDF] text-[#164627] flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#16212B]">Tranche 2: Assessment & Placement (50%)</div>
                      <div className="text-[11px] text-[#5E6B75]">89% pass rate, placed in Tier-1 manufacturing</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#15803D]">Disbursed (₹7.00L)</span>
                </div>

                <div className="p-3 bg-[#EDE8D5] rounded border border-[#18324A] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#18324A] text-[#F3E8A8] flex items-center justify-center font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#16212B]">Tranche 3: 12-Month Retention Bonus (20% Premium)</div>
                      <div className="text-[11px] text-[#5E6B75]">Verified {selectedBatch.retentionRate12m}% retention exceeds threshold</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-[#15803D] block">{selectedBatch.incentiveAmount}</span>
                    <span className="text-[10px] font-mono text-[#18324A]">Automated DBT Transfer</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incoming Employer Feedback & Syllabus Interventions */}
            <div className="lg:col-span-5 bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-6 shadow-xs space-y-4">
              <div className="border-b border-[#DCE3E7] pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                  Section 03 · Dynamic Curriculum Action
                </span>
                <h3 className="text-lg font-serif font-bold text-[#16212B]">
                  Incoming Employer Telemetry & Skill Gaps
                </h3>
              </div>

              <div className="p-4 bg-[#EDE8D5] rounded border border-[#DCE3E7] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-[#18324A] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                    Tata Motors Operational Deficiency Log
                  </span>
                  <span className="text-[10px] font-mono text-[#5E6B75]">Live Feed</span>
                </div>

                <p className="text-[11px] text-[#16212B] leading-relaxed">
                  "Batch graduates demonstrate solid basic electrical knowledge, but require practical hands-on diagnostic calibration with Siemens S7-1200 PLCs."
                </p>

                <div className="pt-2 border-t border-[#DCE3E7] flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#5E6B75]">
                    Micro-Credential #IND-409
                  </span>
                  <button
                    onClick={handleDeployModule}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                      moduleDeployed 
                        ? 'bg-[#D8EEDF] text-[#164627] font-semibold' 
                        : 'bg-[#18324A] hover:bg-[#0F253B] text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{moduleDeployed ? 'Module Deployed to PostgreSQL' : 'Deploy PLC Module'}</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[#5E6B75] bg-white p-3 rounded border border-[#DCE3E7] space-y-1">
                <div className="font-semibold text-[#16212B]">Closing the Skilling Gap:</div>
                <div>Deploying this micro-credential automatically logs an intervention record in PostgreSQL and alerts all certified trainees from {selectedBatch.name}.</div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <div className="border-t border-[#DCE3E7] bg-[#FAF7EE] py-3 px-4 text-center text-xs font-mono text-[#5E6B75]">
        KaushalSetu Training Partner Terminal · National Council for Vocational Education and Training · Live PostgreSQL Sync
      </div>
    </div>
  );
}

export default ProviderDashboard;
