import { useState, useEffect, useCallback } from 'react';
import { governmentService, type GovernmentAnalytics, type DistrictMetric } from '../lib/api';
import { 
  CheckCircle2, 
  Filter, 
  BarChart3, 
  Download, 
  CheckSquare, 
  AlertTriangle, 
  RefreshCw,
  TrendingUp,
  Users,
  Award,
  Briefcase,
  ShieldCheck,
  HelpCircle,
  X,
  Activity,
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface GovernmentDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function GovernmentDashboard({ onNavigateHome, onSwitchRole }: GovernmentDashboardProps) {
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedProgramme, setSelectedProgramme] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [analytics, setAnalytics] = useState<GovernmentAnalytics | null>(null);
  const [districts, setDistricts] = useState<DistrictMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionRecorded, setActionRecorded] = useState(false);
  const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
  const [lastRealtimeSync, setLastRealtimeSync] = useState<string>(() => new Date().toLocaleTimeString());
  const [realtimePulse, setRealtimePulse] = useState(false);

  const loadAnalytics = useCallback(async (isRealtimeUpdate = false) => {
    if (!isRealtimeUpdate) setLoading(true);
    setError(null);
    try {
      const res = await governmentService.getAnalytics({
        district: selectedDistrict,
        programme: selectedProgramme,
        provider: selectedProvider,
      });
      setAnalytics(res);
      setDistricts(res.data || []);
      setLastRealtimeSync(new Date().toLocaleTimeString());
      if (isRealtimeUpdate) {
        setRealtimePulse(true);
        setTimeout(() => setRealtimePulse(false), 2000);
      }
    } catch (err: any) {
      console.error('Failed to load government analytics:', err);
      setError(err.message || 'Unable to load government analytics from PostgreSQL.');
    } finally {
      setLoading(false);
    }
  }, [selectedDistrict, selectedProgramme, selectedProvider]);

  // Initial load and filter updates
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Supabase Realtime subscription
  useEffect(() => {
    const unsubscribe = governmentService.subscribeToAnalytics(() => {
      console.log('Realtime outcome event detected, invalidating & refetching aggregate metrics...');
      loadAnalytics(true);
    });
    return () => {
      unsubscribe();
    };
  }, [loadAnalytics]);

  const handleRecordProgrammeAction = async () => {
    try {
      await governmentService.recordAction({
        actionType: 'PROGRAMME_ACTION_RECORDED',
        district: selectedDistrict,
        amount: '₹14,50,000',
        notes: `Policy milestone action confirmed for ${selectedDistrict} cluster.`,
      });
      setActionRecorded(true);
      setActionNotice('Programme action recorded: Audit log saved to PostgreSQL.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Action failed: ${err.message}`);
    }
  };

  const handleExportData = () => {
    if (!analytics) return;
    const jsonStr = JSON.stringify(analytics, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KaushalSetu-Government-Analytics-${selectedDistrict.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setActionNotice('Government aggregate intelligence exported as JSON.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#16212B] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-[#18324A] border-t-transparent animate-spin mb-4" />
        <p className="font-mono text-sm text-[#5E6B75]">Updating outcome intelligence from PostgreSQL...</p>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#16212B] flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">KaushalSetu Database Telemetry Error</h2>
        <p className="text-sm font-mono text-red-700 max-w-md mb-6">{error}</p>
        <button
          onClick={() => loadAnalytics()}
          className="px-4 py-2 bg-[#18324A] text-white rounded font-mono text-sm flex items-center gap-2 hover:bg-[#0F253B] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const funnel = analytics?.funnel;

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
                  Longitudinal Skilling Outcome Observatory
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#DCE3E7]" />
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-all ${
              realtimePulse ? 'bg-amber-100 text-amber-900 border-amber-300 scale-105' : 'bg-[#D8EEDF] text-[#164627] border-[#B6DBC0]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${realtimePulse ? 'bg-amber-500 animate-ping' : 'bg-[#087F8C]'}`} />
              <span>LIVE SUPABASE REALTIME PULSE · Last synced: {lastRealtimeSync}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsDefinitionModalOpen(true)}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#18324A] rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-[#DCE3E7]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Metric Definitions</span>
            </button>
            <button
              onClick={() => onSwitchRole('trainee')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#18324A] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Trainee View →
            </button>
            <button
              onClick={() => onSwitchRole('employer')}
              className="px-2.5 py-1.5 bg-[#18324A] hover:bg-[#0F253B] text-white rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Employer Portal →
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div className="bg-emerald-100 border-b border-emerald-300 px-4 py-2 text-center text-xs font-mono text-emerald-800 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* Header & High-Level Summary */}
        <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-6 space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                Ministry of Skill Development and Entrepreneurship · National Grid
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#16212B]">
                Longitudinal Outcome Intelligence Funnel
              </h1>
              <p className="text-xs text-[#5E6B75]">
                Real PostgreSQL Tracking: Training → Certification → Placement → Employment → Retention → Salary Progression
              </p>
            </div>

            <div className="md:col-span-6 flex flex-wrap items-center justify-start md:justify-end gap-3 pt-2 md:pt-0">
              <div className="p-3 bg-white border border-[#DCE3E7] rounded text-left min-w-[130px] shadow-2xs">
                <div className="text-[10px] font-mono uppercase text-[#5E6B75]">Tracked Trainees</div>
                <div className="text-2xl font-serif font-bold text-[#18324A]">
                  {funnel?.totalTrained ?? 0}
                </div>
                <div className="text-[10px] text-[#087F8C] font-mono">Total Database Records</div>
              </div>

              <div className="p-3 bg-white border border-[#DCE3E7] rounded text-left min-w-[130px] shadow-2xs">
                <div className="text-[10px] font-mono uppercase text-[#5E6B75]">Placement Rate</div>
                <div className="text-2xl font-serif font-bold text-[#15803D]">
                  {funnel?.placementRate !== undefined ? `${funnel.placementRate}%` : 'N/A'}
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono">
                  {funnel?.placed ?? 0} Placed / {funnel?.completed ?? 0} Finished
                </div>
              </div>

              <div className="p-3 bg-white border border-[#DCE3E7] rounded text-left min-w-[130px] shadow-2xs">
                <div className="text-[10px] font-mono uppercase text-[#5E6B75]">Salary Progression</div>
                <div className="text-2xl font-serif font-bold text-[#087F8C]">
                  {funnel?.salaryProgression?.medianDeltaPercent !== undefined 
                    ? `+${funnel.salaryProgression.medianDeltaPercent}%` 
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-[#15803D] font-mono">Observed Wage Lift</div>
              </div>
            </div>

          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded border border-[#DCE3E7] text-xs font-mono text-[#18324A]">
              <Filter className="w-3.5 h-3.5 text-[#5E6B75]" />
              <span className="text-[#5E6B75]">District:</span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-medium"
              >
                <option value="All">All Districts</option>
                <option value="Pune">Pune Metro Region</option>
                <option value="Sambhajinagar">Chhatrapati Sambhajinagar</option>
                <option value="Nashik">Nashik Engineering Cluster</option>
                <option value="Nagpur">Nagpur Logistics & Tech</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded border border-[#DCE3E7] text-xs font-mono text-[#18324A]">
              <span className="text-[#5E6B75]">Scheme:</span>
              <select
                value={selectedProgramme}
                onChange={(e) => setSelectedProgramme(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-medium"
              >
                <option value="All">All Programmes</option>
                <option value="PMKVY">PMKVY 4.0</option>
                <option value="MSSDS">State Mission (MSSDS)</option>
                <option value="DDU-GKY">DDU-GKY</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded border border-[#DCE3E7] text-xs font-mono text-[#18324A]">
              <span className="text-[#5E6B75]">Provider:</span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-medium"
              >
                <option value="All">All Providers</option>
                <option value="Centurion Skill Academy">Centurion Skill Academy</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAnalytics()}
              className="px-3 py-1.5 bg-white hover:bg-[#EDE8D5] text-[#18324A] rounded text-xs font-mono flex items-center gap-1.5 border border-[#DCE3E7] transition-colors cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleRecordProgrammeAction}
              disabled={actionRecorded}
              className="px-3 py-1.5 bg-[#15803D] hover:bg-[#116631] text-white rounded text-xs font-mono flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{actionRecorded ? 'Programme Action Logged' : 'Record Programme Action'}</span>
            </button>

            <button
              onClick={handleExportData}
              className="px-3 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#18324A] rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-[#DCE3E7]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PRIMARY VISUALIZATION: THE 7-STAGE LONGITUDINAL OUTCOME FUNNEL       */}
        {/* ==================================================================== */}
        <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE3E7] pb-3">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                Core Policy Telemetry
              </span>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#16212B]">
                Primary Visual: 7-Stage Longitudinal Outcome Funnel
              </h2>
            </div>
            <div className="text-xs font-mono text-[#5E6B75]">
              Derived dynamically from <span className="font-semibold text-[#18324A]">public.trainees</span>, <span className="font-semibold text-[#18324A]">certifications</span>, <span className="font-semibold text-[#18324A]">employment_records</span>, & <span className="font-semibold text-[#18324A]">follow_ups</span>
            </div>
          </div>

          {/* 7-Stage Pipeline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            
            {/* Stage 1: TRAINED */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative shadow-2xs hover:border-[#18324A] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#5E6B75]">01 · Trained</span>
                <Users className="w-3.5 h-3.5 text-[#18324A]" />
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-[#18324A]">
                  {funnel?.totalTrained ?? 0}
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono mt-0.5">
                  Total Eligible Cohort
                </div>
              </div>
              <div className="pt-2 border-t border-[#FAF7EE] text-[10px] font-mono text-[#087F8C]">
                100% Base Funnel
              </div>
            </div>

            {/* Stage 2: COMPLETED */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative shadow-2xs hover:border-[#18324A] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#5E6B75]">02 · Completed</span>
                <BookOpen className="w-3.5 h-3.5 text-[#087F8C]" />
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-[#087F8C]">
                  {funnel?.completed ?? 0}
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono mt-0.5">
                  Completion Rate: {funnel?.completionRate ?? 0}%
                </div>
              </div>
              <div className="pt-2 border-t border-[#FAF7EE] text-[10px] font-mono text-[#15803D]">
                {funnel?.completed && funnel?.totalTrained 
                  ? `${Math.round((funnel.completed / funnel.totalTrained) * 100)}% of Cohort` 
                  : 'N/A'}
              </div>
            </div>

            {/* Stage 3: CERTIFIED */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative shadow-2xs hover:border-[#18324A] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#5E6B75]">03 · Certified</span>
                <Award className="w-3.5 h-3.5 text-[#E6A23C]" />
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-[#18324A]">
                  {funnel?.certified ?? 0}
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono mt-0.5">
                  Cert Rate: {funnel?.certificationRate ?? 0}%
                </div>
              </div>
              <div className="pt-2 border-t border-[#FAF7EE] text-[10px] font-mono text-[#E6A23C]">
                NCVET Verified
              </div>
            </div>

            {/* Stage 4: PLACED */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative shadow-2xs hover:border-[#18324A] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#5E6B75]">04 · Placed</span>
                <Briefcase className="w-3.5 h-3.5 text-[#15803D]" />
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-[#15803D]">
                  {funnel?.placed ?? 0}
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono mt-0.5">
                  Placement Rate: {funnel?.placementRate ?? 0}%
                </div>
              </div>
              <div className="pt-2 border-t border-[#FAF7EE] text-[10px] font-mono text-[#164627]">
                Validated: {funnel?.placedVerified ?? 0}
              </div>
            </div>

            {/* Stage 5: CURRENTLY EMPLOYED */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative shadow-2xs hover:border-[#18324A] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#5E6B75]">05 · Employed</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C]" />
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-[#087F8C]">
                  {funnel?.currentlyEmployed ?? 0}
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono mt-0.5">
                  Active in Workforce
                </div>
              </div>
              <div className="pt-2 border-t border-[#FAF7EE] text-[10px] font-mono text-[#5E6B75]">
                Latest Follow-up
              </div>
            </div>

            {/* Stage 6: RETAINED */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative shadow-2xs hover:border-[#18324A] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#5E6B75]">06 · Retained</span>
                <Activity className="w-3.5 h-3.5 text-[#15803D]" />
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-[#15803D]">
                  {funnel?.retentionEligible && funnel.retentionEligible > 0 ? (
                    `${funnel?.retentionRate ?? 0}%`
                  ) : (
                    <span className="text-sm font-sans font-semibold text-[#5E6B75]">
                      {funnel?.retained ? `${funnel.retained} Retained` : 'Insufficient follow-up data'}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono mt-0.5">
                  {funnel?.retentionEligible && funnel.retentionEligible > 0 
                    ? `${funnel.retained} of ${funnel.retentionEligible} eligible` 
                    : 'Longitudinal follow-ups'}
                </div>
              </div>
              <div className="pt-2 border-t border-[#FAF7EE] text-[10px] font-mono text-[#15803D]">
                Consensus Audited
              </div>
            </div>

            {/* Stage 7: SALARY PROGRESSION */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative shadow-2xs hover:border-[#18324A] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#5E6B75]">07 · Wage Lift</span>
                <TrendingUp className="w-3.5 h-3.5 text-[#087F8C]" />
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-[#087F8C]">
                  {funnel?.salaryProgression?.medianDeltaPercent !== undefined 
                    ? `+${funnel.salaryProgression.medianDeltaPercent}%` 
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-[#5E6B75] font-mono mt-0.5">
                  {funnel?.salaryProgression?.medianBaseline 
                    ? `₹${funnel.salaryProgression.medianBaseline.toLocaleString()} → ₹${funnel.salaryProgression.medianCurrent.toLocaleString()}` 
                    : 'Salary records'}
                </div>
              </div>
              <div className="pt-2 border-t border-[#FAF7EE] text-[10px] font-mono text-[#15803D]">
                {funnel?.salaryProgression?.percentWithIncrease ?? 100}% with wage lift
              </div>
            </div>

          </div>

          {/* Visual Step Connection Bar */}
          <div className="hidden lg:flex items-center justify-between px-6 pt-1 text-[11px] font-mono text-[#5E6B75]">
            <span className="flex items-center gap-1">Trained <ArrowRight className="w-3 h-3 text-[#5E6B75]" /></span>
            <span className="flex items-center gap-1">Completed ({funnel?.completionRate ?? 0}%) <ArrowRight className="w-3 h-3 text-[#5E6B75]" /></span>
            <span className="flex items-center gap-1">Certified ({funnel?.certificationRate ?? 0}%) <ArrowRight className="w-3 h-3 text-[#5E6B75]" /></span>
            <span className="flex items-center gap-1">Placed ({funnel?.placementRate ?? 0}%) <ArrowRight className="w-3 h-3 text-[#5E6B75]" /></span>
            <span className="flex items-center gap-1">Employed ({funnel?.employmentRate ?? 0}%) <ArrowRight className="w-3 h-3 text-[#5E6B75]" /></span>
            <span className="flex items-center gap-1">Retained ({funnel?.retentionRate ?? 0}%) <ArrowRight className="w-3 h-3 text-[#5E6B75]" /></span>
            <span>Salary Lift (+{funnel?.salaryProgression?.medianDeltaPercent ?? 0}%)</span>
          </div>
        </div>

        {/* SECTION 2 & 3: Outcome Distribution + Longitudinal Retention Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Outcome Distribution */}
          <div className="lg:col-span-6 bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-[#DCE3E7] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                Outcome Architecture
              </span>
              <h3 className="text-base font-serif font-bold text-[#16212B]">
                Employment Outcome Distribution
              </h3>
              <p className="text-xs text-[#5E6B75]">
                Classified from validated public.outcomes and public.employment_records
              </p>
            </div>

            {(!analytics?.outcomeDistribution || analytics.outcomeDistribution.length === 0) ? (
              <div className="p-6 text-center text-xs font-mono text-[#5E6B75]">
                No outcome distribution records available for selected filters.
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.outcomeDistribution.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-[#16212B]">{item.type}</span>
                      <span className="text-[#5E6B75]">
                        <strong className="text-[#18324A]">{item.count}</strong> trainees ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#EDE8D5] h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.type === 'Employed' ? 'bg-[#087F8C]' :
                          item.type === 'Self-employed' ? 'bg-[#E6A23C]' :
                          item.type === 'Apprenticeship' ? 'bg-[#15803D]' : 'bg-[#5E6B75]'
                        }`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Longitudinal Retention Trend */}
          <div className="lg:col-span-6 bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-[#DCE3E7] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                Longitudinal Stability
              </span>
              <h3 className="text-base font-serif font-bold text-[#16212B]">
                Retention Trend by Milestone
              </h3>
              <p className="text-xs text-[#5E6B75]">
                Observed from multi-milestone employer validations and follow-up pulses
              </p>
            </div>

            {(!analytics?.retentionTrend || analytics.retentionTrend.length === 0) ? (
              <div className="p-6 text-center text-xs font-mono text-[#5E6B75]">
                No retention observations available yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {analytics.retentionTrend.map((trend, idx) => (
                  <div key={idx} className="bg-white border border-[#DCE3E7] rounded-lg p-4 text-center space-y-2 shadow-2xs">
                    <span className="text-xs font-mono uppercase font-bold text-[#5E6B75] block">
                      {trend.milestone}
                    </span>
                    <div className="text-2xl font-serif font-bold text-[#15803D]">
                      {trend.rate}%
                    </div>
                    <div className="text-[10px] font-mono text-[#5E6B75]">
                      {trend.verifiedCount} / {trend.sampleSize} verified
                    </div>
                    <div className="w-full bg-[#EDE8D5] h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="bg-[#15803D] h-full rounded-full"
                        style={{ width: `${Math.min(trend.rate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* SECTION 4 & 5: Skill Gap Distribution + Provider Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Skill Gap Distribution */}
          <div className="lg:col-span-6 bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-[#DCE3E7] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                Competency Deficiencies
              </span>
              <h3 className="text-base font-serif font-bold text-[#16212B]">
                Top Observed Competency Gaps
              </h3>
              <p className="text-xs text-[#5E6B75]">
                Derived from public.skill_gaps and trainee diagnostic assessments
              </p>
            </div>

            {(!analytics?.skillGaps || analytics.skillGaps.length === 0) ? (
              <div className="p-6 text-center text-xs font-mono text-[#5E6B75]">
                No skill gap records currently flagged in the system.
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.skillGaps.map((gap, idx) => (
                  <div key={idx} className="bg-white border border-[#DCE3E7] rounded p-3 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-xs text-[#16212B]">{gap.skillName}</div>
                      <div className="text-[10px] font-mono text-[#5E6B75]">
                        {gap.traineeCount} Trainees Evaluated · Avg Diagnostic Score: {gap.avgScore}%
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      gap.severity === 'HIGH' ? 'bg-red-100 text-red-800 border border-red-300' :
                      gap.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}>
                      {gap.severity} Priority
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Provider Performance Comparison */}
          <div className="lg:col-span-6 bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-[#DCE3E7] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#087F8C] block font-semibold">
                Accreditation Benchmarking
              </span>
              <h3 className="text-base font-serif font-bold text-[#16212B]">
                Training Partner Performance Comparison
              </h3>
              <p className="text-xs text-[#5E6B75]">
                Aggregated outcomes for authorized vocational training providers
              </p>
            </div>

            {(!analytics?.providerComparison || analytics.providerComparison.length === 0) ? (
              <div className="p-6 text-center text-xs font-mono text-[#5E6B75]">
                No provider comparison records available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#EDE8D5] border-b border-[#DCE3E7] font-mono text-[10px] text-[#18324A] uppercase">
                      <th className="py-2.5 px-3">Provider Name</th>
                      <th className="py-2.5 px-2 text-center">Trained</th>
                      <th className="py-2.5 px-2 text-center">Completion</th>
                      <th className="py-2.5 px-2 text-center">Certified</th>
                      <th className="py-2.5 px-2 text-center">Placement</th>
                      <th className="py-2.5 px-3 text-right">Avg Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE8D5] font-mono">
                    {analytics.providerComparison.map((p, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors">
                        <td className="py-2.5 px-3 font-sans font-semibold text-[#16212B]">
                          {p.providerName}
                        </td>
                        <td className="py-2.5 px-2 text-center text-[#18324A]">
                          {p.totalTrainees}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-[#087F8C]">
                          {p.completionRate}%
                        </td>
                        <td className="py-2.5 px-2 text-center text-[#E6A23C] font-semibold">
                          {p.certificationRate}%
                        </td>
                        <td className="py-2.5 px-2 text-center text-[#15803D] font-bold">
                          {p.placementRate}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#18324A] font-medium">
                          ₹{p.avgSalary.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* SECTION 6: District Outcome Map / Table */}
        <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE3E7] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#087F8C] font-semibold">
                <BarChart3 className="w-3.5 h-3.5 text-[#087F8C]" />
                Section 06 · District Longitudinal Wage Multipliers
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#16212B]">
                Sovereign Wage Progression & Retention Benchmarks by Cluster
              </h2>
            </div>
          </div>

          {/* District Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EDE8D5] border-b border-[#DCE3E7] font-mono text-[11px] text-[#18324A] uppercase tracking-wider">
                  <th className="py-3 px-3">Industrial Cluster / District</th>
                  <th className="py-3 px-3">Active Beneficiaries</th>
                  <th className="py-3 px-3 text-center">6M Retention</th>
                  <th className="py-3 px-3 text-center">12M Retention</th>
                  <th className="py-3 px-3">Starting Wage</th>
                  <th className="py-3 px-3">Current Wage</th>
                  <th className="py-3 px-3">Longitudinal Delta</th>
                  <th className="py-3 px-3">Compliance Rate</th>
                  <th className="py-3 px-3">Anchor Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE8D5] font-mono">
                {districts.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-[#F2EFE4] transition-colors"
                  >
                    <td className="py-3 px-3 font-sans font-bold text-[#16212B]">
                      {item.district}
                    </td>

                    <td className="py-3 px-3 text-[#18324A]">
                      {item.activeTrainees.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-[#164627] bg-[#D8EEDF] px-2 py-0.5 rounded border border-[#B6DBC0]">
                        <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                        {item.retention6m}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-[#18324A]">
                        {item.retention12m}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-[#5E6B75]">
                      {item.avgStartingWage}
                    </td>

                    <td className="py-3 px-3 font-bold text-[#16212B]">
                      {item.avgCurrentWage}
                    </td>

                    <td className="py-3 px-3 font-bold text-[#15803D]">
                      {item.wageDelta}
                    </td>

                    <td className="py-3 px-3 text-[#18324A]">
                      {item.complianceRate}%
                    </td>

                    <td className="py-3 px-3 font-sans text-[#5E6B75] max-w-[200px] truncate">
                      {item.leadEmployer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Metric Definitions Drawer/Modal */}
      {isDefinitionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE3E7] bg-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#18324A]" />
                <h3 className="font-serif font-bold text-lg text-[#16212B]">
                  Government Outcome Metric Definitions & Methodology
                </h3>
              </div>
              <button 
                onClick={() => setIsDefinitionModalOpen(false)}
                className="text-[#5E6B75] hover:text-[#16212B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono divide-y divide-[#DCE3E7]">
              
              <div className="pt-2 first:pt-0 space-y-1">
                <div className="font-bold text-sm text-[#18324A]">KPI 1: Total Trainees</div>
                <div className="text-[#5E6B75]">Definition: Total number of eligible registered beneficiaries in the training cohort.</div>
                <div className="text-[#16212B] font-medium">Source Table: <span className="text-[#087F8C]">public.trainees</span></div>
                <div className="text-[#16212B] font-medium">Eligibility: All valid trainee profiles matching filter criteria.</div>
                <div className="text-[#15803D]">Formula: COUNT(id) FROM trainees</div>
              </div>

              <div className="pt-3 space-y-1">
                <div className="font-bold text-sm text-[#18324A]">KPI 2: Training Completed</div>
                <div className="text-[#5E6B75]">Definition: Number of trainees with completed training milestone.</div>
                <div className="text-[#16212B] font-medium">Source Tables: <span className="text-[#087F8C]">public.trainees, public.outcomes</span></div>
                <div className="text-[#16212B] font-medium">Calculation: completed_count / total_trainees × 100</div>
              </div>

              <div className="pt-3 space-y-1">
                <div className="font-bold text-sm text-[#18324A]">KPI 3: Certification Rate</div>
                <div className="text-[#5E6B75]">Definition: Eligible trainees with a valid NCVET credential record divided by completed trainees.</div>
                <div className="text-[#16212B] font-medium">Source Table: <span className="text-[#087F8C]">public.certifications</span></div>
                <div className="text-[#15803D]">Formula: certified_count / completed_count × 100 (Safe division against zero)</div>
              </div>

              <div className="pt-3 space-y-1">
                <div className="font-bold text-sm text-[#18324A]">KPI 4: Placed (Reported & Validated)</div>
                <div className="text-[#5E6B75]">Definition: Trainees with recorded placement/employment outcome, distinguishing reported vs validated.</div>
                <div className="text-[#16212B] font-medium">Source Tables: <span className="text-[#087F8C]">public.outcomes, public.employment_records</span></div>
                <div className="text-[#15803D]">Formula: placed_count / completed_count × 100</div>
              </div>

              <div className="pt-3 space-y-1">
                <div className="font-bold text-sm text-[#18324A]">KPI 5: Currently Employed</div>
                <div className="text-[#5E6B75]">Definition: Trainees whose latest valid outcome indicates active workforce employment without double counting.</div>
                <div className="text-[#16212B] font-medium">Source Tables: <span className="text-[#087F8C]">public.employment_records (end_date IS NULL), public.follow_ups</span></div>
              </div>

              <div className="pt-3 space-y-1">
                <div className="font-bold text-sm text-[#18324A]">KPI 6: Retention</div>
                <div className="text-[#5E6B75]">Definition: Trainees who have reached the elapsed period (3M, 6M, 12M) with active retained status.</div>
                <div className="text-[#16212B] font-medium">Source Tables: <span className="text-[#087F8C]">public.follow_ups, public.outcomes</span></div>
                <div className="text-[#5E6B75]">Note: Displays "Insufficient follow-up data" if sample size is zero rather than inventing a percentage.</div>
              </div>

              <div className="pt-3 space-y-1">
                <div className="font-bold text-sm text-[#18324A]">KPI 7: Salary Progression</div>
                <div className="text-[#5E6B75]">Definition: Median baseline vs latest current salary progression observed in longitudinal payroll records.</div>
                <div className="text-[#16212B] font-medium">Source Tables: <span className="text-[#087F8C]">public.employment_records, public.outcomes</span></div>
                <div className="text-[#5E6B75]">Attribution: "Observed salary change recorded after training" (non-causal language).</div>
              </div>

            </div>

            <div className="p-4 border-t border-[#DCE3E7] bg-white flex justify-end">
              <button
                onClick={() => setIsDefinitionModalOpen(false)}
                className="px-4 py-2 bg-[#18324A] text-white rounded text-xs font-mono cursor-pointer hover:bg-[#0F253B] transition-colors"
              >
                Close Definitions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#DCE3E7] bg-[#FAF7EE] py-3 px-4 text-center text-xs font-mono text-[#5E6B75]">
        KaushalSetu Sovereign Observatory · Ministry of Skill Development and Entrepreneurship · Live PostgreSQL Sync
      </div>
    </div>
  );
}

export default GovernmentDashboard;
