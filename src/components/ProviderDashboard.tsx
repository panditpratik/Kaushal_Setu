import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ProviderTab } from '../types';
import { 
  providerService, 
  supabase, 
  type ProviderOutcomeIntelligence, 
  type TraineeDossier 
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  RefreshCw, 
  Users, 
  GraduationCap, 
  Briefcase, 
  TrendingUp, 
  Award, 
  Calendar, 
  Clock, 
  Search, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  UserCheck, 
  HelpCircle, 
  Zap, 
  FileText, 
  AlertCircle,
  UserMinus,
  BarChart3,
  Database
} from 'lucide-react';

const CONTROLLED_DROPOUT_REASONS = [
  'Personal reasons',
  'Health/family reasons',
  'Relocation',
  'Employment elsewhere',
  'Financial constraints',
  'Attendance issues',
  'Skill difficulty',
  'Programme mismatch',
  'Other'
];

interface ProviderDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
  activeTab?: ProviderTab;
  onTabChange?: (tab: ProviderTab) => void;
}

export function ProviderDashboard({ 
  onNavigateHome, 
  onSwitchRole, 
  activeTab = 'overview', 
  onTabChange 
}: ProviderDashboardProps) {
  const { profile: authProfile } = useAuth();
  const [data, setData] = useState<ProviderOutcomeIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('all');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => new Date().toLocaleTimeString());
  const [realtimePulse, setRealtimePulse] = useState(false);

  // Trainee Dossier Inspection Modal State
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);
  const [traineeDossier, setTraineeDossier] = useState<TraineeDossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  // Filters for Sub-views
  const [traineeSearch, setTraineeSearch] = useState('');
  const [traineeOutcomeFilter, setTraineeOutcomeFilter] = useState('ALL');
  const [recordProgrammeFilter, setRecordProgrammeFilter] = useState('ALL');
  const [recordStatusFilter, setRecordStatusFilter] = useState('ALL');
  const [recordSearch, setRecordSearch] = useState('');

  // Deploy intervention modal/action state
  const [deployingModule, setDeployingModule] = useState(false);

  // Dropout Recording Modal State (Phase 4 Real PostgreSQL Workflow)
  const [dropoutModalOpen, setDropoutModalOpen] = useState(false);
  const [selectedDropoutTarget, setSelectedDropoutTarget] = useState<{
    enrollmentId: string;
    traineeName: string;
    cohortName: string;
  } | null>(null);
  const [dropoutDate, setDropoutDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dropoutReason, setDropoutReason] = useState('Personal reasons');
  const [dropoutNotes, setDropoutNotes] = useState('');
  const [dropoutSubmitting, setDropoutSubmitting] = useState(false);
  const [dropoutError, setDropoutError] = useState<string | null>(null);

  const handleOpenDropoutModal = (target: { enrollmentId: string; traineeName: string; cohortName: string }) => {
    setSelectedDropoutTarget(target);
    setDropoutDate(new Date().toISOString().split('T')[0]);
    setDropoutReason('Personal reasons');
    setDropoutNotes('');
    setDropoutError(null);
    setDropoutModalOpen(true);
  };

  const handleCloseDropoutModal = () => {
    setDropoutModalOpen(false);
    setSelectedDropoutTarget(null);
    setDropoutError(null);
  };

  const handleConfirmDropout = async () => {
    if (!selectedDropoutTarget) return;
    setDropoutSubmitting(true);
    setDropoutError(null);
    try {
      await providerService.recordDropout({
        enrollmentId: selectedDropoutTarget.enrollmentId,
        dropoutDate,
        reason: dropoutReason,
        notes: dropoutNotes,
      });
      setNotice(`Dropout successfully recorded for ${selectedDropoutTarget.traineeName}. Cohort enrollment and attrition telemetry updated.`);
      handleCloseDropoutModal();
      await loadIntelligence();
      setTimeout(() => setNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to record dropout:', err);
      setDropoutError(err.message || 'Failed to record dropout in database.');
    } finally {
      setDropoutSubmitting(false);
    }
  };

  // Load Provider Outcome Intelligence from PostgreSQL RPC
  const loadIntelligence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const providerId = authProfile?.providerId || 'centurion';
      const result = await providerService.getOutcomeIntelligence(providerId, timeRange);
      setData(result);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load provider outcome intelligence:', err);
      setError(err.message || 'Unable to load real provider outcome intelligence from PostgreSQL.');
    } finally {
      setLoading(false);
    }
  }, [authProfile?.providerId, timeRange]);

  useEffect(() => {
    loadIntelligence();
  }, [loadIntelligence]);

  // Real Supabase Realtime channel subscription
  useEffect(() => {
    const channel = supabase
      .channel('provider-outcome-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employment_records' },
        (payload) => {
          console.log('[Realtime] Employment record change detected:', payload);
          setRealtimePulse(true);
          setNotice('Realtime update: Trainee employment outcome change received from PostgreSQL. Recalculating aggregates...');
          loadIntelligence();
          setTimeout(() => {
            setRealtimePulse(false);
            setNotice(null);
          }, 4500);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trainees' },
        (payload) => {
          console.log('[Realtime] Trainee change detected:', payload);
          setRealtimePulse(true);
          loadIntelligence();
          setTimeout(() => setRealtimePulse(false), 3000);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follow_ups' },
        (payload) => {
          console.log('[Realtime] Follow-up survey change detected:', payload);
          setRealtimePulse(true);
          loadIntelligence();
          setTimeout(() => setRealtimePulse(false), 3000);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cohort_enrollments' },
        (payload) => {
          console.log('[Realtime] Enrollment change detected:', payload);
          setRealtimePulse(true);
          loadIntelligence();
          setTimeout(() => setRealtimePulse(false), 3000);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Provider telemetry channel established.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadIntelligence]);

  // Load individual Trainee Dossier when opened
  const handleOpenTrainee = async (traineeId: string) => {
    setSelectedTraineeId(traineeId);
    setDossierLoading(true);
    setDossierError(null);
    setTraineeDossier(null);
    try {
      const dossier = await providerService.getTraineeDetail(traineeId);
      setTraineeDossier(dossier);
    } catch (err: any) {
      console.error('Failed to load trainee detail:', err);
      setDossierError(err.message || 'Access denied or failed to load trainee detail.');
    } finally {
      setDossierLoading(false);
    }
  };

  const handleCloseTrainee = () => {
    setSelectedTraineeId(null);
    setTraineeDossier(null);
    setDossierError(null);
  };

  const handleDeployIntervention = async (skillName: string) => {
    setDeployingModule(true);
    try {
      const providerId = authProfile?.providerId || 'centurion';
      await providerService.deployModule(providerId, {
        moduleName: `Micro-Credential: Remedial ${skillName} (24h)`,
      });
      setNotice(`Remedial micro-credential for "${skillName}" successfully registered and logged in audit telemetry.`);
      setTimeout(() => setNotice(null), 5000);
    } catch (err: any) {
      setNotice(`Failed to deploy intervention: ${err.message}`);
    } finally {
      setDeployingModule(false);
    }
  };

  // Filtered Trainees
  const filteredTrainees = useMemo(() => {
    if (!data?.trainees) return [];
    return data.trainees.filter((t) => {
      const matchSearch =
        !traineeSearch ||
        t.name.toLowerCase().includes(traineeSearch.toLowerCase()) ||
        (t.district && t.district.toLowerCase().includes(traineeSearch.toLowerCase())) ||
        t.cohortName.toLowerCase().includes(traineeSearch.toLowerCase()) ||
        t.programme.toLowerCase().includes(traineeSearch.toLowerCase());

      const matchOutcome =
        traineeOutcomeFilter === 'ALL' ||
        (traineeOutcomeFilter === 'EMPLOYED' && t.employmentStatus === 'EMPLOYED') ||
        (traineeOutcomeFilter === 'NOT_EMPLOYED' && t.employmentStatus === 'NOT_EMPLOYED') ||
        (traineeOutcomeFilter === 'CERTIFIED' && t.isCertified) ||
        (traineeOutcomeFilter === 'SKILL_GAP' && t.hasSkillGap);

      return matchSearch && matchOutcome;
    });
  }, [data?.trainees, traineeSearch, traineeOutcomeFilter]);

  // Filtered Training Records
  const filteredRecords = useMemo(() => {
    if (!data?.trainingRecords) return [];
    return data.trainingRecords.filter((r) => {
      const matchSearch =
        !recordSearch ||
        r.traineeName.toLowerCase().includes(recordSearch.toLowerCase()) ||
        r.cohortName.toLowerCase().includes(recordSearch.toLowerCase()) ||
        r.courseTitle.toLowerCase().includes(recordSearch.toLowerCase());

      const matchProg = recordProgrammeFilter === 'ALL' || r.courseTitle === recordProgrammeFilter;
      const matchStatus = recordStatusFilter === 'ALL' || r.status.toUpperCase() === recordStatusFilter.toUpperCase();

      return matchSearch && matchProg && matchStatus;
    });
  }, [data?.trainingRecords, recordSearch, recordProgrammeFilter, recordStatusFilter]);

  // Distinct courses for filter
  const distinctCourses = useMemo(() => {
    if (!data?.trainingRecords) return [];
    return Array.from(new Set(data.trainingRecords.map((r) => r.courseTitle)));
  }, [data?.trainingRecords]);

  // Current tab selector helper
  const setTab = (tab: ProviderTab) => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#16212B] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-[#18324A] border-t-transparent animate-spin mb-4" />
        <p className="font-mono text-sm text-[#18324A] font-semibold">
          Executing PostgreSQL Outcome Intelligence Aggregation...
        </p>
        <p className="text-xs font-mono text-[#5E6B75] mt-1">
          Evaluating RLS boundaries, cohort funnels, and real verified metrics
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#16212B] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Outcome Intelligence Query Error</h2>
        <p className="text-sm font-mono text-red-700 max-w-md mb-6">{error}</p>
        <button
          onClick={loadIntelligence}
          className="px-5 py-2.5 bg-[#18324A] text-white rounded font-mono text-sm flex items-center gap-2 hover:bg-[#0F253B] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Database Execution</span>
        </button>
      </div>
    );
  }

  const kpis = data?.kpis;
  const provider = data?.provider;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#16212B] flex flex-col selection:bg-[#18324A] selection:text-white">
      {/* Institutional Provider Sub-Header */}
      <div className="border-b border-[#DCE3E7] bg-[#FAF7EE] px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onNavigateHome}
              title="Return to KaushalSetu Home"
              className="w-9 h-9 rounded bg-[#18324A] hover:bg-[#0F253B] text-white flex items-center justify-center font-serif font-bold text-base shadow-xs transition-colors cursor-pointer"
            >
              क
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm tracking-wide text-[#16212B]">
                  {provider?.name || 'Accredited Training Provider'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#E7F5F4] text-[#087F8C] border border-[#BDE5E2] font-semibold">
                  {provider?.accreditationId || 'NCVET/TP/VERIFIED'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#5E6B75]">
                Accredited Training Provider Telemetry Node · Real PostgreSQL Analytics
              </div>
            </div>
          </div>

          {/* Realtime Telemetry Status & Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSwitchRole('trainee')}
              className="hidden sm:inline-flex px-2 py-1 bg-[#FAF9F5] hover:bg-[#E8F1F7] text-[#18324A] border border-[#DCE3E7] rounded text-[11px] font-mono transition-colors cursor-pointer"
            >
              Trainee View
            </button>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border ${
              realtimePulse 
                ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse' 
                : 'bg-[#D8EEDF] text-[#164627] border-[#B6DBC0]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${realtimePulse ? 'bg-amber-600' : 'bg-[#16803D]'}`} />
              <span>{realtimePulse ? 'Realtime Synchronizing...' : 'PostgreSQL Realtime Telemetry Connected'}</span>
            </div>

            <button
              onClick={loadIntelligence}
              disabled={loading}
              className="p-1.5 rounded border border-[#DCE3E7] bg-white hover:bg-[#F0EFEA] text-[#18324A] transition-colors cursor-pointer"
              title={`Last synced at ${lastRefreshedAt}. Click to refresh.`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Realtime Notice Alert Banner */}
      {notice && (
        <div className="bg-[#E7F5F4] border-b border-[#087F8C]/30 px-4 py-2.5 text-center text-xs font-mono text-[#087F8C] flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-[#087F8C] animate-bounce" />
          <span>{notice}</span>
        </div>
      )}

      {/* In-Page Horizontal Tab Selector & Time Filter Bar */}
      <div className="bg-white border-b border-[#DCE3E7] sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-wrap items-center justify-between gap-3 py-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'programmes', label: 'Programmes' },
              { id: 'trainees', label: 'Trainees' },
              { id: 'training-records', label: 'Training Records' },
              { id: 'outcomes', label: 'Outcomes' },
              { id: 'skills', label: 'Skill Gaps' },
              { id: 'non-placement', label: 'Non-Placement' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id as ProviderTab)}
                  className={`px-3.5 py-1.5 rounded text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#18324A] text-white font-semibold shadow-xs'
                      : 'text-[#5E6B75] hover:text-[#16212B] hover:bg-[#FAF9F5]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Time Filter Query Controller */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-[#5E6B75] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Time Window:</span>
            </span>
            <div className="inline-flex rounded border border-[#DCE3E7] bg-[#FAF9F5] p-0.5">
              {[
                { id: '30d', label: '30d' },
                { id: '90d', label: '90d' },
                { id: '6m', label: '6m' },
                { id: '12m', label: '12m' },
                { id: 'all', label: 'All' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTimeRange(opt.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                    timeRange === opt.id
                      ? 'bg-[#18324A] text-white font-semibold'
                      : 'text-[#5E6B75] hover:text-[#16212B]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Primary KPI Metrics Grid (Derived from real PostgreSQL records) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* 1. TOTAL TRAINEES */}
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">
                    Total Trainees
                  </span>
                  <Users className="w-4 h-4 text-[#18324A]" />
                </div>
                <div className="text-3xl font-serif font-bold text-[#16212B]">
                  {kpis?.totalTrainees ?? 0}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">
                  COUNT(real provider-associated trainees)
                </p>
              </div>

              {/* 2. TRAINING COMPLETED */}
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">
                    Training Completed
                  </span>
                  <GraduationCap className="w-4 h-4 text-[#087F8C]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif font-bold text-[#16212B]">
                    {kpis?.trainingCompleted ?? 0}
                  </span>
                  {kpis?.completionRate !== null && kpis?.completionRate !== undefined && (
                    <span className="text-xs font-mono font-bold text-[#087F8C]">
                      ({kpis.completionRate}%)
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">
                  completed training records / eligible records
                </p>
              </div>

              {/* 3. CERTIFIED */}
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">
                    Certified Trainees
                  </span>
                  <Award className="w-4 h-4 text-[#E6A23C]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif font-bold text-[#16212B]">
                    {kpis?.certified ?? 0}
                  </span>
                  {kpis?.certificationRate !== null && kpis?.certificationRate !== undefined && (
                    <span className="text-xs font-mono font-bold text-[#E6A23C]">
                      ({kpis.certificationRate}%)
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">
                  certified trainees / completed trainees
                </p>
              </div>

              {/* 4. EMPLOYED (Outcomes Recorded) */}
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">
                    Employed (Recorded)
                  </span>
                  <Briefcase className="w-4 h-4 text-[#164627]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif font-bold text-[#164627]">
                    {kpis?.employed ?? 0}
                  </span>
                  {kpis?.employmentRate !== null && kpis?.employmentRate !== undefined && (
                    <span className="text-xs font-mono font-bold text-[#164627]">
                      ({kpis.employmentRate}%)
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">
                  recorded employment outcome after training
                </p>
              </div>

              {/* 5. RETENTION (6M) */}
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">
                    Retention (6-Month)
                  </span>
                  <Clock className="w-4 h-4 text-[#18324A]" />
                </div>
                {kpis?.retention6m?.hasSufficientData ? (
                  <div>
                    <div className="text-3xl font-serif font-bold text-[#16212B]">
                      {kpis.retention6m.rate}%
                    </div>
                    <p className="text-[11px] font-mono text-[#5E6B75] mt-1">
                      {kpis.retention6m.retainedCount} of {kpis.retention6m.eligibleCount} retained after 180 days
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-mono font-semibold text-[#5E6B75] bg-[#FAF9F5] px-2.5 py-1.5 rounded border border-[#DCE3E7] inline-block">
                      Insufficient observation data
                    </div>
                    <p className="text-[11px] font-mono text-[#5E6B75] mt-1">
                      Requires ≥180 elapsed days post-placement
                    </p>
                  </div>
                )}
              </div>

              {/* 6. SKILL GAPS */}
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">
                    Identified Skill Gaps
                  </span>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-3xl font-serif font-bold text-red-700">
                  {kpis?.skillGapsCount ?? 0}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">
                  assessed competencies below benchmark (&lt;80%)
                </p>
              </div>

              {/* 7. FOLLOW-UP COMPLETION */}
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">
                    Follow-Up Completion
                  </span>
                  <UserCheck className="w-4 h-4 text-[#087F8C]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif font-bold text-[#16212B]">
                    {data?.followUps?.completed ?? 0} / {data?.followUps?.assigned ?? 0}
                  </span>
                  {data?.followUps?.completionRate !== null && data?.followUps?.completionRate !== undefined && (
                    <span className="text-xs font-mono font-bold text-[#087F8C]">
                      ({data.followUps.completionRate}%)
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">
                  longitudinal surveys verified in database
                </p>
              </div>

              {/* 8. NON-PLACEMENT */}
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">
                    Non-Placement Outcome
                  </span>
                  <HelpCircle className="w-4 h-4 text-[#5E6B75]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif font-bold text-[#16212B]">
                    {kpis?.notEmployed ?? 0}
                  </span>
                  {kpis?.nonPlacementRate !== undefined && (
                    <span className="text-xs font-mono font-semibold text-[#5E6B75]">
                      ({kpis.nonPlacementRate}% of outcomes)
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">
                  trainees actively seeking or in higher ed
                </p>
              </div>

            </div>

            {/* Observed Salary Progression Card */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE3E7] pb-4 mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#16212B] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#087F8C]" />
                    Observed Salary Progression (Pre vs Post Training)
                  </h3>
                  <p className="text-xs text-[#5E6B75] mt-0.5">
                    Computed from verified baseline profiles and authenticated employment updates.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#5E6B75] bg-[#FAF9F5] px-2.5 py-1 rounded border border-[#DCE3E7]">
                  Statutory Rule: Observed salary change recorded after training. No causal claim implied without econometric baseline.
                </div>
              </div>

              {data?.salaryProgression?.hasSufficientData ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                    <div className="text-xs font-mono text-[#5E6B75] uppercase">Baseline Observed Salary</div>
                    <div className="text-xl font-serif font-bold text-[#16212B] mt-1">
                      ₹{data.salaryProgression.averageBaselineSalary.toLocaleString('en-IN')}/mo
                    </div>
                    <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Recorded prior to course completion</div>
                  </div>

                  <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                    <div className="text-xs font-mono text-[#5E6B75] uppercase">Current Observed Salary</div>
                    <div className="text-xl font-serif font-bold text-[#164627] mt-1">
                      ₹{data.salaryProgression.averageCurrentSalary.toLocaleString('en-IN')}/mo
                    </div>
                    <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Active outcome employment records</div>
                  </div>

                  <div className="p-4 rounded bg-[#E7F5F4] border border-[#BDE5E2]">
                    <div className="text-xs font-mono text-[#087F8C] uppercase font-semibold">Observed Absolute Lift</div>
                    <div className="text-xl font-serif font-bold text-[#087F8C] mt-1">
                      +₹{data.salaryProgression.averageAbsoluteChange.toLocaleString('en-IN')}/mo
                    </div>
                    <div className="text-[10px] font-mono text-[#087F8C] mt-1">Mean nominal wage delta</div>
                  </div>

                  <div className="p-4 rounded bg-[#D8EEDF] border border-[#B6DBC0]">
                    <div className="text-xs font-mono text-[#164627] uppercase font-semibold">Relative Wage Progression</div>
                    <div className="text-xl font-serif font-bold text-[#164627] mt-1">
                      +{data.salaryProgression.averagePercentChange}%
                    </div>
                    <div className="text-[10px] font-mono text-[#164627] mt-1">Based on {data.salaryProgression.eligibleTraineeCount} matched trainees</div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-[#FAF9F5] rounded border border-dashed border-[#DCE3E7]">
                  <p className="text-sm font-mono text-[#5E6B75]">
                    {data?.salaryProgression?.label || 'Insufficient salary history.'}
                  </p>
                  <p className="text-xs text-[#5E6B75] mt-1">
                    At least one completed trainee with both pre-training baseline and verified post-training employment salary is required.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 14 & 17: OUTCOME DATA QUALITY & COMPLETENESS */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE3E7] pb-4 mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#16212B] flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#087F8C]" />
                    Outcome Data Quality & Coverage Telemetry
                  </h3>
                  <p className="text-xs text-[#5E6B75] mt-0.5">
                    Audit of outcome telemetry completeness across provider-associated trainees.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#18324A] bg-[#E8F1F7] px-3 py-1.5 rounded border border-[#B8D5E5]">
                  <strong>Statutory Clarification:</strong> Data Coverage measures records present in PostgreSQL. Outcome Rate measures actual employment / credential achievement.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                  <div className="text-xs font-mono text-[#5E6B75] uppercase">Employment Coverage</div>
                  <div className="text-2xl font-serif font-bold text-[#16212B] mt-1">
                    {data?.dataCompleteness?.employmentOutcomeCoverage ?? 0}%
                  </div>
                  <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Eligible trainees with recorded outcome</div>
                </div>

                <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                  <div className="text-xs font-mono text-[#5E6B75] uppercase">Certification Coverage</div>
                  <div className="text-2xl font-serif font-bold text-[#16212B] mt-1">
                    {data?.dataCompleteness?.certificationCoverage ?? 0}%
                  </div>
                  <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Assessment credentials issued in ledger</div>
                </div>

                <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                  <div className="text-xs font-mono text-[#5E6B75] uppercase">Follow-Up Coverage</div>
                  <div className="text-2xl font-serif font-bold text-[#16212B] mt-1">
                    {data?.dataCompleteness?.followUpCoverage ?? 0}%
                  </div>
                  <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Completed longitudinal verification surveys</div>
                </div>

                <div className="p-4 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                  <div className="text-xs font-mono text-[#5E6B75] uppercase">Salary History Coverage</div>
                  <div className="text-2xl font-serif font-bold text-[#16212B] mt-1">
                    {data?.dataCompleteness?.salaryHistoryCoverage ?? 0}%
                  </div>
                  <div className="text-[10px] font-mono text-[#5E6B75] mt-1">Verified baseline & post-placement wage records</div>
                </div>
              </div>

              {/* Data Quality Signals */}
              {data?.dataCompleteness?.signals && data.dataCompleteness.signals.filter(Boolean).length > 0 && (
                <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-md">
                  <div className="text-xs font-mono font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    Active Data Quality Signals:
                  </div>
                  <ul className="space-y-1 text-xs font-mono text-amber-800">
                    {data.dataCompleteness.signals.filter(Boolean).map((sig, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500">•</span>
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* SECTION 8, 9 & 10: COHORT ATTRITION & DROPOUT ANALYTICS */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE3E7] pb-4 mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#16212B] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#E6A23C]" />
                    Cohort Attrition & Retention Telemetry
                  </h3>
                  <p className="text-xs text-[#5E6B75] mt-0.5">
                    Realtime tracking of cohort enrollments, completions, and recorded trainee dropouts.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#5E6B75] bg-[#FAF9F5] px-2.5 py-1 rounded border border-[#DCE3E7]">
                  {data?.attrition?.hasSufficientData ? 'Active cohort attrition telemetry' : 'Attrition data unavailable'}
                </div>
              </div>

              {data?.attrition?.hasSufficientData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="text-[#5E6B75]">Total Enrolled</div>
                      <div className="text-2xl font-bold text-[#18324A] mt-1">{data.attrition.enrolled}</div>
                      <div className="text-[10px] text-[#5E6B75] mt-1">Eligible cohort enrollments</div>
                    </div>
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="text-[#5E6B75]">Completed Training</div>
                      <div className="text-2xl font-bold text-[#164627] mt-1">{data.attrition.completed}</div>
                      <div className="text-[10px] text-[#5E6B75] mt-1">Graduated or completed milestones</div>
                    </div>
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="text-[#5E6B75]">Recorded Dropouts</div>
                      <div className="text-2xl font-bold text-rose-700 mt-1">{data.attrition.dropped}</div>
                      <div className="text-[10px] text-[#5E6B75] mt-1">Verified dropout events logged</div>
                    </div>
                    <div className="p-4 bg-[#FAF9F5] border border-[#DCE3E7] rounded">
                      <div className="text-[#5E6B75]">Observed Dropout Rate</div>
                      <div className="text-2xl font-bold text-[#18324A] mt-1">{data.attrition.dropoutRate ?? 0}%</div>
                      <div className="text-[10px] text-[#5E6B75] mt-1">Dropped / Enrolled × 100</div>
                    </div>
                  </div>

                  {/* Controlled Reasons Distribution */}
                  {data.attrition.reasonsBreakdown && data.attrition.reasonsBreakdown.length > 0 && (
                    <div className="mt-4 border border-[#DCE3E7] rounded-lg overflow-hidden">
                      <div className="bg-[#FAF7EE] px-4 py-2 border-b border-[#DCE3E7] text-xs font-mono font-bold text-[#16212B]">
                        Dropout Reason Distribution (Real Database Records)
                      </div>
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-[#DCE3E7] bg-[#FAF9F5] text-[#5E6B75]">
                            <th className="py-2 px-4 font-semibold uppercase">Reason</th>
                            <th className="py-2 px-4 font-semibold uppercase text-right">Count</th>
                            <th className="py-2 px-4 font-semibold uppercase text-right">Percentage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DCE3E7]">
                          {data.attrition.reasonsBreakdown.map((rb, idx) => (
                            <tr key={idx} className="hover:bg-[#FAF9F5]">
                              <td className="py-2 px-4 font-sans font-medium text-[#16212B]">{rb.reason}</td>
                              <td className="py-2 px-4 text-right font-bold text-[#18324A]">{rb.count}</td>
                              <td className="py-2 px-4 text-right font-bold text-[#087F8C]">{rb.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center bg-[#FAF9F5] rounded border border-dashed border-[#DCE3E7]">
                  <p className="text-sm font-mono text-[#5E6B75]">
                    Attrition data unavailable for current dataset.
                  </p>
                  <p className="text-xs text-[#5E6B75] mt-1">
                    Providers record trainee dropouts via Training Records to activate cohort retention telemetry.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Programmes Summary Table */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#16212B]">
                    Active Programmes & Cohorts Overview
                  </h3>
                  <p className="text-xs text-[#5E6B75]">
                    Real training programmes registered under this training provider.
                  </p>
                </div>
                <button
                  onClick={() => setTab('programmes')}
                  className="text-xs font-mono text-[#087F8C] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Full Programme Funnels</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {(!data?.programmes || data.programmes.length === 0) ? (
                <div className="p-8 text-center bg-[#FAF9F5] rounded border border-dashed border-[#DCE3E7]">
                  <p className="text-sm font-mono text-[#5E6B75]">
                    No programmes have been recorded for this provider.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-[#DCE3E7] bg-[#FAF9F5] text-[#5E6B75]">
                        <th className="py-2.5 px-3 font-semibold uppercase">Programme / Cohort</th>
                        <th className="py-2.5 px-3 font-semibold uppercase">Sector</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">Enrolled</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">Completed</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">Certified</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">Employed</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">Skill Gaps</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3E7]">
                      {data.programmes.map((prog) => (
                        <tr key={prog.id} className="hover:bg-[#FAF9F5] transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-sans font-bold text-sm text-[#16212B]">
                              {prog.courseTitle}
                            </div>
                            <div className="text-[11px] text-[#5E6B75]">
                              Cohort: {prog.name}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#5E6B75]">{prog.sector}</td>
                          <td className="py-3 px-3 text-right font-bold text-[#16212B]">{prog.enrolled}</td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-[#16212B]">{prog.completed}</span>
                            {prog.completionRate !== null && (
                              <span className="text-[10px] text-[#5E6B75] block">({prog.completionRate}%)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-[#E6A23C]">{prog.certified}</span>
                            {prog.certificationRate !== null && (
                              <span className="text-[10px] text-[#5E6B75] block">({prog.certificationRate}%)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-[#164627]">{prog.employed}</span>
                            {prog.employmentRate !== null && (
                              <span className="text-[10px] text-[#5E6B75] block">({prog.employmentRate}%)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {prog.skillGapsCount > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                                {prog.skillGapsCount} gaps
                              </span>
                            ) : (
                              <span className="text-[#5E6B75]">0</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setTab('programmes')}
                              className="px-2 py-1 rounded bg-[#E8F1F7] hover:bg-[#D5E5F2] text-[#18324A] font-semibold text-[11px] cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PROGRAMMES (With Real Outcome Funnels) */}
        {/* ========================================================= */}
        {activeTab === 'programmes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#16212B]">
                Provider Programmes & Longitudinal Outcome Funnels
              </h2>
              <p className="text-xs text-[#5E6B75] mt-1">
                Visualizing progression from enrollment through completion, certification, post-training employment, and 6-month retention.
              </p>
            </div>

            {(!data?.programmes || data.programmes.length === 0) ? (
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-12 text-center">
                <BookOpen className="w-12 h-12 text-[#5E6B75] mx-auto mb-3" />
                <h3 className="font-serif font-bold text-base text-[#16212B] mb-1">
                  No programmes recorded
                </h3>
                <p className="text-xs font-mono text-[#5E6B75]">
                  No programmes have been recorded for this provider.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {data.programmes.map((prog) => {
                  const funnel = prog.funnel;
                  return (
                    <div key={prog.id} className="bg-white border border-[#DCE3E7] rounded-lg p-6 shadow-xs space-y-5">
                      {/* Programme Header */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE3E7] pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif font-bold text-lg text-[#16212B]">
                              {prog.courseTitle}
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#E8F1F7] text-[#18324A] font-semibold">
                              {prog.sector}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-[#5E6B75] mt-0.5">
                            Cohort: {prog.name} · Started: {prog.startDate} · Status: {prog.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setRecordProgrammeFilter(prog.courseTitle);
                              setTab('training-records');
                            }}
                            className="px-3 py-1.5 rounded border border-[#DCE3E7] text-xs font-mono text-[#18324A] hover:bg-[#FAF9F5] cursor-pointer"
                          >
                            View Enrollments ({prog.enrolled})
                          </button>
                        </div>
                      </div>

                      {/* Outcome Funnel Visualizer */}
                      <div>
                        <div className="text-xs font-mono uppercase tracking-wider text-[#5E6B75] mb-3 font-semibold">
                          Programme Outcome Funnel
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          {/* 1. ENROLLED */}
                          <div className="p-3.5 rounded bg-[#FAF9F5] border border-[#DCE3E7] relative">
                            <div className="text-[10px] font-mono uppercase text-[#5E6B75]">1. Enrolled</div>
                            <div className="text-2xl font-serif font-bold text-[#16212B] mt-1">{funnel.enrolled}</div>
                            <div className="text-[10px] font-mono text-[#5E6B75] mt-1">100% baseline</div>
                          </div>

                          {/* 2. COMPLETED */}
                          <div className="p-3.5 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                            <div className="text-[10px] font-mono uppercase text-[#5E6B75]">2. Completed</div>
                            <div className="text-2xl font-serif font-bold text-[#16212B] mt-1">{funnel.completed}</div>
                            <div className="text-[10px] font-mono text-[#087F8C] font-semibold mt-1">
                              {prog.completionRate !== null ? `${prog.completionRate}% of enrolled` : 'No records'}
                            </div>
                          </div>

                          {/* 3. CERTIFIED */}
                          <div className="p-3.5 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                            <div className="text-[10px] font-mono uppercase text-[#5E6B75]">3. Certified</div>
                            <div className="text-2xl font-serif font-bold text-[#E6A23C] mt-1">{funnel.certified}</div>
                            <div className="text-[10px] font-mono text-[#E6A23C] font-semibold mt-1">
                              {prog.certificationRate !== null ? `${prog.certificationRate}% of completed` : 'No records'}
                            </div>
                          </div>

                          {/* 4. EMPLOYMENT RECORDED */}
                          <div className="p-3.5 rounded bg-[#E7F5F4] border border-[#BDE5E2]">
                            <div className="text-[10px] font-mono uppercase text-[#087F8C] font-semibold">4. Employed</div>
                            <div className="text-2xl font-serif font-bold text-[#164627] mt-1">{funnel.employed}</div>
                            <div className="text-[10px] font-mono text-[#164627] font-semibold mt-1">
                              {prog.employmentRate !== null ? `${prog.employmentRate}% of eligible` : 'No records'}
                            </div>
                          </div>

                          {/* 5. RETAINED (6M) */}
                          <div className="p-3.5 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                            <div className="text-[10px] font-mono uppercase text-[#5E6B75]">5. Retained (6M)</div>
                            {funnel.hasRetentionData ? (
                              <>
                                <div className="text-2xl font-serif font-bold text-[#16212B] mt-1">{funnel.retained}</div>
                                <div className="text-[10px] font-mono text-[#164627] font-semibold mt-1">
                                  {funnel.employed > 0 ? `${Math.round((funnel.retained / funnel.employed) * 100)}% retained` : '0%'}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-xs font-mono font-semibold text-[#5E6B75] mt-2">
                                  Not enough data
                                </div>
                                <div className="text-[10px] font-mono text-[#5E6B75] mt-1">
                                  &lt;180 days elapsed
                                </div>
                              </>
                            )}
                          </div>

                          {/* 6. SALARY PROGRESSION */}
                          <div className="p-3.5 rounded bg-[#D8EEDF] border border-[#B6DBC0]">
                            <div className="text-[10px] font-mono uppercase text-[#164627] font-semibold">6. Wage Growth</div>
                            {data.salaryProgression?.hasSufficientData ? (
                              <>
                                <div className="text-xl font-serif font-bold text-[#164627] mt-1">
                                  +{data.salaryProgression.averagePercentChange}%
                                </div>
                                <div className="text-[10px] font-mono text-[#164627] mt-1">
                                  Observed lift
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-xs font-mono font-semibold text-[#5E6B75] mt-2">
                                  Not enough data
                                </div>
                                <div className="text-[10px] font-mono text-[#5E6B75] mt-1">
                                  Insufficient history
                                </div>
                              </>
                            )}
                          </div>

                        </div>
                      </div>

                      {/* Funnel Stage Explanatory Footnote */}
                      <div className="text-[11px] font-mono text-[#5E6B75] bg-[#FAF9F5] p-3 rounded border border-[#DCE3E7]">
                        * Distinction rule: &quot;Not enough data&quot; is displayed when elapsed observation time (&lt;180 days) or baseline records are insufficient, preventing manufactured or misleading 0% values.
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TRAINEES (Subject to Strict Provider RLS) */}
        {/* ========================================================= */}
        {activeTab === 'trainees' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#16212B]">
                  Associated Trainees Registry
                </h2>
                <p className="text-xs text-[#5E6B75] mt-1">
                  Provider-associated trainees with strict database-level RLS isolation and DPDP-compliant minimal data exposure.
                </p>
              </div>
              <div className="text-xs font-mono text-[#5E6B75]">
                Showing {filteredTrainees.length} of {data?.trainees?.length || 0} trainees
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#5E6B75]" />
                <input
                  type="text"
                  placeholder="Search by trainee name, district, or programme..."
                  value={traineeSearch}
                  onChange={(e) => setTraineeSearch(e.target.value)}
                  className="w-full text-xs font-mono bg-transparent border-none focus:outline-none"
                />
                {traineeSearch && (
                  <button onClick={() => setTraineeSearch('')} className="text-[#5E6B75] hover:text-[#16212B] cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#5E6B75]">Status:</span>
                <select
                  value={traineeOutcomeFilter}
                  onChange={(e) => setTraineeOutcomeFilter(e.target.value)}
                  className="text-xs font-mono bg-[#FAF9F5] border border-[#DCE3E7] rounded px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="EMPLOYED">Employed</option>
                  <option value="NOT_EMPLOYED">Not Employed</option>
                  <option value="CERTIFIED">Certified</option>
                  <option value="SKILL_GAP">Has Skill Gap</option>
                </select>
              </div>
            </div>

            {/* Trainees Table */}
            {filteredTrainees.length === 0 ? (
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-12 text-center">
                <Users className="w-12 h-12 text-[#5E6B75] mx-auto mb-3" />
                <h3 className="font-serif font-bold text-base text-[#16212B] mb-1">
                  No trainee records found
                </h3>
                <p className="text-xs font-mono text-[#5E6B75]">
                  No trainee records are currently associated with this provider matching your filter criteria.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-[#DCE3E7] rounded-lg shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-[#DCE3E7] bg-[#FAF9F5] text-[#5E6B75]">
                        <th className="py-3 px-4 font-semibold uppercase">Trainee Name</th>
                        <th className="py-3 px-4 font-semibold uppercase">District</th>
                        <th className="py-3 px-4 font-semibold uppercase">Programme / Cohort</th>
                        <th className="py-3 px-4 font-semibold uppercase">Training Status</th>
                        <th className="py-3 px-4 font-semibold uppercase">Certification</th>
                        <th className="py-3 px-4 font-semibold uppercase">Employment Outcome</th>
                        <th className="py-3 px-4 font-semibold uppercase">Skill Gaps</th>
                        <th className="py-3 px-4 font-semibold uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3E7]">
                      {filteredTrainees.map((t) => (
                        <tr key={t.id} className="hover:bg-[#FAF9F5] transition-colors">
                          <td className="py-3.5 px-4 font-sans font-bold text-sm text-[#16212B]">
                            {t.name}
                          </td>
                          <td className="py-3.5 px-4 text-[#5E6B75]">{t.district || '—'}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#16212B]">{t.programme}</div>
                            <div className="text-[11px] text-[#5E6B75]">{t.cohortName}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              t.trainingStatus === 'DROPPED'
                                ? 'bg-rose-100 text-rose-800'
                                : t.trainingStatus === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {t.trainingStatus}
                            </span>
                            {t.dropoutReason && (
                              <div className="text-[10px] text-rose-700 mt-0.5 truncate max-w-[140px]" title={t.dropoutReason}>
                                {t.dropoutReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {t.isCertified ? (
                              <span className="text-[#E6A23C] font-semibold flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" /> Certified
                              </span>
                            ) : (
                              <span className="text-[#5E6B75]">Pending</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {t.employmentStatus === 'EMPLOYED' ? (
                              <div>
                                <span className="text-[#164627] font-semibold bg-[#D8EEDF] px-2 py-0.5 rounded text-[11px]">
                                  Employed
                                </span>
                                {t.jobTitle && (
                                  <div className="text-[10px] text-[#5E6B75] mt-0.5 truncate max-w-[160px]">
                                    {t.jobTitle}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="text-[#5E6B75] bg-[#FAF9F5] border border-[#DCE3E7] px-2 py-0.5 rounded text-[11px]">
                                  {t.employmentStatus || 'Not Recorded'}
                                </span>
                                {t.unemploymentReason && (
                                  <div className="text-[10px] text-[#5E6B75] mt-0.5 truncate max-w-[160px]">
                                    {t.unemploymentReason}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {t.skillGapCount > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                                {t.skillGapCount} gap{t.skillGapCount > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {t.trainingStatus !== 'DROPPED' && (
                                <button
                                  onClick={() => handleOpenDropoutModal({
                                    enrollmentId: (t as any).enrollmentId || t.id,
                                    traineeName: t.name,
                                    cohortName: t.cohortName,
                                  })}
                                  className="px-2 py-1 rounded border border-[#DCE3E7] hover:border-red-300 hover:bg-red-50 text-red-700 text-[11px] font-mono font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Record Trainee Dropout"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  <span>Dropout</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenTrainee(t.id)}
                                className="px-2.5 py-1.5 rounded bg-[#18324A] hover:bg-[#0F253B] text-white text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                              >
                                Inspect
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TRAINING RECORDS (Direct Enrollment Registry) */}
        {/* ========================================================= */}
        {activeTab === 'training-records' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#16212B]">
                  Training Enrollment & Assessment Records
                </h2>
                <p className="text-xs text-[#5E6B75] mt-1">
                  Granular registry of cohort enrollments, course milestones, and certification records.
                </p>
              </div>
              <div className="text-xs font-mono text-[#5E6B75]">
                {filteredRecords.length} records found
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 shadow-xs flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#5E6B75]" />
                <input
                  type="text"
                  placeholder="Search trainee name, cohort, or course..."
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  className="w-full text-xs font-mono bg-transparent border-none focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#5E6B75]">Course:</span>
                <select
                  value={recordProgrammeFilter}
                  onChange={(e) => setRecordProgrammeFilter(e.target.value)}
                  className="text-xs font-mono bg-[#FAF9F5] border border-[#DCE3E7] rounded px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="ALL">All Courses</option>
                  {distinctCourses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#5E6B75]">Status:</span>
                <select
                  value={recordStatusFilter}
                  onChange={(e) => setRecordStatusFilter(e.target.value)}
                  className="text-xs font-mono bg-[#FAF9F5] border border-[#DCE3E7] rounded px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ENROLLED">Enrolled</option>
                  <option value="DROPPED">Dropped</option>
                </select>
              </div>
            </div>

            {/* Records Table */}
            {filteredRecords.length === 0 ? (
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-12 text-center">
                <FileText className="w-12 h-12 text-[#5E6B75] mx-auto mb-3" />
                <h3 className="font-serif font-bold text-base text-[#16212B] mb-1">
                  No training records found
                </h3>
                <p className="text-xs font-mono text-[#5E6B75]">
                  No training enrollment records match the selected filters.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-[#DCE3E7] rounded-lg shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-[#DCE3E7] bg-[#FAF9F5] text-[#5E6B75]">
                        <th className="py-3 px-4 font-semibold uppercase">Enrolled Date</th>
                        <th className="py-3 px-4 font-semibold uppercase">Trainee</th>
                        <th className="py-3 px-4 font-semibold uppercase">Course Title</th>
                        <th className="py-3 px-4 font-semibold uppercase">Cohort</th>
                        <th className="py-3 px-4 font-semibold uppercase">Sector</th>
                        <th className="py-3 px-4 font-semibold uppercase">Status</th>
                        <th className="py-3 px-4 font-semibold uppercase">Certification</th>
                        <th className="py-3 px-4 font-semibold uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3E7]">
                      {filteredRecords.map((r) => (
                        <tr key={r.enrollmentId} className="hover:bg-[#FAF9F5] transition-colors">
                          <td className="py-3 px-4 text-[#5E6B75]">{r.enrolledAt}</td>
                          <td className="py-3 px-4 font-sans font-bold text-sm text-[#16212B]">{r.traineeName}</td>
                          <td className="py-3 px-4 font-semibold text-[#16212B]">{r.courseTitle}</td>
                          <td className="py-3 px-4 text-[#5E6B75]">{r.cohortName}</td>
                          <td className="py-3 px-4 text-[#5E6B75]">{r.sector}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              r.status === 'DROPPED'
                                ? 'bg-rose-100 text-rose-800'
                                : r.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {r.status}
                            </span>
                            {r.dropoutReason && (
                              <div className="text-[10px] text-rose-700 mt-0.5 truncate max-w-[140px]" title={r.dropoutReason}>
                                {r.dropoutReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {r.isCertified ? (
                              <div className="text-[#E6A23C] font-semibold flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" />
                                <span>{r.certificateNumber || 'Certified'}</span>
                              </div>
                            ) : (
                              <span className="text-[#5E6B75]">Pending Assessment</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {r.status === 'DROPPED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800" title={`Reason: ${r.dropoutReason || 'Logged'}`}>
                                <UserMinus className="w-3 h-3" />
                                <span>Dropped</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenDropoutModal({
                                  enrollmentId: r.enrollmentId,
                                  traineeName: r.traineeName,
                                  cohortName: r.cohortName,
                                })}
                                className="px-2.5 py-1 rounded border border-[#DCE3E7] hover:border-red-300 hover:bg-red-50 text-red-700 text-[11px] font-mono font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Record Trainee Dropout"
                              >
                                <UserMinus className="w-3 h-3" />
                                <span>Record Dropout</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: OUTCOMES (Verified Longitudinal Outcomes) */}
        {/* ========================================================= */}
        {activeTab === 'outcomes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#16212B]">
                Employment & Longitudinal Outcome Intelligence
              </h2>
              <p className="text-xs text-[#5E6B75] mt-1">
                Verified employment outcomes recorded post-training across wage, self-employment, and apprenticeships.
              </p>
            </div>

            {/* Outcome Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">Wage Employment</div>
                <div className="text-3xl font-serif font-bold text-[#164627] mt-2">
                  {kpis?.wageEmployed ?? 0}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">Formally contracted employment</p>
              </div>

              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">Self-Employed / Enterprise</div>
                <div className="text-3xl font-serif font-bold text-[#087F8C] mt-2">
                  {kpis?.selfEmployed ?? 0}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">Micro-enterprise or independent practice</p>
              </div>

              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">Apprenticeships (NAPS)</div>
                <div className="text-3xl font-serif font-bold text-[#E6A23C] mt-2">
                  {kpis?.apprenticeship ?? 0}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">National Apprenticeship Promotion Scheme</p>
              </div>

              <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs">
                <div className="text-xs font-mono uppercase tracking-wider text-[#5E6B75]">Not Currently Employed</div>
                <div className="text-3xl font-serif font-bold text-[#5E6B75] mt-2">
                  {kpis?.notEmployed ?? 0}
                </div>
                <p className="text-[11px] font-mono text-[#5E6B75] mt-1">Seeking work, education, or location bound</p>
              </div>
            </div>

            {/* Employment Rate Breakdown Bar */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base text-[#16212B]">
                  Outcome Distribution Among Completed Trainees
                </h3>
                <span className="text-xs font-mono text-[#5E6B75]">
                  Sample: {kpis?.trainingCompleted ?? 0} completed trainees
                </span>
              </div>

              {/* Stacked Distribution Bar */}
              {(kpis?.trainingCompleted || 0) > 0 ? (
                <div className="space-y-2">
                  <div className="h-6 w-full rounded-full overflow-hidden flex bg-[#FAF9F5] border border-[#DCE3E7]">
                    <div 
                      style={{ width: `${Math.round(((kpis?.wageEmployed || 0) / (kpis?.trainingCompleted || 1)) * 100)}%` }} 
                      className="bg-[#164627] h-full" 
                      title={`Wage Employed: ${kpis?.wageEmployed || 0}`}
                    />
                    <div 
                      style={{ width: `${Math.round(((kpis?.selfEmployed || 0) / (kpis?.trainingCompleted || 1)) * 100)}%` }} 
                      className="bg-[#087F8C] h-full" 
                      title={`Self Employed: ${kpis?.selfEmployed || 0}`}
                    />
                    <div 
                      style={{ width: `${Math.round(((kpis?.apprenticeship || 0) / (kpis?.trainingCompleted || 1)) * 100)}%` }} 
                      className="bg-[#E6A23C] h-full" 
                      title={`Apprenticeship: ${kpis?.apprenticeship || 0}`}
                    />
                    <div 
                      style={{ width: `${Math.round(((kpis?.notEmployed || 0) / (kpis?.trainingCompleted || 1)) * 100)}%` }} 
                      className="bg-[#9EACB5] h-full" 
                      title={`Not Employed: ${kpis?.notEmployed || 0}`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[#5E6B75] pt-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#164627]" /> Wage Employed ({kpis?.wageEmployed || 0})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#087F8C]" /> Self Employed ({kpis?.selfEmployed || 0})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E6A23C]" /> Apprenticeship ({kpis?.apprenticeship || 0})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#9EACB5]" /> Non-Placement ({kpis?.notEmployed || 0})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-[#FAF9F5] rounded border border-dashed border-[#DCE3E7]">
                  <p className="text-xs font-mono text-[#5E6B75]">
                    No employment outcomes have been recorded yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: SKILL GAPS (Aggregated Competency Intelligence) */}
        {/* ========================================================= */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#16212B]">
                  Aggregated Skill Gap & Deficiency Intelligence
                </h2>
                <p className="text-xs text-[#5E6B75] mt-1">
                  Derived from real workplace assessments and post-training evaluations across provider cohorts.
                </p>
              </div>
              <div className="text-xs font-mono text-[#5E6B75]">
                {data?.skillGaps?.length || 0} deficient competencies identified
              </div>
            </div>

            {(!data?.skillGaps || data.skillGaps.length === 0) ? (
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-serif font-bold text-base text-[#16212B] mb-1">
                  No skill gaps recorded
                </h3>
                <p className="text-xs font-mono text-[#5E6B75]">
                  No skill gaps have been identified from the available assessments.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.skillGaps.map((sg, idx) => {
                  const isCritical = sg.severity === 'CRITICAL' || sg.gap > 20;
                  return (
                    <div key={idx} className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif font-bold text-base text-[#16212B]">
                              {sg.skillName}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isCritical ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {sg.severity}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-[#5E6B75] mt-0.5">
                            Affected Trainees: <span className="font-bold text-[#16212B]">{sg.affectedTraineesCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Comparison Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-[#5E6B75]">Observed Average: <span className="font-bold text-[#16212B]">{sg.averageScore}%</span></span>
                          <span className="text-[#5E6B75]">Required Benchmark: <span className="font-bold text-[#16212B]">{sg.benchmarkScore}%</span></span>
                        </div>
                        <div className="h-3 w-full bg-[#FAF9F5] rounded-full overflow-hidden border border-[#DCE3E7]">
                          <div
                            style={{ width: `${sg.averageScore}%` }}
                            className={`h-full ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                          />
                        </div>
                        <div className="text-right text-[11px] font-mono text-red-700 font-semibold">
                          Deficit Gap: -{sg.gap}%
                        </div>
                      </div>

                      {/* Recommended Intervention */}
                      <div className="p-3 rounded bg-[#FAF9F5] border border-[#DCE3E7] space-y-2">
                        <div className="text-[11px] font-mono text-[#5E6B75] uppercase font-semibold">
                          Recommended Remedial Action:
                        </div>
                        <p className="text-xs text-[#16212B]">
                          {sg.recommendedIntervention}
                        </p>
                        <button
                          onClick={() => handleDeployIntervention(sg.skillName)}
                          disabled={deployingModule}
                          className="w-full mt-2 py-1.5 px-3 rounded bg-[#18324A] hover:bg-[#0F253B] text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Deploy Remedial Micro-Credential</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: NON-PLACEMENT (Real Reasons Breakdown) */}
        {/* ========================================================= */}
        {activeTab === 'non-placement' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#16212B]">
                Non-Placement Analysis & Root Cause Breakdown
              </h2>
              <p className="text-xs text-[#5E6B75] mt-1">
                Aggregated reasons for trainees not currently recorded in employment, based on authentic trainee survey disclosures.
              </p>
            </div>

            {/* High-level Count Card */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono uppercase text-[#5E6B75]">Total Non-Employed Candidates</div>
                <div className="text-3xl font-serif font-bold text-[#16212B] mt-1">
                  {data?.nonPlacement?.totalNonEmployed ?? 0}
                </div>
              </div>
              <div className="text-xs font-mono text-[#5E6B75] max-w-sm">
                Every record corresponds to an authentic candidate with an active or pending longitudinal follow-up.
              </div>
            </div>

            {/* Reasons Distribution */}
            {(!data?.nonPlacement?.reasonsBreakdown || data.nonPlacement.reasonsBreakdown.length === 0) ? (
              <div className="bg-white border border-[#DCE3E7] rounded-lg p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-serif font-bold text-base text-[#16212B] mb-1">
                  No non-placement records
                </h3>
                <p className="text-xs font-mono text-[#5E6B75]">
                  All completed trainees currently have verified employment outcomes.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white border border-[#DCE3E7] rounded-lg p-6 shadow-xs">
                  <h3 className="font-serif font-bold text-base text-[#16212B] mb-4">
                    Reported Causes for Non-Placement
                  </h3>
                  <div className="space-y-3">
                    {data.nonPlacement.reasonsBreakdown.map((r, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="font-semibold text-[#16212B]">{r.reason}</span>
                          <span className="text-[#5E6B75]">{r.count} trainees ({r.percentage}%)</span>
                        </div>
                        <div className="h-2.5 w-full bg-[#FAF9F5] rounded-full overflow-hidden border border-[#DCE3E7]">
                          <div
                            style={{ width: `${r.percentage}%` }}
                            className="h-full bg-[#087F8C]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Candidate List in Non-Placement */}
                <div className="bg-white border border-[#DCE3E7] rounded-lg shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#DCE3E7] bg-[#FAF9F5]">
                    <h3 className="font-serif font-bold text-sm text-[#16212B]">
                      Trainees in Active Follow-Up Pipeline
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-[#DCE3E7] bg-[#FAF9F5] text-[#5E6B75]">
                          <th className="py-2.5 px-4 font-semibold uppercase">Candidate</th>
                          <th className="py-2.5 px-4 font-semibold uppercase">Programme</th>
                          <th className="py-2.5 px-4 font-semibold uppercase">District</th>
                          <th className="py-2.5 px-4 font-semibold uppercase">Reported Reason</th>
                          <th className="py-2.5 px-4 font-semibold uppercase">Disclosed Notes</th>
                          <th className="py-2.5 px-4 font-semibold uppercase text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE3E7]">
                        {data.nonPlacement.trainees.map((t) => (
                          <tr key={t.id} className="hover:bg-[#FAF9F5] transition-colors">
                            <td className="py-3 px-4 font-sans font-bold text-sm text-[#16212B]">{t.name}</td>
                            <td className="py-3 px-4 text-[#5E6B75]">{t.programme}</td>
                            <td className="py-3 px-4 text-[#5E6B75]">{t.district || '—'}</td>
                            <td className="py-3 px-4 font-semibold text-[#18324A]">{t.reason}</td>
                            <td className="py-3 px-4 text-[#5E6B75] max-w-[220px] truncate">{t.notes || '—'}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleOpenTrainee(t.id)}
                                className="px-2.5 py-1 rounded bg-[#E8F1F7] hover:bg-[#D5E5F2] text-[#18324A] font-semibold text-[11px] cursor-pointer"
                              >
                                View Dossier
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* TRAINEE DOSSIER INSPECTION MODAL (Read-Only Authorized) */}
      {/* ========================================================= */}
      {selectedTraineeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#DCE3E7] shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#DCE3E7] flex items-center justify-between bg-[#FAF7EE]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                  Authorized Institutional Trainee Dossier
                </span>
                <h3 className="font-serif font-bold text-lg text-[#16212B]">
                  {traineeDossier?.trainee?.name || 'Loading Candidate Details...'}
                </h3>
              </div>
              <button
                onClick={handleCloseTrainee}
                className="p-1.5 rounded-full hover:bg-[#EAE7DC] text-[#5E6B75] hover:text-[#16212B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs font-mono">
              {dossierLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#18324A] border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-[#5E6B75]">Authorizing and fetching verified candidate record from PostgreSQL...</p>
                </div>
              ) : dossierError ? (
                <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700">
                  <p className="font-bold">Access Verification Error:</p>
                  <p>{dossierError}</p>
                </div>
              ) : traineeDossier ? (
                <>
                  {/* Notice of DPDP compliance */}
                  <div className="bg-[#FAF9F5] border border-[#DCE3E7] p-3 rounded text-[11px] text-[#5E6B75] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#087F8C] shrink-0" />
                    <span>
                      DPDP Compliance: Trainee is the sole authoritative owner of outcome updates. Provider access is read-only.
                    </span>
                  </div>

                  {/* Section 1: Identity & Demographics */}
                  <div className="space-y-2">
                    <h4 className="font-serif font-bold text-sm text-[#16212B]">1. Profile & Demographics</h4>
                    <div className="grid grid-cols-2 gap-3 p-3 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                      <div>
                        <span className="text-[#5E6B75] block text-[10px]">District / State</span>
                        <span className="font-semibold text-[#16212B]">
                          {traineeDossier.trainee?.district || '—'}, {traineeDossier.trainee?.state || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5E6B75] block text-[10px]">Education</span>
                        <span className="font-semibold text-[#16212B]">{traineeDossier.trainee?.education || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#5E6B75] block text-[10px]">DPDP Consent</span>
                        <span className="text-emerald-700 font-semibold">{traineeDossier.trainee?.consentStatus || 'EXPLICIT_GRANTED'}</span>
                      </div>
                      <div>
                        <span className="text-[#5E6B75] block text-[10px]">Baseline Salary</span>
                        <span className="font-semibold text-[#16212B]">
                          {traineeDossier.salaryProgression?.baselineSalary 
                            ? `₹${traineeDossier.salaryProgression.baselineSalary.toLocaleString('en-IN')}/mo` 
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Training & Enrollment */}
                  <div className="space-y-2">
                    <h4 className="font-serif font-bold text-sm text-[#16212B]">2. Training & Enrollment</h4>
                    {traineeDossier.trainingHistory && traineeDossier.trainingHistory.length > 0 ? (
                      <div className="space-y-2">
                        {traineeDossier.trainingHistory.map((th: any, idx: number) => (
                          <div key={idx} className="p-3 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                            <div className="font-bold text-[#16212B]">{th.programme || 'Skilling Programme'}</div>
                            <div className="text-[11px] text-[#5E6B75]">
                              Partner: {th.providerName || 'Centurion'} · Enrolled: {th.enrolledAt} · Status: <span className="font-bold text-[#18324A]">{th.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#5E6B75]">No training history recorded.</p>
                    )}
                  </div>

                  {/* Section 3: Certifications */}
                  <div className="space-y-2">
                    <h4 className="font-serif font-bold text-sm text-[#16212B]">3. Assessment & Certifications</h4>
                    {traineeDossier.certifications && traineeDossier.certifications.length > 0 ? (
                      <div className="space-y-2">
                        {traineeDossier.certifications.map((c: any, idx: number) => (
                          <div key={idx} className="p-3 rounded bg-[#FAF9F5] border border-[#DCE3E7] flex items-center justify-between">
                            <div>
                              <div className="font-bold text-[#16212B]">{c.name}</div>
                              <div className="text-[11px] text-[#5E6B75]">
                                Issued: {c.issuedAt} · Credential: {c.certificateNumber}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                              {c.status || 'ACTIVE'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#5E6B75]">No certifications registered yet.</p>
                    )}
                  </div>

                  {/* Section 4: Current Employment Outcome */}
                  <div className="space-y-2">
                    <h4 className="font-serif font-bold text-sm text-[#16212B]">4. Employment Outcome</h4>
                    {traineeDossier.activeEmployment ? (
                      <div className="p-3 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-sm text-[#164627]">{traineeDossier.activeEmployment.jobTitle}</span>
                            <div className="text-[11px] text-[#5E6B75]">
                              Employer: {traineeDossier.activeEmployment.employerName} · Type: {traineeDossier.activeEmployment.employmentType || 'Formal Contract'}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                            VERIFIED EMPLOYED
                          </span>
                        </div>
                        {traineeDossier.activeEmployment.monthlySalary && (
                          <div className="text-xs font-bold text-[#164627] mt-1">
                            Verified Salary: ₹{traineeDossier.activeEmployment.monthlySalary.toLocaleString('en-IN')}/mo
                          </div>
                        )}
                      </div>
                    ) : traineeDossier.employmentRecords && traineeDossier.employmentRecords.length > 0 ? (
                      <div className="space-y-2">
                        {traineeDossier.employmentRecords.map((e: any, idx: number) => (
                          <div key={idx} className="p-3 rounded bg-[#FAF9F5] border border-[#DCE3E7]">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-bold text-sm text-[#164627]">{e.jobTitle || 'Employed'}</span>
                                <div className="text-[11px] text-[#5E6B75]">
                                  Employer: {e.employerName || '—'} · Sector: {e.employmentType || 'Formal'}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                                ACTIVE
                              </span>
                            </div>
                            {e.monthlySalary && (
                              <div className="text-xs font-bold text-[#164627] mt-1">
                                Verified Salary: ₹{e.monthlySalary.toLocaleString('en-IN')}/mo
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded bg-[#FAF9F5] border border-[#DCE3E7] text-[#5E6B75]">
                        Status: <span className="font-bold text-[#16212B]">{traineeDossier.trainee?.employmentStatus || 'NOT_EMPLOYED'}</span>
                        {traineeDossier.trainee?.unemploymentReason && (
                          <div className="mt-1">Reported Reason: {traineeDossier.trainee.unemploymentReason}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 5: Skill Gaps */}
                  <div className="space-y-2">
                    <h4 className="font-serif font-bold text-sm text-[#16212B]">5. Identified Skill Deficits</h4>
                    {traineeDossier.skillGaps && traineeDossier.skillGaps.length > 0 ? (
                      <div className="space-y-2">
                        {traineeDossier.skillGaps.map((sg: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded bg-red-50 border border-red-200 flex justify-between items-center">
                            <div>
                              <div className="font-bold text-red-900">{sg.skillName}</div>
                              <div className="text-[10px] text-red-700">
                                Overall Score: {sg.overallScore}% · Assessor: {sg.assessorType || 'Standard'}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-red-200 text-red-900 font-bold text-[10px]">
                              {sg.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-emerald-700 font-semibold">No skill gaps identified for this candidate.</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#DCE3E7] bg-[#FAF7EE] flex justify-end">
              <button
                onClick={handleCloseTrainee}
                className="px-4 py-2 bg-[#18324A] hover:bg-[#0F253B] text-white rounded text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* DROPOUT RECORDING MODAL (Phase 4 Real PostgreSQL Workflow) */}
      {/* ========================================================= */}
      {dropoutModalOpen && selectedDropoutTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE3E7] rounded-lg shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#18324A] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-rose-300" />
                <h3 className="font-serif font-bold text-sm">Record Trainee Dropout</h3>
              </div>
              <button
                onClick={handleCloseDropoutModal}
                disabled={dropoutSubmitting}
                className="text-[#DCE3E7] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-4">
              {dropoutError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs font-mono text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{dropoutError}</span>
                </div>
              )}

              {/* Trainee & Cohort Information */}
              <div className="p-3.5 bg-[#FAF9F5] border border-[#DCE3E7] rounded-md space-y-1">
                <div className="text-xs font-mono text-[#5E6B75]">Trainee Name:</div>
                <div className="font-sans font-bold text-sm text-[#16212B]">{selectedDropoutTarget.traineeName}</div>
                <div className="text-xs font-mono text-[#5E6B75] mt-1">Cohort:</div>
                <div className="text-xs font-mono text-[#18324A] font-semibold">{selectedDropoutTarget.cohortName}</div>
              </div>

              {/* Dropout Date */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#16212B] mb-1">
                  Dropout Effective Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dropoutDate}
                  onChange={(e) => setDropoutDate(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-[#DCE3E7] rounded px-3 py-2 focus:outline-none focus:border-[#087F8C]"
                  required
                />
              </div>

              {/* Controlled Reason */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#16212B] mb-1">
                  Dropout Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={dropoutReason}
                  onChange={(e) => setDropoutReason(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-[#DCE3E7] rounded px-3 py-2 focus:outline-none focus:border-[#087F8C]"
                >
                  {CONTROLLED_DROPOUT_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-[10px] font-mono text-[#5E6B75] mt-1">
                  Standardized NCVET controlled reason vocabulary for aggregate policy analysis.
                </p>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#16212B] mb-1">
                  Disengagement Notes (Optional)
                </label>
                <textarea
                  value={dropoutNotes}
                  onChange={(e) => setDropoutNotes(e.target.value)}
                  rows={2}
                  placeholder="Record contextual circumstances or follow-up counseling recommendations..."
                  className="w-full text-xs font-mono bg-white border border-[#DCE3E7] rounded px-3 py-2 focus:outline-none focus:border-[#087F8C] resize-none"
                />
              </div>

              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded text-[11px] font-mono text-amber-900">
                <strong>Statutory Notice:</strong> This action permanently logs a cohort disengagement event in PostgreSQL audit telemetry and marks the enrollment status as DROPPED.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[#DCE3E7] bg-[#FAF7EE] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseDropoutModal}
                disabled={dropoutSubmitting}
                className="px-3.5 py-1.5 rounded border border-[#DCE3E7] bg-white hover:bg-[#FAF9F5] text-xs font-mono text-[#5E6B75] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDropout}
                disabled={dropoutSubmitting}
                className="px-4 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {dropoutSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing to DB...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Record Dropout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProviderDashboard;
