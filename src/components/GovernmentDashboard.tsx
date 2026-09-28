import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GovernmentTab } from '../types';
import { 
  governmentService, 
  type GovernmentOutcomeIntelligence 
} from '../lib/api';
import { 
  CheckCircle2, 
  Filter, 
  Download, 
  AlertTriangle, 
  RefreshCw,
  TrendingUp, 
  Users, 
  Award, 
  Briefcase, 
  ShieldCheck, 
  HelpCircle, 
  X, 
  Clock,
  PlusCircle,
  ChevronRight,
  ArrowUpRight,
  AlertCircle,
  BookOpen,
  Database,
  BarChart3
} from 'lucide-react';

interface GovernmentDashboardProps {
  onNavigateHome?: () => void;
  onSwitchRole?: (role: string) => void;
  activeTab?: GovernmentTab;
  onTabChange?: (tab: GovernmentTab) => void;
}

export function GovernmentDashboard({ 
  onNavigateHome: _onNavigateHome, 
  onSwitchRole: _onSwitchRole,
  activeTab = 'overview',
  onTabChange 
}: GovernmentDashboardProps) {
  // Filters (server-side propagated)
  const [timeRange, setTimeRange] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [selectedProgramme, setSelectedProgramme] = useState<string>('All');
  const [selectedProvider, setSelectedProvider] = useState<string>('All');
  const [selectedDataQuality, setSelectedDataQuality] = useState<string>('all');

  // Skill Gap Tab Specific Filter
  const [skillSort, setSkillSort] = useState<'affected' | 'gap' | 'severity'>('affected');

  // Data States
  const [intelligence, setIntelligence] = useState<GovernmentOutcomeIntelligence | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>(() => new Date().toLocaleTimeString());
  const [realtimePulse, setRealtimePulse] = useState<boolean>(false);

  // Modals & Panels
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);
  const [isNewInterventionOpen, setIsNewInterventionOpen] = useState<boolean>(false);
  const [selectedInterventionForUpdate, setSelectedInterventionForUpdate] = useState<any | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Form States for Interventions
  const [newIntervention, setNewIntervention] = useState({
    targetType: 'PROGRAMME',
    targetName: '',
    issueType: 'SKILL_DEFICIT',
    description: '',
    actionTaken: '',
    followUpDate: '',
  });

  const [updateInterventionForm, setUpdateInterventionForm] = useState({
    status: 'ACTION_RECORDED',
    actionTaken: '',
    followUpDate: '',
    observedOutcomeNotes: '',
  });

  // Fetch Government Outcome Intelligence from PostgreSQL RPC
  const fetchIntelligence = useCallback(async (isRealtime = false) => {
    if (!isRealtime) setLoading(true);
    setError(null);
    try {
      const data = await governmentService.getOutcomeIntelligence({
        timeRange,
        district: selectedDistrict,
        programme: selectedProgramme,
        provider: selectedProvider,
        dataQuality: selectedDataQuality,
      });
      setIntelligence(data);
      setLastSync(new Date().toLocaleTimeString());
      if (isRealtime) {
        setRealtimePulse(true);
        setTimeout(() => setRealtimePulse(false), 2500);
      }
    } catch (err: any) {
      console.error('Failed to fetch government outcome intelligence:', err);
      setError(err.message || 'Error communicating with PostgreSQL sovereign node.');
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedDistrict, selectedProgramme, selectedProvider, selectedDataQuality]);

  // Initial & Filter Change Load
  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  // Realtime Subscriptions to Supabase PostgreSQL Tables
  useEffect(() => {
    const unsubscribe = governmentService.subscribeToAnalytics(() => {
      console.log('Realtime change event received in Government Telemetry Node. Invalidating RPC cache...');
      fetchIntelligence(true);
    });
    return () => {
      unsubscribe();
    };
  }, [fetchIntelligence]);

  // Record New Intervention Area
  const handleRecordInterventionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIntervention.targetName.trim() || !newIntervention.description.trim()) {
      alert('Target name and signal description are mandatory.');
      return;
    }
    try {
      await governmentService.recordIntervention({
        targetType: newIntervention.targetType,
        targetName: newIntervention.targetName.trim(),
        issueType: newIntervention.issueType,
        description: newIntervention.description.trim(),
        actionTaken: newIntervention.actionTaken.trim() || undefined,
        followUpDate: newIntervention.followUpDate || undefined,
      });
      setIsNewInterventionOpen(false);
      setNewIntervention({
        targetType: 'PROGRAMME',
        targetName: '',
        issueType: 'SKILL_DEFICIT',
        description: '',
        actionTaken: '',
        followUpDate: '',
      });
      setActionSuccessNotice('Intervention area recorded to sovereign registry.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
      fetchIntelligence(true);
    } catch (err: any) {
      alert('Failed to record intervention: ' + (err.message || 'Database error'));
    }
  };

  // Update Existing Intervention
  const handleUpdateInterventionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterventionForUpdate) return;
    try {
      await governmentService.updateIntervention({
        id: selectedInterventionForUpdate.id,
        status: updateInterventionForm.status,
        actionTaken: updateInterventionForm.actionTaken.trim() || undefined,
        followUpDate: updateInterventionForm.followUpDate || undefined,
        observedOutcomeNotes: updateInterventionForm.observedOutcomeNotes.trim() || undefined,
      });
      setSelectedInterventionForUpdate(null);
      setActionSuccessNotice('Intervention record updated in sovereign registry.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
      fetchIntelligence(true);
    } catch (err: any) {
      alert('Failed to update intervention: ' + (err.message || 'Database error'));
    }
  };

  // Unique list of options from returned intelligence
  const districtOptions = useMemo(() => {
    if (!intelligence?.districts) return [];
    return intelligence.districts.map(d => d.district).filter(d => d !== 'District not recorded');
  }, [intelligence]);

  const programmeOptions = useMemo(() => {
    if (!intelligence?.programmes) return [];
    return Array.from(new Set(intelligence.programmes.map(p => p.courseTitle)));
  }, [intelligence]);

  const providerOptions = useMemo(() => {
    if (!intelligence?.providers) return [];
    return Array.from(new Set(intelligence.providers.map(p => p.providerName)));
  }, [intelligence]);

  // Skill Gaps sorted factual view
  const sortedSkillGaps = useMemo(() => {
    if (!intelligence?.skillGaps) return [];
    const list = [...intelligence.skillGaps];
    if (skillSort === 'affected') {
      return list.sort((a, b) => b.affectedTraineesCount - a.affectedTraineesCount);
    } else if (skillSort === 'gap') {
      return list.sort((a, b) => b.gap - a.gap);
    } else if (skillSort === 'severity') {
      const weight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return list.sort((a, b) => (weight[b.severity] || 0) - (weight[a.severity] || 0));
    }
    return list;
  }, [intelligence?.skillGaps, skillSort]);

  // Helper for Exporting Aggregate Telemetry JSON
  const handleExportTelemetry = () => {
    if (!intelligence) return;
    const blob = new Blob([JSON.stringify(intelligence, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KaushalSetu-Government-Telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#16212B] font-sans">
      
      {/* 1. Sovereign Telemetry Banner & Status Bar */}
      <div className="bg-[#18324A] text-white border-b border-[#087F8C]/40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#087F8C]/20 border border-[#087F8C] flex items-center justify-center text-[#E7F5F4]">
              <ShieldCheck className="w-4 h-4 text-[#087F8C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-[#E7F5F4] font-bold">
                  Sovereign Outcome Telemetry Node
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#087F8C]/40 text-[#E7F5F4] border border-[#087F8C] rounded">
                  NCVET / MSDE Standard
                </span>
              </div>
              <p className="text-[11px] text-[#DCE3E7]/80 font-mono">
                PostgreSQL Cryptographic Ledger • Role: <strong className="text-white">GOVERNMENT</strong> • Strict Aggregate Mode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${realtimePulse ? 'bg-emerald-400 ring-4 ring-emerald-400/40 animate-ping' : 'bg-emerald-500'}`} />
              <span className="text-[#DCE3E7] text-[11px]">Realtime Active</span>
            </div>
            <div className="text-[11px] text-[#DCE3E7]/70 hidden sm:block">
              Sync: <span className="text-white font-semibold">{lastSync}</span>
            </div>
            <button
              onClick={() => fetchIntelligence(false)}
              disabled={loading}
              className="p-1.5 hover:bg-[#087F8C]/20 text-[#DCE3E7] hover:text-white rounded border border-[#087F8C]/30 transition-colors cursor-pointer"
              title="Manual Telemetry Re-query"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#087F8C]' : ''}`} />
            </button>
            <button
              onClick={() => setIsMethodologyOpen(true)}
              className="px-2.5 py-1 text-[11px] bg-[#087F8C] hover:bg-[#087F8C]/90 text-white rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Methodology & Definitions</span>
            </button>
            <button
              onClick={handleExportTelemetry}
              className="px-2.5 py-1 text-[11px] bg-white/10 hover:bg-white/20 text-[#DCE3E7] hover:text-white rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notice Banner */}
      {actionSuccessNotice && (
        <div className="bg-[#E7F5F4] border-b border-[#087F8C] text-[#087F8C] px-6 py-2.5 text-xs font-mono font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#087F8C]" />
            <span>{actionSuccessNotice}</span>
          </div>
          <button onClick={() => setActionSuccessNotice(null)} className="text-[#087F8C] hover:text-[#16212B]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Global Server-Side Filter Bar (Section 9 & 11) */}
      <div className="bg-white border-b border-[#DCE3E7] sticky top-[76px] sm:top-[84px] z-40 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#5E6B75]">
            <Filter className="w-3.5 h-3.5 text-[#087F8C]" />
            <span>TELEMETRY FILTERS:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Time Filter (Requirement 9) */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-[#5E6B75] hidden sm:inline">Time:</span>
              <div className="inline-flex rounded border border-[#DCE3E7] p-0.5 bg-[#FAF9F5] font-mono text-[11px]">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: '30d', label: '30 Days' },
                  { id: '90d', label: '90 Days' },
                  { id: '6m', label: '6 Months' },
                  { id: '12m', label: '12 Months' },
                ].map(tf => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeRange(tf.id)}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      timeRange === tf.id ? 'bg-[#18324A] text-white font-bold' : 'text-[#5E6B75] hover:text-[#16212B]'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* District Filter (Requirement 11) */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-[#5E6B75] hidden md:inline">District:</span>
              <select
                value={selectedDistrict}
                onChange={e => setSelectedDistrict(e.target.value)}
                className="text-xs font-mono bg-[#FAF9F5] border border-[#DCE3E7] rounded px-2.5 py-1 text-[#16212B] focus:border-[#087F8C] focus:outline-none"
              >
                <option value="All">All Districts</option>
                {districtOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Programme Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-[#5E6B75] hidden lg:inline">Programme:</span>
              <select
                value={selectedProgramme}
                onChange={e => setSelectedProgramme(e.target.value)}
                className="text-xs font-mono bg-[#FAF9F5] border border-[#DCE3E7] rounded px-2.5 py-1 text-[#16212B] focus:border-[#087F8C] focus:outline-none max-w-[180px] truncate"
              >
                <option value="All">All Programmes</option>
                {programmeOptions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Provider Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-[#5E6B75] hidden lg:inline">Provider:</span>
              <select
                value={selectedProvider}
                onChange={e => setSelectedProvider(e.target.value)}
                className="text-xs font-mono bg-[#FAF9F5] border border-[#DCE3E7] rounded px-2.5 py-1 text-[#16212B] focus:border-[#087F8C] focus:outline-none max-w-[180px] truncate"
              >
                <option value="All">All Providers</option>
                {providerOptions.map(pr => (
                  <option key={pr} value={pr}>{pr}</option>
                ))}
              </select>
            </div>

            {/* Data Quality Filter (Section 18) */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-[#5E6B75] hidden lg:inline">Data Coverage:</span>
              <select
                value={selectedDataQuality}
                onChange={e => setSelectedDataQuality(e.target.value)}
                className="text-xs font-mono bg-[#FAF9F5] border border-[#DCE3E7] rounded px-2.5 py-1 text-[#16212B] focus:border-[#087F8C] focus:outline-none"
              >
                <option value="all">All Telemetry</option>
                <option value="complete">Complete Outcome Data</option>
                <option value="incomplete">Incomplete Outcome Data</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(selectedDistrict !== 'All' || selectedProgramme !== 'All' || selectedProvider !== 'All' || timeRange !== 'all' || selectedDataQuality !== 'all') && (
              <button
                onClick={() => {
                  setTimeRange('all');
                  setSelectedDistrict('All');
                  setSelectedProgramme('All');
                  setSelectedProvider('All');
                  setSelectedDataQuality('all');
                }}
                className="text-[11px] font-mono text-[#E6A23C] hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Body */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-6">

        {/* Loading State */}
        {loading && !intelligence && (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-[#18324A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-mono text-xs font-bold text-[#18324A] uppercase tracking-wider">
              Executing Secure PostgreSQL Government Aggregation...
            </p>
            <p className="text-xs text-[#5E6B75] mt-1 font-mono">
              Verifying caller role: GOVERNMENT • Querying get_government_outcome_intelligence()
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-900 mb-6 font-mono text-xs">
            <div className="flex items-center gap-2 font-bold mb-2">
              <AlertTriangle className="w-4 h-4 text-red-700" />
              <span>Sovereign Telemetry Query Error</span>
            </div>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => fetchIntelligence(false)}
              className="px-3 py-1.5 bg-red-800 text-white rounded text-xs font-bold hover:bg-red-900 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Ready State */}
        {intelligence && !error && (
          <>
            {/* VIEW 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Header Information Card */}
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-xl font-bold text-[#18324A]">
                        National Skill Outcome Intelligence Dashboard
                      </h1>
                      <p className="text-xs text-[#5E6B75] mt-1">
                        Sovereign post-training telemetry across accredited vocational institutions. Derived from verified employment records and longitudinal assessments.
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs text-[#5E6B75]">
                      <div>Period: <strong className="text-[#18324A]">{timeRange.toUpperCase()}</strong></div>
                      <div>Active District Filter: <strong className="text-[#18324A]">{selectedDistrict}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Primary KPI Funnel Cards (Section 5) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  
                  {/* KPI 1: TOTAL TRAINEES */}
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-[#5E6B75] uppercase tracking-wider flex items-center justify-between">
                        <span>Total Trainees</span>
                        <Users className="w-3.5 h-3.5 text-[#087F8C]" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-[#18324A] mt-2">
                        {intelligence.kpis.totalTrainees.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#DCE3E7]/60 text-[10px] text-[#5E6B75] font-mono leading-tight">
                      Total cohort enrollments eligible in selected scope
                    </div>
                  </div>

                  {/* KPI 2: TRAINING COMPLETED */}
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-[#5E6B75] uppercase tracking-wider flex items-center justify-between">
                        <span>Completed</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#087F8C]" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-[#18324A] mt-2">
                        {intelligence.kpis.trainingCompleted.toLocaleString()}
                      </div>
                      <div className="text-xs font-mono text-[#087F8C] font-semibold mt-0.5">
                        {intelligence.kpis.completionRate !== null ? `${intelligence.kpis.completionRate}% rate` : 'Rate pending'}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#DCE3E7]/60 text-[10px] text-[#5E6B75] font-mono leading-tight">
                      Completed training records / eligible enrollments
                    </div>
                  </div>

                  {/* KPI 3: CERTIFIED */}
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-[#5E6B75] uppercase tracking-wider flex items-center justify-between">
                        <span>Certified</span>
                        <Award className="w-3.5 h-3.5 text-[#087F8C]" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-[#18324A] mt-2">
                        {intelligence.kpis.certified.toLocaleString()}
                      </div>
                      <div className="text-xs font-mono text-[#087F8C] font-semibold mt-0.5">
                        {intelligence.kpis.certificationRate !== null ? `${intelligence.kpis.certificationRate}% of completed` : 'Rate pending'}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#DCE3E7]/60 text-[10px] text-[#5E6B75] font-mono leading-tight">
                      Verified assessment certifications issued
                    </div>
                  </div>

                  {/* KPI 4: EMPLOYMENT OUTCOME RECORDED */}
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-[#5E6B75] uppercase tracking-wider flex items-center justify-between">
                        <span>Outcome Recorded</span>
                        <Briefcase className="w-3.5 h-3.5 text-[#087F8C]" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-[#18324A] mt-2">
                        {intelligence.kpis.employed.toLocaleString()}
                      </div>
                      <div className="text-xs font-mono text-[#087F8C] font-semibold mt-0.5">
                        {intelligence.kpis.employmentRate !== null ? `${intelligence.kpis.employmentRate}% recorded` : 'Rate pending'}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#DCE3E7]/60 text-[10px] text-[#5E6B75] font-mono leading-tight">
                      Outcome recorded after training (wage/self/apprentice)
                    </div>
                  </div>

                  {/* KPI 5: RETENTION (Handles Insufficient Data) */}
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-[#5E6B75] uppercase tracking-wider flex items-center justify-between">
                        <span>Retention (6M)</span>
                        <Clock className="w-3.5 h-3.5 text-[#087F8C]" />
                      </div>
                      {intelligence.kpis.retention6m.hasSufficientData ? (
                        <>
                          <div className="text-2xl font-bold font-mono text-[#18324A] mt-2">
                            {intelligence.kpis.retention6m.rate}%
                          </div>
                          <div className="text-xs font-mono text-[#087F8C] font-semibold mt-0.5">
                            {intelligence.kpis.retention6m.retainedCount} / {intelligence.kpis.retention6m.eligibleCount} verified
                          </div>
                        </>
                      ) : (
                        <div className="mt-2 py-1 px-2 bg-amber-50 border border-amber-200 rounded text-[11px] font-mono font-semibold text-amber-800">
                          {intelligence.kpis.retention6m.label}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#DCE3E7]/60 text-[10px] text-[#5E6B75] font-mono leading-tight">
                      Observed retention for placements elapsed &ge; 180 days
                    </div>
                  </div>

                  {/* KPI 6: SALARY PROGRESSION (Handles Insufficient Data) */}
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono font-bold text-[#5E6B75] uppercase tracking-wider flex items-center justify-between">
                        <span>Salary Lift</span>
                        <TrendingUp className="w-3.5 h-3.5 text-[#087F8C]" />
                      </div>
                      {intelligence.kpis.salaryProgression.hasSufficientData ? (
                        <>
                          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
                            +{intelligence.kpis.salaryProgression.averagePercentChange}%
                          </div>
                          <div className="text-xs font-mono text-[#5E6B75] font-semibold mt-0.5">
                            +₹{intelligence.kpis.salaryProgression.averageAbsoluteChange.toLocaleString()} / mo
                          </div>
                        </>
                      ) : (
                        <div className="mt-2 py-1 px-2 bg-amber-50 border border-amber-200 rounded text-[11px] font-mono font-semibold text-amber-800">
                          {intelligence.kpis.salaryProgression.label}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#DCE3E7]/60 text-[10px] text-[#5E6B75] font-mono leading-tight">
                      Observed salary change recorded between historical records
                    </div>
                  </div>

                </div>

                {/* Section 6: Outcome Funnel Visualization */}
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#18324A]">
                        Ecosystem Outcome Funnel
                      </h2>
                      <p className="text-xs text-[#5E6B75]">
                        Progression of cohorts through accredited lifecycle stages. No estimated or fabricated stages.
                      </p>
                    </div>
                    <div className="text-[11px] font-mono text-[#5E6B75]">
                      Database Records: <strong className="text-[#18324A]">{intelligence.meta.dataSource}</strong>
                    </div>
                  </div>

                  {/* Funnel Visual Sequence */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                    
                    {/* Stage 1: Enrolled */}
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded flex flex-col justify-between">
                      <div className="text-xs font-mono text-[#5E6B75] uppercase font-bold">1. Enrolled</div>
                      <div className="text-2xl font-mono font-bold text-[#18324A] my-2">
                        {intelligence.funnel.trained.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#5E6B75] font-mono">100% baseline</div>
                    </div>

                    {/* Stage 2: Completed */}
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded flex flex-col justify-between">
                      <div className="text-xs font-mono text-[#5E6B75] uppercase font-bold">2. Completed</div>
                      <div className="text-2xl font-mono font-bold text-[#18324A] my-2">
                        {intelligence.funnel.completed.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#087F8C] font-mono font-semibold">
                        {intelligence.kpis.completionRate !== null ? `${intelligence.kpis.completionRate}% of enrolled` : 'Data pending'}
                      </div>
                    </div>

                    {/* Stage 3: Certified */}
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded flex flex-col justify-between">
                      <div className="text-xs font-mono text-[#5E6B75] uppercase font-bold">3. Certified</div>
                      <div className="text-2xl font-mono font-bold text-[#18324A] my-2">
                        {intelligence.funnel.certified.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#087F8C] font-mono font-semibold">
                        {intelligence.kpis.certificationRate !== null ? `${intelligence.kpis.certificationRate}% of completed` : 'Data pending'}
                      </div>
                    </div>

                    {/* Stage 4: Employment Recorded */}
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded flex flex-col justify-between">
                      <div className="text-xs font-mono text-[#5E6B75] uppercase font-bold">4. Outcome Recorded</div>
                      <div className="text-2xl font-mono font-bold text-[#18324A] my-2">
                        {intelligence.funnel.employed.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#087F8C] font-mono font-semibold">
                        {intelligence.kpis.employmentRate !== null ? `${intelligence.kpis.employmentRate}% of eligible` : 'Data pending'}
                      </div>
                    </div>

                    {/* Stage 5: Retained (6M) */}
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded flex flex-col justify-between">
                      <div className="text-xs font-mono text-[#5E6B75] uppercase font-bold">5. Retained (6M)</div>
                      {intelligence.funnel.hasRetentionData ? (
                        <>
                          <div className="text-2xl font-mono font-bold text-[#18324A] my-2">
                            {intelligence.funnel.retained?.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[#087F8C] font-mono font-semibold">
                            {intelligence.kpis.retention6m.rate}% observed
                          </div>
                        </>
                      ) : (
                        <div className="my-2 py-1 px-2 bg-amber-50 border border-amber-200 rounded text-[11px] font-mono text-amber-800">
                          Insufficient observation data
                        </div>
                      )}
                      <div className="text-[10px] text-[#5E6B75] font-mono">&ge; 180 days elapsed</div>
                    </div>

                  </div>
                </div>

                {/* SECTION 14 & 15: OUTCOME DATA QUALITY & COMPLETENESS (SOVEREIGN COVERAGE AUDIT) */}
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE3E7] pb-4 mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#18324A] flex items-center gap-2">
                        <Database className="w-4 h-4 text-[#087F8C]" />
                        Outcome Data Quality & Coverage Telemetry
                      </h2>
                      <p className="text-xs text-[#5E6B75] mt-0.5">
                        PostgreSQL ledger audit distinguishing telemetry availability from verified achievement rates.
                      </p>
                    </div>
                    <div className="text-xs font-mono text-[#18324A] bg-[#E8F1F7] px-3 py-1.5 rounded border border-[#B8D5E5]">
                      <strong>Statutory Distiction (Section 15):</strong> Data Coverage ≠ Outcome Rate.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                      <div className="text-xs font-mono text-[#5E6B75] uppercase">Employment Coverage</div>
                      <div className="text-2xl font-serif font-bold text-[#18324A] mt-1">
                        {intelligence.dataQuality?.employmentOutcomeCoverage ?? 0}%
                      </div>
                      <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Candidates with documented outcome</div>
                    </div>

                    <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                      <div className="text-xs font-mono text-[#5E6B75] uppercase">Certification Coverage</div>
                      <div className="text-2xl font-serif font-bold text-[#18324A] mt-1">
                        {intelligence.dataQuality?.certificationCoverage ?? 0}%
                      </div>
                      <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Issued assessment certificates in ledger</div>
                    </div>

                    <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                      <div className="text-xs font-mono text-[#5E6B75] uppercase">Follow-Up Coverage</div>
                      <div className="text-2xl font-serif font-bold text-[#18324A] mt-1">
                        {intelligence.dataQuality?.followUpCoverage ?? 0}%
                      </div>
                      <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Completed longitudinal verification surveys</div>
                    </div>

                    <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                      <div className="text-xs font-mono text-[#5E6B75] uppercase">Salary History Documentation</div>
                      <div className="text-2xl font-serif font-bold text-[#18324A] mt-1">
                        {intelligence.dataQuality?.salaryHistoryCoverage ?? 0}%
                      </div>
                      <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Verified pre & post-placement wage records</div>
                    </div>
                  </div>

                  {/* Comparative distinction box */}
                  <div className="mt-4 p-3 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="font-bold text-[#18324A]">Outcome Data Coverage: {intelligence.dataQuality?.employmentOutcomeCoverage ?? 0}%</span>
                        <p className="text-[11px] text-[#5E6B75] mt-0.5">
                          Reflects telemetry completeness. {intelligence.dataQuality?.employmentOutcomeCoverage ?? 0}% of eligible candidates have recorded post-training status in PostgreSQL.
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-[#164627]">Employment Outcome Rate: {intelligence.kpis.employmentRate ?? 0}%</span>
                        <p className="text-[11px] text-[#5E6B75] mt-0.5">
                          Reflects verified programmatic placement. {intelligence.kpis.employmentRate ?? 0}% of eligible candidates achieved authenticated wage, self, or apprenticeship.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Data Quality Signals */}
                  {intelligence.dataQuality?.signals && intelligence.dataQuality.signals.filter(Boolean).length > 0 && (
                    <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded">
                      <div className="text-xs font-mono font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Active Telemetry Data Quality Signals:</span>
                      </div>
                      <ul className="space-y-1 text-xs font-mono text-amber-800">
                        {intelligence.dataQuality.signals.filter(Boolean).map((sig, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-500">•</span>
                            <span>{sig}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Section 22: Areas Requiring Review (Closed-Loop Callout) */}
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#E6A23C]" />
                      <div>
                        <h2 className="text-base font-bold text-[#18324A]">
                          Areas Requiring Review (Data-Driven Signals)
                        </h2>
                        <p className="text-xs text-[#5E6B75]">
                          Evidence-based policy signals. Does not make automated decisions or assign causal blame.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onTabChange?.('interventions')}
                      className="text-xs font-mono text-[#087F8C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Interventions ({intelligence.interventions.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Signal 1: Skill Gaps */}
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="flex items-center justify-between text-xs font-mono text-[#5E6B75] mb-2">
                        <span className="font-bold">Competency Signal</span>
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">Review</span>
                      </div>
                      <div className="text-lg font-bold text-[#18324A]">
                        {intelligence.skillGaps.length} Critical Deficits Observed
                      </div>
                      <p className="text-xs text-[#5E6B75] mt-1 leading-relaxed">
                        Top observed gap: <strong className="text-[#18324A]">{intelligence.skillGaps[0]?.skillName || 'None'}</strong> with {intelligence.skillGaps[0]?.gap || 0} pt delta from benchmark.
                      </p>
                      <button
                        onClick={() => onTabChange?.('skills')}
                        className="mt-3 text-xs font-mono text-[#087F8C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Investigate Skill Gaps <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Signal 2: Non-Placement */}
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="flex items-center justify-between text-xs font-mono text-[#5E6B75] mb-2">
                        <span className="font-bold">Non-Placement Signal</span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">Review</span>
                      </div>
                      <div className="text-lg font-bold text-[#18324A]">
                        {intelligence.kpis.notEmployed} Trainees Seeking Role
                      </div>
                      <p className="text-xs text-[#5E6B75] mt-1 leading-relaxed">
                        Primary reported reason: <strong className="text-[#18324A]">{intelligence.nonPlacement.reasons[0]?.reason || 'Still seeking employment'}</strong> ({intelligence.nonPlacement.reasons[0]?.percentage || 0}%).
                      </p>
                      <button
                        onClick={() => onTabChange?.('non-placement')}
                        className="mt-3 text-xs font-mono text-[#087F8C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Investigate Non-Placement <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Signal 3: Longitudinal Coverage */}
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="flex items-center justify-between text-xs font-mono text-[#5E6B75] mb-2">
                        <span className="font-bold">Follow-Up Coverage</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">Signal</span>
                      </div>
                      <div className="text-lg font-bold text-[#18324A]">
                        {intelligence.kpis.followUps.completed} / {intelligence.kpis.followUps.assigned} Follow-ups
                      </div>
                      <p className="text-xs text-[#5E6B75] mt-1 leading-relaxed">
                        Coverage rate: <strong className="text-[#18324A]">{intelligence.kpis.followUps.completionRate || 0}%</strong>. Overdue items requiring provider engagement: <strong className="text-[#18324A]">{intelligence.kpis.followUps.overdue}</strong>.
                      </p>
                      <button
                        onClick={() => onTabChange?.('follow-ups')}
                        className="mt-3 text-xs font-mono text-[#087F8C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Investigate Follow-ups <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* VIEW 2: ANALYTICS & TRENDS */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                  <h2 className="text-lg font-bold text-[#18324A]">Outcome Trends (Quarterly Time-Series)</h2>
                  <p className="text-xs text-[#5E6B75] mt-1">
                    Temporal distribution derived directly from cohort enrollment and employment verification timestamps.
                  </p>
                </div>

                {/* Trend Table */}
                <div className="bg-white border border-[#DCE3E7] rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-[#DCE3E7] flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#18324A] uppercase">
                      Quarterly Cohort Progression Observations
                    </span>
                    <span className="text-[11px] font-mono text-[#5E6B75]">
                      {intelligence.outcomeTrends.length} Quarter Intervals
                    </span>
                  </div>

                  {intelligence.outcomeTrends.length === 0 ? (
                    <div className="p-8 text-center text-[#5E6B75] font-mono text-xs">
                      No cohort observations recorded for the selected filter parameters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#FAF9F5] border-b border-[#DCE3E7] text-[#5E6B75]">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">Quarter</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Enrolled</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Completed</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Certified</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Employed</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Not Employed</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Placement Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DCE3E7]">
                          {intelligence.outcomeTrends.map((tr, idx) => {
                            const pRate = tr.completed > 0 ? ((tr.employed / tr.completed) * 100).toFixed(1) : 'N/A';
                            return (
                              <tr key={idx} className="hover:bg-[#FAF9F5]/80 transition-colors">
                                <td className="py-3 px-4 font-bold text-[#18324A]">{tr.period}</td>
                                <td className="py-3 px-4 text-right">{tr.enrolled}</td>
                                <td className="py-3 px-4 text-right">{tr.completed}</td>
                                <td className="py-3 px-4 text-right text-[#087F8C] font-semibold">{tr.certified}</td>
                                <td className="py-3 px-4 text-right text-emerald-700 font-bold">{tr.employed}</td>
                                <td className="py-3 px-4 text-right text-[#E6A23C]">{tr.notEmployed}</td>
                                <td className="py-3 px-4 text-right font-bold text-[#18324A]">
                                  {pRate !== 'N/A' ? `${pRate}%` : 'Pending'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Outcome Type Distribution (Wage vs Self vs Apprentice) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                    <div className="text-xs font-mono font-bold text-[#5E6B75] uppercase">Wage Employed</div>
                    <div className="text-3xl font-mono font-bold text-[#18324A] mt-2">
                      {intelligence.kpis.wageEmployed}
                    </div>
                    <p className="text-xs text-[#5E6B75] mt-1">Formally employed with verified monthly payroll</p>
                  </div>
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                    <div className="text-xs font-mono font-bold text-[#5E6B75] uppercase">Self Employed</div>
                    <div className="text-3xl font-mono font-bold text-[#18324A] mt-2">
                      {intelligence.kpis.selfEmployed}
                    </div>
                    <p className="text-xs text-[#5E6B75] mt-1">Registered enterprise or micro-entrepreneurship</p>
                  </div>
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                    <div className="text-xs font-mono font-bold text-[#5E6B75] uppercase">Apprenticeship</div>
                    <div className="text-3xl font-mono font-bold text-[#18324A] mt-2">
                      {intelligence.kpis.apprenticeship}
                    </div>
                    <p className="text-xs text-[#5E6B75] mt-1">Formal NATS/NAPS apprenticeship engagement</p>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: PROGRAMMES (Section 12 - Factual Comparison) */}
            {activeTab === 'programmes' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                  <h2 className="text-lg font-bold text-[#18324A]">Programme Outcome Analytics</h2>
                  <p className="text-xs text-[#5E6B75] mt-1">
                    Factual comparison of accredited programmes across providers. No subjective "best" or "worst" badges.
                  </p>
                </div>

                <div className="bg-white border border-[#DCE3E7] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#FAF9F5] border-b border-[#DCE3E7] text-[#5E6B75]">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Programme Title</th>
                          <th className="py-2.5 px-4 font-semibold">Sector</th>
                          <th className="py-2.5 px-4 font-semibold">Provider</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Trainees</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Completion</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Certification</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Outcome Recorded</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Retention (6M)</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Skill Gaps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE3E7]">
                        {intelligence.programmes.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-[#5E6B75]">
                              No programme records found for current filter.
                            </td>
                          </tr>
                        ) : (
                          intelligence.programmes.map((p, idx) => (
                            <tr key={idx} className="hover:bg-[#FAF9F5]/80 transition-colors">
                              <td className="py-3 px-4 font-bold text-[#18324A]">{p.courseTitle}</td>
                              <td className="py-3 px-4 text-[#5E6B75]">{p.sector}</td>
                              <td className="py-3 px-4 text-[#18324A]">{p.providerName}</td>
                              <td className="py-3 px-4 text-right font-bold">{p.trainees}</td>
                              <td className="py-3 px-4 text-right">
                                {p.completionRate !== null ? `${p.completionRate}%` : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-right text-[#087F8C] font-semibold">
                                {p.certificationRate !== null ? `${p.certificationRate}%` : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                                {p.employmentRate !== null ? `${p.employmentRate}%` : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {p.hasRetentionData ? `${p.retentionRate}%` : <span className="text-amber-800 text-[10px]">Pending obs.</span>}
                              </td>
                              <td className="py-3 px-4 text-right text-[#E6A23C] font-semibold">
                                {p.skillGaps}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: PROVIDERS (Section 13 - Factual Comparison) */}
            {activeTab === 'providers' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                  <h2 className="text-lg font-bold text-[#18324A]">Training Provider Outcome Telemetry</h2>
                  <p className="text-xs text-[#5E6B75] mt-1">
                    Aggregate verification statistics by accredited training institution. Trainee PII is omitted.
                  </p>
                </div>

                <div className="bg-white border border-[#DCE3E7] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#FAF9F5] border-b border-[#DCE3E7] text-[#5E6B75]">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Training Partner</th>
                          <th className="py-2.5 px-4 font-semibold">Accreditation ID</th>
                          <th className="py-2.5 px-4 font-semibold">District Cluster</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Trainees</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Completion</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Certification</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Outcome Recorded</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Retention (6M)</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Skill Gaps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE3E7]">
                        {intelligence.providers.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-[#5E6B75]">
                              No provider records found.
                            </td>
                          </tr>
                        ) : (
                          intelligence.providers.map((pr, idx) => (
                            <tr key={idx} className="hover:bg-[#FAF9F5]/80 transition-colors">
                              <td className="py-3 px-4 font-bold text-[#18324A]">{pr.providerName}</td>
                              <td className="py-3 px-4 text-[#5E6B75]">{pr.accreditationId}</td>
                              <td className="py-3 px-4 text-[#18324A]">{pr.district}</td>
                              <td className="py-3 px-4 text-right font-bold">{pr.trainees}</td>
                              <td className="py-3 px-4 text-right">
                                {pr.completionRate !== null ? `${pr.completionRate}%` : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-right text-[#087F8C] font-semibold">
                                {pr.certificationRate !== null ? `${pr.certificationRate}%` : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                                {pr.employmentRate !== null ? `${pr.employmentRate}%` : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {pr.hasRetentionData ? `${pr.retentionRate}%` : <span className="text-amber-800 text-[10px]">Pending obs.</span>}
                              </td>
                              <td className="py-3 px-4 text-right text-[#E6A23C] font-semibold">
                                {pr.skillGaps}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 5: DISTRICTS (Section 10 - Table + Horizontal Bars) */}
            {activeTab === 'districts' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                  <h2 className="text-lg font-bold text-[#18324A]">District-Level Outcome Analytics</h2>
                  <p className="text-xs text-[#5E6B75] mt-1">
                    Telemetry aggregated across candidate residence districts. No fabricated heatmaps or synthetic geographic coordinates.
                  </p>
                </div>

                <div className="bg-white border border-[#DCE3E7] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#FAF9F5] border-b border-[#DCE3E7] text-[#5E6B75]">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">District Name</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Trainees</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Completion</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Certification</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Outcome Recorded</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Retention (6M)</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Skill Deficits</th>
                          <th className="py-2.5 px-4 font-semibold min-w-[160px]">Placement Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE3E7]">
                        {intelligence.districts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-[#5E6B75]">
                              No district records found.
                            </td>
                          </tr>
                        ) : (
                          intelligence.districts.map((d, idx) => {
                            const empRate = d.employmentRate || 0;
                            return (
                              <tr key={idx} className="hover:bg-[#FAF9F5]/80 transition-colors">
                                <td className="py-3 px-4 font-bold text-[#18324A]">{d.district}</td>
                                <td className="py-3 px-4 text-right font-bold">{d.trainees}</td>
                                <td className="py-3 px-4 text-right">
                                  {d.completionRate !== null ? `${d.completionRate}%` : 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-right text-[#087F8C]">
                                  {d.certificationRate !== null ? `${d.certificationRate}%` : 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                                  {d.employmentRate !== null ? `${d.employmentRate}%` : 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {d.hasRetentionData ? `${d.retentionRate}%` : <span className="text-amber-800 text-[10px]">Pending obs.</span>}
                                </td>
                                <td className="py-3 px-4 text-right text-[#E6A23C] font-semibold">{d.skillGaps}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-[#DCE3E7] rounded-full h-2 overflow-hidden">
                                      <div 
                                        className="bg-[#087F8C] h-full rounded-full transition-all"
                                        style={{ width: `${Math.min(100, Math.max(0, empRate))}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-[#18324A]">{empRate}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 6: SKILL GAPS (Section 17 & 18 - Prioritization by Factual Filters) */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#18324A]">Government Skill Gap Intelligence</h2>
                    <p className="text-xs text-[#5E6B75] mt-1">
                      Aggregated competency deficits identified in longitudinal and employer assessments.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#5E6B75]">Order by:</span>
                    <div className="inline-flex rounded border border-[#DCE3E7] p-0.5 bg-[#FAF9F5] text-xs font-mono">
                      <button
                        onClick={() => setSkillSort('affected')}
                        className={`px-2 py-1 rounded transition-colors ${skillSort === 'affected' ? 'bg-[#18324A] text-white font-bold' : 'text-[#5E6B75]'}`}
                      >
                        Highest Affected
                      </button>
                      <button
                        onClick={() => setSkillSort('gap')}
                        className={`px-2 py-1 rounded transition-colors ${skillSort === 'gap' ? 'bg-[#18324A] text-white font-bold' : 'text-[#5E6B75]'}`}
                      >
                        Largest Gap
                      </button>
                      <button
                        onClick={() => setSkillSort('severity')}
                        className={`px-2 py-1 rounded transition-colors ${skillSort === 'severity' ? 'bg-[#18324A] text-white font-bold' : 'text-[#5E6B75]'}`}
                      >
                        Highest Severity
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#DCE3E7] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#FAF9F5] border-b border-[#DCE3E7] text-[#5E6B75]">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Competency / Skill Area</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Affected Trainees</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Average Observed Score</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Benchmark Required</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Observed Gap</th>
                          <th className="py-2.5 px-4 font-semibold">Severity</th>
                          <th className="py-2.5 px-4 font-semibold">Programme Association</th>
                          <th className="py-2.5 px-4 font-semibold">District Cluster</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE3E7]">
                        {sortedSkillGaps.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-[#5E6B75]">
                              No skill gaps recorded in current observation dataset.
                            </td>
                          </tr>
                        ) : (
                          sortedSkillGaps.map((sg, idx) => (
                            <tr key={idx} className="hover:bg-[#FAF9F5]/80 transition-colors">
                              <td className="py-3 px-4 font-bold text-[#18324A]">{sg.skillName}</td>
                              <td className="py-3 px-4 text-right font-bold text-red-700">{sg.affectedTraineesCount}</td>
                              <td className="py-3 px-4 text-right">{sg.averageScore} / 100</td>
                              <td className="py-3 px-4 text-right text-[#5E6B75]">{sg.benchmarkScore} / 100</td>
                              <td className="py-3 px-4 text-right font-bold text-amber-700">-{sg.gap} pts</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sg.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                                  sg.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {sg.severity}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-[#18324A]">{sg.programme}</td>
                              <td className="py-3 px-4 text-[#5E6B75]">{sg.district}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 7: NON-PLACEMENT (Section 19 - Real NOT_EMPLOYED records) */}
            {activeTab === 'non-placement' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                  <h2 className="text-lg font-bold text-[#18324A]">Non-Placement Reason Intelligence</h2>
                  <p className="text-xs text-[#5E6B75] mt-1">
                    Telemetry derived from NOT_EMPLOYED candidate dossiers and unplaced trainee audit trails.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Summary Metric Card */}
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-[#5E6B75] uppercase">Total Trainees Seeking Placement</div>
                      <div className="text-4xl font-mono font-bold text-[#18324A] mt-2">
                        {intelligence.nonPlacement.totalNotEmployed}
                      </div>
                      <div className="text-xs font-mono text-[#E6A23C] font-semibold mt-1">
                        {intelligence.kpis.nonPlacementRate}% non-placement rate
                      </div>
                    </div>
                    <div className="mt-6 pt-3 border-t border-[#DCE3E7] text-xs text-[#5E6B75] leading-relaxed">
                      Candidates actively enrolled in placement assistance, interview scheduling, or further skill upgrade modules.
                    </div>
                  </div>

                  {/* Reasons Breakdown Table */}
                  <div className="md:col-span-2 bg-white border border-[#DCE3E7] rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-[#DCE3E7] font-mono text-xs font-bold text-[#18324A] uppercase">
                      Reported Reasons from Trainee Registries
                    </div>

                    {intelligence.nonPlacement.reasons.length === 0 ? (
                      <div className="p-8 text-center text-[#5E6B75] font-mono text-xs">
                        No non-placement records logged for the active filter scope.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#DCE3E7]">
                        {intelligence.nonPlacement.reasons.map((r, idx) => (
                          <div key={idx} className="p-4 flex items-center justify-between gap-4 hover:bg-[#FAF9F5]/80 transition-colors">
                            <div className="flex-1">
                              <div className="text-xs font-mono font-bold text-[#18324A]">{r.reason}</div>
                              <div className="mt-1.5 w-full bg-[#DCE3E7] rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-[#E6A23C] h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, r.percentage))}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-right font-mono shrink-0">
                              <span className="text-sm font-bold text-[#18324A]">{r.count}</span>
                              <span className="text-xs text-[#5E6B75] ml-1.5">({r.percentage}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* VIEW 8: ATTRITION (Section 20 - Data Sufficiency Handling) */}
            {activeTab === 'attrition' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                  <h2 className="text-lg font-bold text-[#18324A] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#E6A23C]" />
                    <span>Cohort Attrition & Retention Observations</span>
                  </h2>
                  <p className="text-xs text-[#5E6B75] mt-1">
                    Formal audit of enrollments versus non-completion dropouts across the training lifecycle.
                  </p>
                </div>

                <div className="bg-white border border-[#DCE3E7] rounded-lg p-6">
                  {intelligence.kpis.attrition.hasSufficientData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
                      <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                        <div className="text-[#5E6B75]">Enrolled Trainees</div>
                        <div className="text-2xl font-bold text-[#18324A] mt-1">{intelligence.kpis.attrition.enrolled}</div>
                      </div>
                      <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                        <div className="text-[#5E6B75]">Completed Trainees</div>
                        <div className="text-2xl font-bold text-[#18324A] mt-1">{intelligence.kpis.attrition.completed}</div>
                      </div>
                      <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                        <div className="text-[#5E6B75]">Dropped Records</div>
                        <div className="text-2xl font-bold text-red-700 mt-1">{intelligence.kpis.attrition.dropped}</div>
                      </div>
                      <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                        <div className="text-[#5E6B75]">Observed Dropout Rate</div>
                        <div className="text-2xl font-bold text-[#18324A] mt-1">{intelligence.kpis.attrition.dropoutRate}%</div>
                      </div>
                    </div>

                    {/* Controlled Dropout Reasons Distribution (Section 9 & 10) */}
                    {intelligence.kpis.attrition.reasonsBreakdown && intelligence.kpis.attrition.reasonsBreakdown.length > 0 ? (
                      <div className="mt-6 border border-[#DCE3E7] rounded-lg overflow-hidden">
                        <div className="bg-[#FAF7EE] px-4 py-3 border-b border-[#DCE3E7] flex justify-between items-center">
                          <span className="text-xs font-mono font-bold text-[#16212B]">
                            Observed Dropout Reason Distribution (PostgreSQL Database Records)
                          </span>
                          <span className="text-[11px] font-mono text-[#5E6B75]">
                            {intelligence.kpis.attrition.reasonsBreakdown.length} unique reported reasons
                          </span>
                        </div>
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-[#DCE3E7] bg-[#FAF9F5] text-[#5E6B75]">
                              <th className="py-2.5 px-4 font-semibold uppercase">Dropout Reason</th>
                              <th className="py-2.5 px-4 font-semibold uppercase text-right">Count</th>
                              <th className="py-2.5 px-4 font-semibold uppercase text-right">Percentage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#DCE3E7]">
                            {intelligence.kpis.attrition.reasonsBreakdown.map((rb, idx) => (
                              <tr key={idx} className="hover:bg-[#FAF9F5]">
                                <td className="py-2.5 px-4 font-sans font-medium text-[#16212B]">{rb.reason}</td>
                                <td className="py-2.5 px-4 text-right font-bold text-[#18324A]">{rb.count}</td>
                                <td className="py-2.5 px-4 text-right font-bold text-[#087F8C]">{rb.percentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded text-xs font-mono text-[#5E6B75] text-center">
                        Zero dropout incidents recorded in scope. Cohort completion currently tracking at 100% of non-dropped candidates.
                      </div>
                    )}
                  </div>
                  ) : (
                    <div className="p-8 text-center bg-amber-50/60 border border-amber-200 rounded-lg">
                      <AlertTriangle className="w-8 h-8 text-amber-700 mx-auto mb-2" />
                      <div className="font-mono text-sm font-bold text-amber-900">
                        {intelligence.kpis.attrition.label}
                      </div>
                      <p className="text-xs text-amber-800/80 mt-1 max-w-lg mx-auto">
                        In accordance with NCVET telemetry standards, missing dropout records are not assumed to be zero attrition. Formal dropout telemetry requires provider enrollment disengagement logs.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: DATA QUALITY & COMPLETENESS (Section 14, 15, 16, 18) */}
            {activeTab === 'data-quality' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#18324A]">Outcome Data Completeness & Quality Signals</h2>
                      <p className="text-xs text-[#5E6B75] mt-1">
                        Sovereign verification audit of outcome data availability, evidence thresholds, and documentation completeness.
                      </p>
                    </div>
                    <div className="text-xs font-mono text-[#18324A] bg-[#E8F1F7] px-3 py-1.5 rounded border border-[#B8D5E5]">
                      <strong>Statutory Distinction (Section 15):</strong> Data Coverage ≠ Outcome Rate.
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#DCE3E7] rounded-lg p-6">
                  {/* Coverage Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="text-[#5E6B75]">Employment Outcome Coverage</div>
                      <div className="text-2xl font-bold text-[#18324A] mt-1">
                        {intelligence.dataQuality?.employmentOutcomeCoverage ?? 0}%
                      </div>
                      <div className="text-[10px] text-[#5E6B75] mt-1">Candidates with documented post-training status</div>
                    </div>
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="text-[#5E6B75]">Certification Coverage</div>
                      <div className="text-2xl font-bold text-[#18324A] mt-1">
                        {intelligence.dataQuality?.certificationCoverage ?? 0}%
                      </div>
                      <div className="text-[10px] text-[#5E6B75] mt-1">Issued assessment certificates on ledger</div>
                    </div>
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="text-[#5E6B75]">Follow-Up Verification Coverage</div>
                      <div className="text-2xl font-bold text-[#18324A] mt-1">
                        {intelligence.dataQuality?.followUpCoverage ?? 0}%
                      </div>
                      <div className="text-[10px] text-[#5E6B75] mt-1">Completed longitudinal verification surveys</div>
                    </div>
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="text-[#5E6B75]">Salary History Documentation</div>
                      <div className="text-2xl font-bold text-[#18324A] mt-1">
                        {intelligence.dataQuality?.salaryHistoryCoverage ?? 0}%
                      </div>
                      <div className="text-[10px] text-[#5E6B75] mt-1">Verified pre & post-placement wage entries</div>
                    </div>
                  </div>

                  {/* Comparative distinction box */}
                  <div className="mt-6 p-4 bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg text-xs font-mono space-y-2">
                    <div className="font-bold text-[#16212B] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#087F8C]" />
                      <span>NCVET Telemetry Rule — Data Coverage vs Outcome Rate:</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="p-3 bg-white border border-[#DCE3E7] rounded">
                        <div className="font-bold text-[#18324A]">Outcome Data Coverage: {intelligence.dataQuality?.employmentOutcomeCoverage ?? 0}%</div>
                        <p className="text-[11px] text-[#5E6B75] mt-1">
                          Reflects telemetry completeness. {intelligence.dataQuality?.employmentOutcomeCoverage ?? 0}% of eligible candidates have recorded post-training status in PostgreSQL.
                        </p>
                      </div>
                      <div className="p-3 bg-white border border-[#DCE3E7] rounded">
                        <div className="font-bold text-[#164627]">Employment Outcome Rate: {intelligence.kpis.employmentRate ?? 0}%</div>
                        <p className="text-[11px] text-[#5E6B75] mt-1">
                          Reflects verified programmatic placement. {intelligence.kpis.employmentRate ?? 0}% of eligible candidates achieved authenticated wage, self, or apprenticeship.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Data Quality Signals */}
                  {intelligence.dataQuality?.signals && intelligence.dataQuality.signals.filter(Boolean).length > 0 && (
                    <div className="mt-6 p-4 bg-amber-50/70 border border-amber-200 rounded-lg">
                      <div className="text-xs font-mono font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-700" />
                        <span>Active Telemetry Data Quality Signals:</span>
                      </div>
                      <ul className="space-y-1.5 text-xs font-mono text-amber-800">
                        {intelligence.dataQuality.signals.filter(Boolean).map((sig, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{sig}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 9: INTERVENTIONS (Section 22, 23 & 24 - Closed-Loop Registry) */}
            {activeTab === 'interventions' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#18324A]">Closed-Loop Policy Intervention Registry</h2>
                    <p className="text-xs text-[#5E6B75] mt-1">
                      Data-driven intervention tracking: Signal &rarr; Action Recorded &rarr; Follow-Up &rarr; Re-measurement.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsNewInterventionOpen(true)}
                    className="px-3 py-1.5 bg-[#087F8C] hover:bg-[#087F8C]/90 text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Record Policy Intervention</span>
                  </button>
                </div>

                <div className="bg-white border border-[#DCE3E7] rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-[#DCE3E7] flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-[#18324A] uppercase">
                      Active Intervention Records in PostgreSQL Registry
                    </span>
                    <span className="text-[#5E6B75]">
                      {intelligence.interventions.length} Items Logged
                    </span>
                  </div>

                  {intelligence.interventions.length === 0 ? (
                    <div className="p-8 text-center text-[#5E6B75] font-mono text-xs">
                      No policy review interventions logged. Click "Record Policy Intervention" to log an area for action.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#DCE3E7]">
                      {intelligence.interventions.map((item) => (
                        <div key={item.id} className="p-5 hover:bg-[#FAF9F5]/70 transition-colors">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-[#18324A] text-white rounded font-mono text-[10px] font-bold">
                                {item.targetType}
                              </span>
                              <h3 className="font-bold text-sm text-[#18324A]">
                                {item.targetName}
                              </h3>
                              <span className="text-xs text-[#5E6B75] font-mono">
                                ({item.issueType})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                item.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                                item.status === 'ACTION_RECORDED' ? 'bg-blue-100 text-blue-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {item.status}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedInterventionForUpdate(item);
                                  setUpdateInterventionForm({
                                    status: item.status,
                                    actionTaken: item.actionTaken || '',
                                    followUpDate: item.followUpDate ? item.followUpDate.slice(0, 10) : '',
                                    observedOutcomeNotes: item.observedOutcomeNotes || '',
                                  });
                                }}
                                className="px-2 py-1 text-[11px] font-mono font-semibold text-[#087F8C] hover:bg-[#E7F5F4] rounded border border-[#087F8C]/40 cursor-pointer"
                              >
                                Update Status
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-[#16212B] leading-relaxed mb-3">
                            {item.description}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF9F5] p-3 rounded border border-[#DCE3E7] text-[11px] font-mono">
                            <div>
                              <span className="text-[#5E6B75] block">Action Logged:</span>
                              <span className="font-semibold text-[#18324A]">{item.actionTaken || 'Pending review'}</span>
                            </div>
                            <div>
                              <span className="text-[#5E6B75] block">Follow-Up Date:</span>
                              <span className="font-semibold text-[#18324A]">
                                {item.followUpDate ? new Date(item.followUpDate).toLocaleDateString() : 'Unscheduled'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#5E6B75] block">Re-measurement Observation:</span>
                              <span className="font-semibold text-emerald-800">
                                {item.observedOutcomeNotes || 'Outcome re-measurement pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 10: FOLLOW-UPS (Section 21 - Longitudinal Coverage) */}
            {activeTab === 'follow-ups' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                  <h2 className="text-lg font-bold text-[#18324A]">Longitudinal Follow-up Coverage</h2>
                  <p className="text-xs text-[#5E6B75] mt-1">
                    Aggregate post-placement survey verification coverage across accredited providers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                    <div className="text-xs font-mono font-bold text-[#5E6B75] uppercase">Assigned Surveys</div>
                    <div className="text-3xl font-mono font-bold text-[#18324A] mt-2">
                      {intelligence.kpis.followUps.assigned}
                    </div>
                    <p className="text-xs text-[#5E6B75] mt-1">Total scheduled longitudinal milestones</p>
                  </div>
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                    <div className="text-xs font-mono font-bold text-[#5E6B75] uppercase">Completed & Verified</div>
                    <div className="text-3xl font-mono font-bold text-emerald-700 mt-2">
                      {intelligence.kpis.followUps.completed}
                    </div>
                    <p className="text-xs text-[#5E6B75] mt-1">Successfully recorded 3-party verification</p>
                  </div>
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                    <div className="text-xs font-mono font-bold text-[#5E6B75] uppercase">Pending Verification</div>
                    <div className="text-3xl font-mono font-bold text-amber-700 mt-2">
                      {intelligence.kpis.followUps.pending}
                    </div>
                    <p className="text-xs text-[#5E6B75] mt-1">In progress with training provider</p>
                  </div>
                  <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
                    <div className="text-xs font-mono font-bold text-[#5E6B75] uppercase">Overdue Records</div>
                    <div className="text-3xl font-mono font-bold text-red-700 mt-2">
                      {intelligence.kpis.followUps.overdue}
                    </div>
                    <p className="text-xs text-[#5E6B75] mt-1">Milestones past target observation date</p>
                  </div>
                </div>

                <div className="bg-white border border-[#DCE3E7] rounded-lg p-6">
                  <h3 className="font-mono text-xs font-bold text-[#18324A] uppercase mb-2">
                    National Coverage Ratio
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-[#DCE3E7] rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-[#087F8C] h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, intelligence.kpis.followUps.completionRate || 0))}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-sm text-[#18324A]">
                      {intelligence.kpis.followUps.completionRate || 0}%
                    </span>
                  </div>
                  <p className="text-xs text-[#5E6B75] mt-2">
                    Longitudinal surveys are verified via employer sign-off or EPFO employment active records.
                  </p>
                </div>
              </div>
            )}

          </>
        )}

      </div>

      {/* 4. Methodology & Data Definitions Drawer/Modal (Section 7) */}
      {isMethodologyOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3E7] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3E7] mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#087F8C]" />
                <h3 className="font-bold text-base text-[#18324A]">
                  Institutional Methodology & Metric Definitions
                </h3>
              </div>
              <button 
                onClick={() => setIsMethodologyOpen(false)}
                className="text-[#5E6B75] hover:text-[#16212B] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono leading-relaxed text-[#16212B]">
              <div className="p-3 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                <strong className="text-[#18324A] block mb-1">Non-Causal Telemetry Principle</strong>
                The platform records factual post-training trajectory observations. Unless a dedicated randomized control or econometric evaluation is performed, metrics are labelled:
                <div className="mt-1 text-[#087F8C] font-semibold">
                  &bull; "Outcome recorded after training" (not "Training caused employment")<br />
                  &bull; "Observed salary change" (not "Training raised wage")<br />
                  &bull; "Observed retention" (not "Training ensured job security")
                </div>
              </div>

              <div>
                <strong className="text-[#18324A] block">1. Training Completion Rate</strong>
                <p className="text-[#5E6B75]">
                  Completed training records / eligible enrolled trainee records. Determined by cohort end date or verified course completion certificate.
                </p>
              </div>

              <div>
                <strong className="text-[#18324A] block">2. Certification Rate</strong>
                <p className="text-[#5E6B75]">
                  Verified certificates issued / completed trainees. Assessment records verified by accredited awarding body.
                </p>
              </div>

              <div>
                <strong className="text-[#18324A] block">3. Employment Outcome Rate</strong>
                <p className="text-[#5E6B75]">
                  Trainees with recorded employment outcome / eligible trainees. Encompasses wage employment, verified self-employment, and formal apprenticeships.
                </p>
              </div>

              <div>
                <strong className="text-[#18324A] block">4. 6-Month Retention</strong>
                <p className="text-[#5E6B75]">
                  Trainees with employment duration &ge; 180 days / eligible employed trainees placed at least 180 days prior to observation date. If observation window has not elapsed, displayed as "Insufficient observation data" rather than 0%.
                </p>
              </div>

              <div>
                <strong className="text-[#18324A] block">5. Salary Progression</strong>
                <p className="text-[#5E6B75]">
                  Observed delta between earliest baseline wage and latest current wage for trainees with valid historical salary records. If fewer than 2 salary observations exist, displayed as "Insufficient salary history".
                </p>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setIsMethodologyOpen(false)}
                  className="px-4 py-2 bg-[#18324A] text-white rounded font-bold hover:bg-[#18324A]/90 cursor-pointer"
                >
                  Close Methodology
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Record New Policy Intervention */}
      {isNewInterventionOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3E7] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3E7] mb-4">
              <h3 className="font-bold text-base text-[#18324A]">
                Record Policy Intervention Area
              </h3>
              <button onClick={() => setIsNewInterventionOpen(false)} className="text-[#5E6B75] hover:text-[#16212B]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordInterventionSubmit} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Target Entity Type</label>
                <select
                  value={newIntervention.targetType}
                  onChange={e => setNewIntervention({ ...newIntervention, targetType: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                >
                  <option value="PROGRAMME">Programme</option>
                  <option value="PROVIDER">Training Provider</option>
                  <option value="DISTRICT">District Cluster</option>
                  <option value="SKILL_GAP">Competency Domain</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Target Name / Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Industrial Automation / Centurion Skills"
                  value={newIntervention.targetName}
                  onChange={e => setNewIntervention({ ...newIntervention, targetName: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Observed Issue / Signal Type</label>
                <select
                  value={newIntervention.issueType}
                  onChange={e => setNewIntervention({ ...newIntervention, issueType: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                >
                  <option value="SKILL_DEFICIT">Significant Observed Skill Gap</option>
                  <option value="NON_PLACEMENT_CONCENTRATION">High Non-Placement Concentration</option>
                  <option value="FOLLOW_UP_DEFICIT">Low Follow-up Verification Rate</option>
                  <option value="RETENTION_GAP">Retention Observation Deficit</option>
                  <option value="OTHER_REVIEW">Other Area Requiring Review</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Evidence & Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Factual evidence observed from PostgreSQL telemetry..."
                  value={newIntervention.description}
                  onChange={e => setNewIntervention({ ...newIntervention, description: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Action Logged</label>
                <input
                  type="text"
                  placeholder="e.g. Curriculum update recommended to provider"
                  value={newIntervention.actionTaken}
                  onChange={e => setNewIntervention({ ...newIntervention, actionTaken: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Follow-Up Date</label>
                <input
                  type="date"
                  value={newIntervention.followUpDate}
                  onChange={e => setNewIntervention({ ...newIntervention, followUpDate: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#DCE3E7]">
                <button
                  type="button"
                  onClick={() => setIsNewInterventionOpen(false)}
                  className="px-3 py-1.5 text-[#5E6B75] hover:text-[#16212B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#087F8C] hover:bg-[#087F8C]/90 text-white rounded font-bold cursor-pointer"
                >
                  Save Intervention Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Update Existing Intervention */}
      {selectedInterventionForUpdate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3E7] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3E7] mb-4">
              <div>
                <h3 className="font-bold text-base text-[#18324A]">Update Intervention Record</h3>
                <p className="text-xs text-[#5E6B75]">{selectedInterventionForUpdate.targetName}</p>
              </div>
              <button onClick={() => setSelectedInterventionForUpdate(null)} className="text-[#5E6B75] hover:text-[#16212B]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateInterventionSubmit} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Status</label>
                <select
                  value={updateInterventionForm.status}
                  onChange={e => setUpdateInterventionForm({ ...updateInterventionForm, status: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                >
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="ACTION_RECORDED">ACTION_RECORDED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Action Recorded / Updated</label>
                <input
                  type="text"
                  placeholder="e.g. Supplementary simulation labs deployed"
                  value={updateInterventionForm.actionTaken}
                  onChange={e => setUpdateInterventionForm({ ...updateInterventionForm, actionTaken: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Follow-Up Date</label>
                <input
                  type="date"
                  value={updateInterventionForm.followUpDate}
                  onChange={e => setUpdateInterventionForm({ ...updateInterventionForm, followUpDate: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5E6B75] mb-1">Observed Outcome Re-measurement Notes</label>
                <textarea
                  rows={3}
                  placeholder="Outcome change observed after intervention (e.g. +14% score improvement observed in next assessment)..."
                  value={updateInterventionForm.observedOutcomeNotes}
                  onChange={e => setUpdateInterventionForm({ ...updateInterventionForm, observedOutcomeNotes: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#DCE3E7] rounded p-2 text-[#16212B] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#DCE3E7]">
                <button
                  type="button"
                  onClick={() => setSelectedInterventionForUpdate(null)}
                  className="px-3 py-1.5 text-[#5E6B75] hover:text-[#16212B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#087F8C] hover:bg-[#087F8C]/90 text-white rounded font-bold cursor-pointer"
                >
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
