import { useState, useEffect, useCallback, useRef } from 'react';
import type { TraineeTab } from '../types';
import { traineeService, type TraineeDossier, supabase } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { TraineeProfileModal } from './TraineeProfileModal';
import { FollowUpSurveyModal } from './FollowUpSurveyModal';
import { 
  ShieldCheck, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Award,
  TrendingUp,
  Briefcase,
  User,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Compass,
  Zap,
  FileCheck,
  ChevronRight,
  Clock
} from 'lucide-react';

interface TraineeDashboardProps {
  onNavigateHome?: () => void;
  onSwitchRole?: (role: string) => void;
  activeTab?: TraineeTab;
  onTabChange?: (tab: TraineeTab) => void;
}

export function TraineeDashboard({ 
  onNavigateHome: _onNavigateHome, 
  activeTab: controlledTab, 
  onTabChange 
}: TraineeDashboardProps) {
  const { profile: authProfile } = useAuth();
  const [dossier, setDossier] = useState<TraineeDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string>('');

  // Tab synchronization (overview | training | outcomes | journey | followups | skills)
  const [activeTab, setActiveTab] = useState<TraineeTab>(() => {
    if (controlledTab) return controlledTab;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab') as TraineeTab | null;
      if (t && ['overview', 'training', 'outcomes', 'journey', 'followups', 'skills'].includes(t)) {
        return t;
      }
      if ((t as any) === 'trajectory') return 'journey';
      if ((t as any) === 'ledger') return 'followups';
    }
    return 'overview';
  });

  const lastControlledTabRef = useRef(controlledTab);
  useEffect(() => {
    if (controlledTab && controlledTab !== lastControlledTabRef.current) {
      lastControlledTabRef.current = controlledTab;
      setActiveTab(controlledTab);
    }
  }, [controlledTab]);

  const handleTabClick = (tab: TraineeTab) => {
    lastControlledTabRef.current = tab;
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({ tab }, '', url.toString());
    } catch {
      // safe fallback
    }
  };

  // Outcome Form State (Inside Outcomes Tab)
  const [outcomeType, setOutcomeType] = useState<'EMPLOYED' | 'SELF_EMPLOYED' | 'APPRENTICESHIP' | 'NOT_EMPLOYED'>('EMPLOYED');
  const [jobTitle, setJobTitle] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [employmentType, setEmploymentType] = useState('REGULAR');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [selfCategory, setSelfCategory] = useState('');
  const [selfIncome, setSelfIncome] = useState('');
  const [appEmployer, setAppEmployer] = useState('');
  const [appTrade, setAppTrade] = useState('');
  const [unemploymentReason, setUnemploymentReason] = useState('Still seeking employment');
  const [unemploymentNotes, setUnemploymentNotes] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [outcomeSuccessMessage, setOutcomeSuccessMessage] = useState<string | null>(null);
  const [outcomeErrorMessage, setOutcomeErrorMessage] = useState<string | null>(null);

  // Skill Re-assessment request state
  const [requestingSkillId, setRequestingSkillId] = useState<string | null>(null);
  const [skillActionNotice, setSkillActionNotice] = useState<string | null>(null);

  // Load Real Data from Supabase
  const loadTraineeData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const targetId = authProfile?.traineeId || 'me';
      const data = await traineeService.getDossier(targetId);
      setDossier(data);

      // Pre-fill outcome form with current database records
      if (data.trainee) {
        const t = data.trainee;
        const currentStatus = (t.employmentStatus || 'NOT_EMPLOYED').toUpperCase();
        if (currentStatus === 'SELF_EMPLOYED') setOutcomeType('SELF_EMPLOYED');
        else if (currentStatus === 'APPRENTICESHIP') setOutcomeType('APPRENTICESHIP');
        else if (currentStatus === 'NOT_EMPLOYED' || currentStatus === 'SEEKING_EMPLOYMENT') setOutcomeType('NOT_EMPLOYED');
        else setOutcomeType('EMPLOYED');

        setDistrict(t.district || '');
        setState(t.state || '');
        setJobTitle(data.activeEmployment?.jobTitle || t.currentOccupation || '');
        setEmployerName(data.activeEmployment?.employerName || '');
        setEmploymentType(data.activeEmployment?.employmentType || 'REGULAR');
        setMonthlySalary(data.activeEmployment?.monthlySalary ? String(data.activeEmployment.monthlySalary) : '');
        if (data.activeEmployment?.startDate) {
          setStartDate(data.activeEmployment.startDate.split('T')[0]);
        }
        if (data.activeEmployment?.endDate) {
          setEndDate(data.activeEmployment.endDate.split('T')[0]);
        }
        setSelfCategory(t.selfEmploymentCategory || '');
        setSelfIncome(t.selfEmploymentIncome ? String(t.selfEmploymentIncome) : '');
        setAppEmployer(t.apprenticeshipEmployer || '');
        setUnemploymentReason(t.unemploymentReason || 'Still seeking employment');
        setUnemploymentNotes(t.unemploymentNotes || '');
      }
    } catch (err: any) {
      console.error('Failed to load real trainee dossier:', err);
      setError(err.message || 'Unable to retrieve trainee outcome records from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authProfile?.traineeId]);

  useEffect(() => {
    loadTraineeData();
  }, [loadTraineeData]);

  // Real Supabase Realtime Subscription
  useEffect(() => {
    const traineeDbId = authProfile?.traineeId;
    if (!traineeDbId) return;

    // Listen on postgres_changes for trainees, employment_records, and follow_ups
    const channel = supabase
      .channel(`trainee-realtime-${traineeDbId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trainees', filter: `id=eq.${traineeDbId}` },
        () => {
          loadTraineeData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employment_records', filter: `trainee_id=eq.${traineeDbId}` },
        () => {
          loadTraineeData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follow_ups', filter: `trainee_id=eq.${traineeDbId}` },
        () => {
          loadTraineeData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authProfile?.traineeId, loadTraineeData]);

  // Handle Outcome Submission
  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOutcome || isSavedRecently) return;
    setIsSubmittingOutcome(true);
    setOutcomeSuccessMessage(null);
    setOutcomeErrorMessage(null);

    const parsedSalary = monthlySalary.trim() !== '' ? parseFloat(monthlySalary) : undefined;
    if (parsedSalary !== undefined && isNaN(parsedSalary)) {
      setOutcomeErrorMessage('Salary/Wage must be a valid numeric amount.');
      setIsSubmittingOutcome(false);
      return;
    }

    try {
      const targetId = authProfile?.traineeId || dossier?.trainee.id;
      await traineeService.recordEmploymentUpdate({
        trainee_id: targetId,
        status: outcomeType,
        job_title: outcomeType === 'SELF_EMPLOYED' ? selfCategory : (outcomeType === 'APPRENTICESHIP' ? appTrade : jobTitle),
        employer_name: outcomeType === 'SELF_EMPLOYED' ? 'Independent / Self-Employed' : (outcomeType === 'APPRENTICESHIP' ? appEmployer : employerName),
        employment_type: employmentType,
        monthly_salary: outcomeType === 'SELF_EMPLOYED' ? (selfIncome ? parseFloat(selfIncome) : parsedSalary) : parsedSalary,
        start_date: startDate || new Date().toISOString().split('T')[0],
        end_date: endDate || undefined,
        district: district || undefined,
        state: state || undefined,
        is_self_employed: outcomeType === 'SELF_EMPLOYED',
        self_employment_category: outcomeType === 'SELF_EMPLOYED' ? selfCategory : undefined,
        is_apprenticeship: outcomeType === 'APPRENTICESHIP',
        apprenticeship_employer: outcomeType === 'APPRENTICESHIP' ? appEmployer : undefined,
        unemployment_reason: outcomeType === 'NOT_EMPLOYED' ? unemploymentReason : undefined,
        unemployment_notes: outcomeType === 'NOT_EMPLOYED' ? unemploymentNotes : undefined,
        notes: outcomeNotes || 'Post-training employment outcome recorded by trainee.'
      });

      // 1. Refetch live trainee dossier immediately from Supabase Cloud
      await loadTraineeData(true);

      // 2. Set saved UI state and user notification
      setIsSavedRecently(true);
      setOutcomeSuccessMessage(`Outcome successfully updated to ${outcomeType.replace('_', ' ')}.`);
      setTimeout(() => setIsSavedRecently(false), 2500);
      setTimeout(() => setOutcomeSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to submit outcome update:', {
        message: err.message,
        status: err.status || err.statusCode,
        code: err.code,
        details: err.details,
        hint: err.hint,
      });
      setOutcomeErrorMessage('Unable to save outcome. Please try again.');
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  // Handle Assessment Request
  const handleRequestAssessment = async (skillId: string, skillName: string) => {
    setRequestingSkillId(skillId);
    setSkillActionNotice(null);
    try {
      const targetId = authProfile?.traineeId || dossier?.trainee.id || '';
      await traineeService.requestAssessment(targetId, {
        skillCategory: skillName,
        notes: `Trainee requested re-assessment for ${skillName} (ID: ${skillId})`
      });
      setSkillActionNotice(`Re-assessment successfully scheduled for ${skillName}.`);
      await loadTraineeData(true);
      setTimeout(() => setSkillActionNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to request assessment:', err);
      setSkillActionNotice(`Assessment request: ${err.message || 'Unable to submit request.'}`);
    } finally {
      setRequestingSkillId(null);
    }
  };

  // Profile completion calculation from real columns
  const calculateProfileCompletion = () => {
    if (!dossier?.trainee) return 0;
    const t = dossier.trainee;
    const checks = [
      Boolean(t.name),
      Boolean(t.contactNumber),
      Boolean(t.education),
      Boolean(t.district),
      Boolean(t.state),
      Boolean(t.currentOccupation || t.employmentStatus),
      Boolean(t.consentStatus === 'CONSENTED'),
      Boolean(dossier.certifications && dossier.certifications.length > 0),
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  };

  // Follow-ups counts
  const pendingFollowUps = (dossier?.followUps || []).filter(
    (f) => !f.status.toLowerCase().includes('completed') && !f.status.toLowerCase().includes('done')
  );
  const completedFollowUps = (dossier?.followUps || []).filter(
    (f) => f.status.toLowerCase().includes('completed') || f.status.toLowerCase().includes('done')
  );

  // Loading Screen
  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 text-[#18324A]">
        <div className="w-10 h-10 border-3 border-[#18324A] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="font-mono text-xs tracking-wider uppercase font-bold text-[#18324A]">
          Loading Verified Trainee Outcome Dossier...
        </span>
        <span className="text-[11px] font-mono text-[#5E6B75] mt-1">
          Querying Supabase Cloud PostgreSQL & Telemetry Nodes
        </span>
      </div>
    );
  }

  // Error Screen
  if (error || !dossier) {
    return (
      <div className="w-full max-w-4xl mx-auto my-12 p-6 bg-white border border-red-200 rounded-lg text-center shadow-xs">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h2 className="text-base font-bold font-serif text-[#16212B]">Trainee Record Inaccessible</h2>
        <p className="text-xs font-mono text-[#5E6B75] mt-1 mb-4">{error || 'No trainee profile matched your authenticated session.'}</p>
        <button
          onClick={() => loadTraineeData()}
          className="px-4 py-2 bg-[#18324A] text-white text-xs font-mono rounded hover:bg-[#263B52] transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const trainee = dossier.trainee;
  const trainingHistory = dossier.trainingHistory || [];
  const certifications = dossier.certifications || [];
  const activeEmployment = dossier.activeEmployment;
  const salaryProgression = dossier.salaryProgression;
  const skillGaps = dossier.skillGaps || [];
  const journeyEvents = dossier.journey || [];

  const isEmployerValidated = Boolean(
    activeEmployment?.validationStatus === 'VERIFIED' ||
    dossier.stages?.some((s: any) => s.outcome?.type === 'EMPLOYED' && (s.outcome?.validation_status === 'VERIFIED' || s.outcome?.validationStatus === 'VERIFIED'))
  );

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatEmploymentType = (type?: string | null): string => {
    if (!type) return 'Regular / Full-time';
    const upper = type.toUpperCase();
    if (upper === 'REGULAR' || upper === 'FULL_TIME' || upper === 'WAGE_EMPLOYED') return 'Regular / Full-time';
    if (upper === 'CONTRACT' || upper === 'CONTRACTUAL') return 'Contractual';
    if (upper === 'PART_TIME') return 'Part-time';
    if (upper === 'SELF_EMPLOYED') return 'Self-Employed';
    if (upper === 'APPRENTICESHIP') return 'Apprenticeship';
    return type;
  };

  // Structured Action Ledger compiled directly from verified Supabase records
  const actionLedgerItems = [
    ...(dossier.employmentRecords && dossier.employmentRecords.length > 0
      ? dossier.employmentRecords
      : activeEmployment
      ? [activeEmployment]
      : []
    ).map((er: any, idx: number) => ({
      id: er.id || `emp_${idx}`,
      rawDate: er.startDate || er.created_at || new Date().toISOString(),
      date: formatDate(er.startDate || er.created_at),
      action: 'Employment Outcome Recorded',
      roleOrg: `${er.jobTitle} at ${er.employerName}`,
      wage: er.monthlySalary > 0 ? `₹${Number(er.monthlySalary).toLocaleString('en-IN')}` : '—',
      source: 'Trainee outcome submission',
      status: isEmployerValidated ? 'Validated' : 'Recorded',
      isValidated: isEmployerValidated,
    })),
    ...trainingHistory.map((th: any, idx: number) => ({
      id: th.id || `th_${idx}`,
      rawDate: th.startDate || th.enrolledAt || new Date().toISOString(),
      date: formatDate(th.startDate || th.enrolledAt),
      action: `Cohort Enrollment: ${th.programme}`,
      roleOrg: `Provider: ${th.providerName}`,
      wage: '—',
      source: 'Institutional Registry',
      status: th.isCompleted ? 'Completed' : 'Enrolled',
      isValidated: true,
    })),
    ...certifications.map((c: any, idx: number) => ({
      id: c.id || `cert_${idx}`,
      rawDate: c.issuedAt || new Date().toISOString(),
      date: formatDate(c.issuedAt),
      action: `Credential Issued: ${c.name}`,
      roleOrg: `Issuing Body: ${c.issuingBody || 'NCVET'}`,
      wage: '—',
      source: 'NCVET Verified',
      status: 'Verified',
      isValidated: true,
    })),
    ...completedFollowUps.map((fu: any, idx: number) => ({
      id: fu.id || `fu_${idx}`,
      rawDate: fu.scheduledAt || new Date().toISOString(),
      date: formatDate(fu.scheduledAt),
      action: 'Longitudinal Retention Survey',
      roleOrg: 'KaushalSetu Observatory',
      wage: fu.monthlySalary > 0 ? `₹${Number(fu.monthlySalary).toLocaleString('en-IN')}` : '—',
      source: 'Observatory Pulse',
      status: fu.status || 'Completed',
      isValidated: true,
    })),
  ].sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-6 space-y-6">
      
      {/* ========================================================================= */}
      {/* 1. Trainee Header Bar (Institutional, trustworthy, light theme)            */}
      {/* ========================================================================= */}
      <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-[#18324A] text-white flex items-center justify-center font-serif text-lg font-bold shrink-0">
              {trainee.name ? trainee.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#16212B] tracking-tight">
                  {trainee.name || 'Verified Trainee'}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#E7F5F4] text-[#087F8C] border border-[#B6DBC0]">
                  NCVET Trainee ID: {trainee.id}
                </span>
                {trainee.consentStatus === 'CONSENTED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    DPDP Consent Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Consent Pending
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[#5E6B75] mt-1 flex flex-wrap items-center gap-3">
                <span>{trainee.education || 'Vocational Candidate'}</span>
                <span>•</span>
                <span>{trainee.district ? `${trainee.district}, ${trainee.state || 'India'}` : 'Location unrecorded'}</span>
                <span>•</span>
                <span>Current Status: <strong className="text-[#16212B] uppercase">{trainee.employmentStatus || 'NOT_EMPLOYED'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="px-3 py-1.5 bg-white border border-[#DCE3E7] hover:border-[#18324A] text-[#18324A] text-xs font-mono font-medium rounded transition flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Edit Profile & Consent</span>
            </button>
            <button
              onClick={() => loadTraineeData(true)}
              disabled={refreshing}
              className="p-2 bg-white border border-[#DCE3E7] hover:bg-slate-50 text-[#5E6B75] rounded transition cursor-pointer"
              title="Refresh live data from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#087F8C]' : ''}`} />
            </button>
          </div>

        </div>

        {/* Tab Sub-Navigation (Accessible directly on mobile and quick-switching) */}
        <div className="mt-5 pt-3 border-t border-[#DCE3E7] flex items-center gap-1.5 overflow-x-auto text-xs font-mono scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: Compass },
            { id: 'training', label: 'Training & Certs', icon: GraduationCap },
            { id: 'outcomes', label: 'Outcomes Management', icon: Briefcase },
            { id: 'journey', label: 'Trajectory & Journey', icon: TrendingUp },
            { id: 'followups', label: `Follow-ups (${pendingFollowUps.length})`, icon: ClipboardList },
            { id: 'skills', label: `Skill Gaps (${skillGaps.length})`, icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as TraineeTab)}
                className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#18324A] text-white font-bold shadow-2xs'
                    : 'text-[#5E6B75] hover:text-[#16212B] hover:bg-[#EDE8D5]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW WORKSPACE                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Welcome Banner */}
          <div className="p-5 bg-white border border-[#DCE3E7] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#087F8C] font-semibold">
                National Longitudinal Outcome Registry
              </span>
              <h2 className="text-lg font-serif font-bold text-[#16212B] mt-0.5">
                Welcome back, {trainee.name || 'Trainee'}
              </h2>
              <p className="text-xs font-mono text-[#5E6B75] mt-1">
                Your longitudinal journey from skills to sustainable career.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTabClick('outcomes')}
                className="px-4 py-2 bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono font-medium rounded transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Update Outcome Status</span>
              </button>
            </div>
          </div>

          {/* Real Metrics Grid (Database-Backed) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* 1. Profile Completion */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 text-center flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E6B75]">Profile</span>
              <div className="my-2">
                <span className="text-2xl font-bold font-mono text-[#18324A]">
                  {calculateProfileCompletion()}%
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700">Completion rate</span>
            </div>

            {/* 2. Training Status */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 text-center flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E6B75]">Training</span>
              <div className="my-2">
                <span className="text-2xl font-bold font-mono text-[#18324A]">
                  {trainingHistory.filter((t) => t.isCompleted || t.status === 'COMPLETED').length}
                </span>
                <span className="text-xs font-mono text-[#5E6B75]"> / {trainingHistory.length}</span>
              </div>
              <span className="text-[10px] font-mono text-[#5E6B75]">Completed courses</span>
            </div>

            {/* 3. Certifications */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 text-center flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E6B75]">Certification</span>
              <div className="my-2">
                <span className="text-2xl font-bold font-mono text-[#18324A]">
                  {certifications.length}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700">Verified credentials</span>
            </div>

            {/* 4. Current Outcome */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 text-center flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E6B75]">Current Outcome</span>
              <div className="my-2">
                <span className="text-xs font-mono font-bold uppercase px-2 py-1 rounded bg-[#E8F1F7] text-[#18324A] inline-block truncate max-w-full">
                  {trainee.employmentStatus || 'NOT EMPLOYED'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#5E6B75]">Active status</span>
            </div>

            {/* 5. Follow-ups */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 text-center flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E6B75]">Follow-ups</span>
              <div className="my-2">
                <span className={`text-2xl font-bold font-mono ${pendingFollowUps.length > 0 ? 'text-amber-600' : 'text-[#18324A]'}`}>
                  {pendingFollowUps.length}
                </span>
                <span className="text-xs font-mono text-[#5E6B75]"> pending</span>
              </div>
              <span className="text-[10px] font-mono text-[#5E6B75]">{completedFollowUps.length} completed</span>
            </div>

            {/* 6. Skill Gaps */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-3.5 text-center flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E6B75]">Skill Gaps</span>
              <div className="my-2">
                <span className="text-2xl font-bold font-mono text-[#18324A]">
                  {skillGaps.length}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#5E6B75]">Assessed competencies</span>
            </div>

          </div>

          {/* Quick Action & Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Card A: Active Employment & Progression */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#18324A] flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-[#087F8C]" />
                    CURRENT ACTIVE EMPLOYMENT
                  </span>
                  {activeEmployment ? (
                    isEmployerValidated ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Validated by employer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Reported by trainee
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-[#5E6B75]">
                      {trainee.employmentStatus || 'Unrecorded'}
                    </span>
                  )}
                </div>
                {activeEmployment ? (
                  <div className="space-y-2 text-xs font-mono">
                    <div className="text-[#16212B] font-serif font-bold text-base flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#087F8C]" />
                      <span>{activeEmployment.employerName}</span>
                    </div>
                    <div className="font-bold text-[#16212B] text-sm">
                      {activeEmployment.jobTitle}
                    </div>
                    <div className="text-[#5E6B75] text-[11px]">
                      {formatEmploymentType(activeEmployment.employmentType)}
                    </div>
                    {activeEmployment.startDate && (
                      <div className="text-[#5E6B75] text-[11px]">
                        Started: <strong className="text-[#16212B]">{formatDate(activeEmployment.startDate)}</strong>
                      </div>
                    )}
                    {activeEmployment.monthlySalary > 0 && (
                      <div className="text-emerald-700 font-bold text-sm">
                        Monthly Wage: ₹{activeEmployment.monthlySalary.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-[#5E6B75] py-2">
                    No active employment record is currently registered. Update your current outcome below.
                  </p>
                )}
              </div>
              <button
                onClick={() => handleTabClick('outcomes')}
                className="mt-4 pt-3 border-t border-[#DCE3E7] text-xs font-mono text-[#087F8C] hover:text-[#18324A] flex items-center justify-between font-bold cursor-pointer"
              >
                <span>Manage Outcome Record</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Card B: Training & Credentials */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#18324A] flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#087F8C]" />
                    Training & Credentials
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                    {certifications.length} Credentials
                  </span>
                </div>
                {trainingHistory.length > 0 ? (
                  <div className="space-y-2 text-xs font-mono">
                    <div className="font-bold text-[#16212B]">{trainingHistory[0].programme}</div>
                    <div className="text-[#5E6B75]">{trainingHistory[0].providerName}</div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      Status: {trainingHistory[0].status}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-[#5E6B75] py-2">
                    No vocational enrollment records currently logged in registry.
                  </p>
                )}
              </div>
              <button
                onClick={() => handleTabClick('training')}
                className="mt-4 pt-3 border-t border-[#DCE3E7] text-xs font-mono text-[#087F8C] hover:text-[#18324A] flex items-center justify-between font-bold cursor-pointer"
              >
                <span>View Training History</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Card C: Longitudinal Follow-up Pulse */}
            <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#18324A] flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-[#087F8C]" />
                    Follow-up Audits
                  </span>
                  {pendingFollowUps.length > 0 ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                      {pendingFollowUps.length} Pending
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                      All Caught Up
                    </span>
                  )}
                </div>
                {pendingFollowUps.length > 0 ? (
                  <div className="space-y-2 text-xs font-mono">
                    <p className="text-[#16212B]">
                      A periodic longitudinal survey is pending your verification.
                    </p>
                    <p className="text-[11px] text-[#5E6B75]">
                      Scheduled: {new Date(pendingFollowUps[0].scheduledAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-[#5E6B75] py-2">
                    No pending retention surveys. Your longitudinal outcome record is up to date.
                  </p>
                )}
              </div>
              <button
                onClick={() => handleTabClick('followups')}
                className="mt-4 pt-3 border-t border-[#DCE3E7] text-xs font-mono text-[#087F8C] hover:text-[#18324A] flex items-center justify-between font-bold cursor-pointer"
              >
                <span>Access Follow-up Hub</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Recent Timeline Preview */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-base text-[#16212B]">
                Recent Outcome Milestones
              </h3>
              <button
                onClick={() => handleTabClick('journey')}
                className="text-xs font-mono text-[#087F8C] hover:underline cursor-pointer"
              >
                View Full Chronological Journey →
              </button>
            </div>
            {journeyEvents.length > 0 ? (
              <div className="space-y-3">
                {journeyEvents.slice(0, 4).map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 border border-[#DCE3E7] rounded text-xs font-mono">
                    <div className="w-2 h-2 rounded-full bg-[#087F8C] mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#16212B]">{event.title}</span>
                        <span className="text-[10px] text-[#5E6B75]">{event.date}</span>
                      </div>
                      <div className="text-[11px] text-[#5E6B75] mt-0.5">
                        {event.organization} • <span className="text-emerald-700">{event.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-[#5E6B75] py-4 text-center">
                No outcome history records logged yet.
              </p>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRAINING & CERTIFICATIONS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'training' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Section Header */}
          <div className="p-4 bg-white border border-[#DCE3E7] rounded-lg">
            <h2 className="text-lg font-serif font-bold text-[#16212B]">
              Vocational Training & Verified Certifications
            </h2>
            <p className="text-xs font-mono text-[#5E6B75] mt-0.5">
              Official training records registered in the KaushalSetu National Skill Registry.
            </p>
          </div>

          {/* Training Records */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <h3 className="font-serif font-bold text-base text-[#16212B] mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#087F8C]" />
              <span>Training History</span>
              <span className="text-xs font-mono text-[#5E6B75] font-normal">({trainingHistory.length} records)</span>
            </h3>

            {trainingHistory.length > 0 ? (
              <div className="space-y-3">
                {trainingHistory.map((th) => (
                  <div key={th.id} className="p-4 border border-[#DCE3E7] rounded-lg hover:border-[#18324A] transition bg-[#FAF7EE]/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#16212B]">{th.programme}</h4>
                        <p className="text-xs font-mono text-[#5E6B75] mt-0.5 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{th.providerName}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase ${
                          th.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {th.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#DCE3E7] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-[#5E6B75]">
                      <div>
                        <span className="block text-[#16212B] font-medium">Start Date</span>
                        <span>{th.startDate ? new Date(th.startDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[#16212B] font-medium">End Date</span>
                        <span>{th.endDate ? new Date(th.endDate).toLocaleDateString('en-GB') : 'In Progress'}</span>
                      </div>
                      <div>
                        <span className="block text-[#16212B] font-medium">Enrollment Date</span>
                        <span>{th.enrolledAt ? new Date(th.enrolledAt).toLocaleDateString('en-GB') : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[#16212B] font-medium">Registry ID</span>
                        <span className="truncate block">{th.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs font-mono text-[#5E6B75] border border-dashed border-[#DCE3E7] rounded-lg">
                <BookOpen className="w-8 h-8 text-[#5E6B75] mx-auto mb-2 opacity-50" />
                <p>No training records have been added yet.</p>
              </div>
            )}
          </div>

          {/* Certifications Records */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <h3 className="font-serif font-bold text-base text-[#16212B] mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#087F8C]" />
              <span>Verified Certifications</span>
              <span className="text-xs font-mono text-[#5E6B75] font-normal">({certifications.length} credentials)</span>
            </h3>

            {certifications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certifications.map((cert, idx) => (
                  <div key={cert.id || idx} className="p-4 border border-[#DCE3E7] rounded-lg bg-[#FAF7EE]/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#087F8C] font-semibold">
                            {cert.issuingBody || 'NCVET Authorized Body'}
                          </span>
                          <h4 className="font-serif font-bold text-base text-[#16212B] mt-0.5">{cert.name}</h4>
                          <p className="text-xs font-mono text-[#5E6B75] mt-1">{cert.course}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          {cert.status || 'VERIFIED'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#DCE3E7] flex items-center justify-between text-[11px] font-mono text-[#5E6B75]">
                      <div>
                        <span>Certificate No: </span>
                        <strong className="text-[#16212B]">{cert.certificateNumber}</strong>
                      </div>
                      <div>
                        <span>Issued: </span>
                        <span>{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-GB') : 'Recorded'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs font-mono text-[#5E6B75] border border-dashed border-[#DCE3E7] rounded-lg">
                <Award className="w-8 h-8 text-[#5E6B75] mx-auto mb-2 opacity-50" />
                <p>No certification record available yet.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OUTCOMES MANAGEMENT (Most critical section)                         */}
      {/* ========================================================================= */}
      {activeTab === 'outcomes' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Header */}
          <div className="p-4 bg-white border border-[#DCE3E7] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#16212B]">
                Current Post-Training Outcome Management
              </h2>
              <p className="text-xs font-mono text-[#5E6B75] mt-0.5">
                Update your actual employment, self-employment, apprenticeship, or job-seeking status in the national database.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-[#5E6B75]">Active Status:</span>
              <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-[#18324A] text-white">
                {trainee.employmentStatus || 'NOT EMPLOYED'}
              </span>
            </div>
          </div>

          {/* Feedback Banners */}
          {outcomeSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs font-mono text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{outcomeSuccessMessage}</span>
            </div>
          )}
          {outcomeErrorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs font-mono text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{outcomeErrorMessage}</span>
            </div>
          )}

          {/* Current Active Employment Banner in Outcomes Tab */}
          {activeEmployment ? (
            <div className="p-5 bg-white border border-[#DCE3E7] rounded-lg shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE3E7] pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#087F8C] font-bold">
                    Current Active Employment
                  </span>
                  <h3 className="font-serif font-bold text-lg text-[#16212B] flex items-center gap-2 mt-0.5">
                    <Building2 className="w-5 h-5 text-[#087F8C]" />
                    <span>{activeEmployment.employerName}</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {isEmployerValidated ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Validated by employer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Reported by trainee
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[#5E6B75] block text-[11px]">Job Title / Designation</span>
                  <span className="font-bold text-[#16212B] text-sm">{activeEmployment.jobTitle}</span>
                </div>
                <div>
                  <span className="text-[#5E6B75] block text-[11px]">Employment Type</span>
                  <span className="font-medium text-[#16212B]">
                    {formatEmploymentType(activeEmployment.employmentType)}
                  </span>
                </div>
                <div>
                  <span className="text-[#5E6B75] block text-[11px]">Started</span>
                  <span className="font-medium text-[#16212B]">
                    {activeEmployment.startDate ? formatDate(activeEmployment.startDate) : 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[#5E6B75] block text-[11px]">Monthly Wage</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {activeEmployment.monthlySalary > 0
                      ? `₹${activeEmployment.monthlySalary.toLocaleString('en-IN')}`
                      : 'Unrecorded'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white border border-[#DCE3E7] rounded-lg text-xs font-mono text-[#5E6B75]">
              No active employment record currently registered in the database. Use the form below to commit your outcome.
            </div>
          )}

          {/* Outcome Selector (4-way toggle) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'EMPLOYED', label: 'Employed', desc: 'Wage / Regular Employment', icon: Briefcase },
              { id: 'SELF_EMPLOYED', label: 'Self-Employed', desc: 'Independent / Business', icon: User },
              { id: 'APPRENTICESHIP', label: 'Apprenticeship', desc: 'Industry Training Contract', icon: GraduationCap },
              { id: 'NOT_EMPLOYED', label: 'Not Employed', desc: 'Seeking Job / Other Reasons', icon: Clock },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = outcomeType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOutcomeType(opt.id as any)}
                  className={`p-4 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#087F8C] bg-[#E7F5F4] ring-2 ring-[#087F8C]/20'
                      : 'border-[#DCE3E7] bg-white hover:border-[#18324A]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#087F8C]' : 'text-[#5E6B75]'}`} />
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#087F8C]" />}
                  </div>
                  <div>
                    <span className="font-serif font-bold text-sm text-[#16212B] block">{opt.label}</span>
                    <span className="text-[10px] font-mono text-[#5E6B75]">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Outcome Form */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-6">
            <form onSubmit={handleOutcomeSubmit} className="space-y-4">
              
              {/* Form Option 1: EMPLOYED */}
              {outcomeType === 'EMPLOYED' && (
                <div className="space-y-4">
                  <div className="border-b border-[#DCE3E7] pb-2">
                    <h3 className="font-serif font-bold text-sm text-[#16212B]">
                      Wage Employment Details
                    </h3>
                    <p className="text-[11px] font-mono text-[#5E6B75]">
                      Provide verified information about your current wage employment.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Job Title / Designation *
                      </label>
                      <input
                        type="text"
                        required
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="e.g. Industrial Automation Electrician"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Employer / Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={employerName}
                        onChange={(e) => setEmployerName(e.target.value)}
                        placeholder="e.g. Tata Motors Ancillary Ltd."
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Employment Type
                      </label>
                      <select
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      >
                        <option value="REGULAR">Regular / Full-time</option>
                        <option value="CONTRACT">Contractual</option>
                        <option value="PART_TIME">Part-time</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Monthly Salary / Wage (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="100"
                        value={monthlySalary}
                        onChange={(e) => setMonthlySalary(e.target.value)}
                        placeholder="e.g. 21500"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Employment Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Work Location: District
                      </label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Pune"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Work Location: State
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Maharashtra"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Option 2: SELF_EMPLOYED */}
              {outcomeType === 'SELF_EMPLOYED' && (
                <div className="space-y-4">
                  <div className="border-b border-[#DCE3E7] pb-2">
                    <h3 className="font-serif font-bold text-sm text-[#16212B]">
                      Self-Employment & Enterprise Details
                    </h3>
                    <p className="text-[11px] font-mono text-[#5E6B75]">
                      Information regarding your business or independent contractor activity.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Business / Activity Type *
                      </label>
                      <input
                        type="text"
                        required
                        value={selfCategory}
                        onChange={(e) => setSelfCategory(e.target.value)}
                        placeholder="e.g. Electrical Installation & Repair Workshop"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Estimated Monthly Income / Earnings (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={selfIncome}
                        onChange={(e) => setSelfIncome(e.target.value)}
                        placeholder="e.g. 24000"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        District
                      </label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Pune"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Maharashtra"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Option 3: APPRENTICESHIP */}
              {outcomeType === 'APPRENTICESHIP' && (
                <div className="space-y-4">
                  <div className="border-b border-[#DCE3E7] pb-2">
                    <h3 className="font-serif font-bold text-sm text-[#16212B]">
                      Apprenticeship Training Details
                    </h3>
                    <p className="text-[11px] font-mono text-[#5E6B75]">
                      Information regarding your active apprenticeship contract.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Sponsoring Organisation *
                      </label>
                      <input
                        type="text"
                        required
                        value={appEmployer}
                        onChange={(e) => setAppEmployer(e.target.value)}
                        placeholder="e.g. Tata Motors Plant Operations"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Trade / Designation *
                      </label>
                      <input
                        type="text"
                        required
                        value={appTrade}
                        onChange={(e) => setAppTrade(e.target.value)}
                        placeholder="e.g. Apprentice Electrician"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Monthly Stipend (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={monthlySalary}
                        onChange={(e) => setMonthlySalary(e.target.value)}
                        placeholder="e.g. 12000"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Contract Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Contract End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Option 4: NOT_EMPLOYED */}
              {outcomeType === 'NOT_EMPLOYED' && (
                <div className="space-y-4">
                  <div className="border-b border-[#DCE3E7] pb-2">
                    <h3 className="font-serif font-bold text-sm text-[#16212B]">
                      Non-Employment Status Record
                    </h3>
                    <p className="text-[11px] font-mono text-[#5E6B75]">
                      Select the primary structured reason to assist national skill impact planning.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Primary Reason *
                      </label>
                      <select
                        value={unemploymentReason}
                        onChange={(e) => setUnemploymentReason(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      >
                        <option value="Still seeking employment">Still seeking employment</option>
                        <option value="Further education">Further education / Higher studies</option>
                        <option value="Personal reasons">Personal reasons / Family commitments</option>
                        <option value="Location constraints">Location constraints / Relocation</option>
                        <option value="Skill mismatch">Skill mismatch / Need further training</option>
                        <option value="Lack of opportunities">Lack of local opportunities</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                        Preferred Employment Sector
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Electrical / Automation / Renewable Energy"
                        className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                      Additional Notes / Circumstances
                    </label>
                    <textarea
                      rows={2}
                      value={unemploymentNotes}
                      onChange={(e) => setUnemploymentNotes(e.target.value)}
                      placeholder="Optional notes regarding employment search or location preferences..."
                      className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                    />
                  </div>
                </div>
              )}

              {/* General Notes Field */}
              <div>
                <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                  Outcome Audit Notes
                </label>
                <input
                  type="text"
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="e.g. Post-certification outcome recorded directly by trainee."
                  className="w-full px-3 py-2 bg-[#FAF7EE] border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-[#DCE3E7] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#5E6B75]">
                  Updates are directly committed to Supabase Cloud PostgreSQL with row-level security audit logs.
                </span>
                <button
                  type="submit"
                  disabled={isSubmittingOutcome || isSavedRecently}
                  className="px-5 py-2 bg-[#18324A] hover:bg-[#263B52] text-white text-xs font-mono font-bold rounded transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {isSubmittingOutcome ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : isSavedRecently ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Commit Outcome Record</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Observed Salary Progression Card */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <h3 className="font-serif font-bold text-base text-[#16212B] mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#087F8C]" />
              <span>Observed Salary Progression</span>
            </h3>
            <p className="text-[11px] font-mono text-[#5E6B75] mb-4">
              Longitudinal compensation records observed over time. Does not make causal claims.
            </p>

            {salaryProgression && salaryProgression.hasSufficientRecords ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg text-xs font-mono">
                <div>
                  <span className="text-[#5E6B75] block text-[11px]">Previous Observed Salary</span>
                  <span className="text-base font-bold text-[#16212B]">
                    ₹{salaryProgression.baselineSalary.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-[#5E6B75] mt-0.5">
                    Date: {new Date(salaryProgression.baselineDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div>
                  <span className="text-[#5E6B75] block text-[11px]">Current Observed Salary</span>
                  <span className="text-base font-bold text-emerald-800">
                    ₹{salaryProgression.currentSalary.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-[#5E6B75] mt-0.5">
                    Date: {new Date(salaryProgression.currentDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div>
                  <span className="text-[#5E6B75] block text-[11px]">Observed Absolute Change</span>
                  <span className={`text-base font-bold ${salaryProgression.absoluteChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {salaryProgression.absoluteChange >= 0 ? '+' : ''}₹{salaryProgression.absoluteChange.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-[#5E6B75] mt-0.5">Monthly difference</span>
                </div>
                <div>
                  <span className="text-[#5E6B75] block text-[11px]">Observed Percentage Change</span>
                  <span className={`text-base font-bold ${salaryProgression.percentChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {salaryProgression.percentChange >= 0 ? '+' : ''}{salaryProgression.percentChange}%
                  </span>
                  <span className="block text-[10px] text-[#5E6B75] mt-0.5">Recorded progression</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs font-mono text-[#5E6B75] border border-dashed border-[#DCE3E7] rounded-lg">
                <p>Not enough historical records to calculate salary progression.</p>
                <p className="text-[10px] mt-1 text-[#5E6B75]">
                  At least two distinct chronological compensation records are required to calculate progression.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TRAJECTORY & CHRONOLOGICAL JOURNEY                                  */}
      {/* ========================================================================= */}
      {activeTab === 'journey' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Header */}
          <div className="p-4 bg-white border border-[#DCE3E7] rounded-lg">
            <h2 className="text-lg font-serif font-bold text-[#16212B]">
              Longitudinal Career Trajectory Arc & Outcome Journey
            </h2>
            <p className="text-xs font-mono text-[#5E6B75] mt-0.5">
              Verified longitudinal progression generated from PostgreSQL registry milestones.
            </p>
          </div>

          {/* Trajectory Arc Stepper (TRAINING ➔ CERTIFICATION ➔ EMPLOYMENT ➔ RETENTION ➔ GROWTH) */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <h3 className="font-serif font-bold text-base text-[#16212B] mb-2 flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#087F8C]" />
              <span>Career Trajectory Arc</span>
            </h3>
            <p className="text-[11px] font-mono text-[#5E6B75] mb-6">
              Only displaying stages for which actual database records exist. Unreached stages marked as not yet recorded.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                {
                  stage: '01',
                  name: 'TRAINING',
                  isRecorded: trainingHistory.length > 0,
                  detail: trainingHistory.length > 0 ? `${trainingHistory[0].programme}` : 'Not yet recorded',
                  status: trainingHistory.some((t) => t.isCompleted) ? 'Completed' : trainingHistory.length > 0 ? 'In Progress' : 'Pending',
                },
                {
                  stage: '02',
                  name: 'CERTIFICATION',
                  isRecorded: certifications.length > 0,
                  detail: certifications.length > 0 ? `${certifications[0].name}` : 'Not yet recorded',
                  status: certifications.length > 0 ? 'Verified Credential' : 'Pending Assessment',
                },
                {
                  stage: '03',
                  name: 'EMPLOYMENT',
                  isRecorded: Boolean(activeEmployment || trainee.employmentStatus === 'EMPLOYED'),
                  detail: activeEmployment 
                    ? `${activeEmployment.jobTitle} at ${activeEmployment.employerName}${activeEmployment.startDate ? ` • Started ${formatDate(activeEmployment.startDate)}` : ''}` 
                    : 'Not yet recorded',
                  status: activeEmployment 
                    ? (isEmployerValidated ? 'Validated' : 'Recorded') 
                    : 'Pending Placement',
                },
                {
                  stage: '04',
                  name: 'RETENTION',
                  isRecorded: completedFollowUps.length > 0,
                  detail: completedFollowUps.length > 0 ? `${completedFollowUps.length} Verified Survey(s)` : 'Not yet recorded',
                  status: completedFollowUps.length > 0 ? 'Retention Confirmed' : 'Scheduled Follow-up',
                },
                {
                  stage: '05',
                  name: 'GROWTH',
                  isRecorded: Boolean(salaryProgression && salaryProgression.hasSufficientRecords && salaryProgression.percentChange > 0),
                  detail: salaryProgression?.hasSufficientRecords ? `+${salaryProgression.percentChange}% Observed Lift` : 'Not yet recorded',
                  status: salaryProgression?.hasSufficientRecords ? 'Progression Logged' : 'Awaiting Data',
                },
              ].map((step) => (
                <div
                  key={step.stage}
                  className={`p-3.5 rounded-lg border text-xs font-mono flex flex-col justify-between transition ${
                    step.isRecorded
                      ? 'border-[#087F8C] bg-[#E7F5F4]/40'
                      : 'border-[#DCE3E7] bg-slate-50 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-[#5E6B75]">{step.stage}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        step.isRecorded 
                          ? (step.stage === '03' && !isEmployerValidated
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800')
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                    <span className="font-serif font-bold text-xs text-[#16212B] block">{step.name}</span>
                    <p className="text-[11px] text-[#5E6B75] mt-1 line-clamp-2">{step.detail}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#DCE3E7]/60 text-[10px] text-[#5E6B75]">
                    {step.isRecorded 
                      ? (step.stage === '03' && !isEmployerValidated 
                          ? '○ Reported by trainee' 
                          : '✓ Verified in PostgreSQL') 
                      : '○ Not yet recorded'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chronological Outcome History */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <h3 className="font-serif font-bold text-base text-[#16212B] mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#087F8C]" />
              <span>Chronological Outcome History</span>
              <span className="text-xs font-mono text-[#5E6B75] font-normal">({journeyEvents.length} events logged)</span>
            </h3>

            {journeyEvents.length > 0 ? (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-[#DCE3E7]">
                {journeyEvents.map((event, idx) => {
                  const isEmployment = event.type === 'EMPLOYMENT_PLACED';
                  const matchingEmp = isEmployment
                    ? (dossier.employmentRecords || []).find((e) => e.employerName === event.organization || event.title.includes(e.jobTitle)) || activeEmployment
                    : null;
                  return (
                    <div key={idx} className="relative flex items-start gap-4 pl-8 text-xs font-mono">
                      <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#087F8C] shrink-0" />
                      <div className="flex-1 p-3.5 bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-[#16212B] text-sm">{event.title}</span>
                          <span className="text-[10px] font-mono text-[#5E6B75]">{formatDate(event.date)}</span>
                        </div>
                        <div className="text-[11px] text-[#5E6B75] mt-1 flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white border border-[#DCE3E7] font-semibold text-[#18324A]">
                            {event.type}
                          </span>
                          <span>•</span>
                          <span>{event.organization}</span>
                          {matchingEmp && matchingEmp.monthlySalary > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">
                                ₹{matchingEmp.monthlySalary.toLocaleString('en-IN')}/mo
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-[10px] text-[#5E6B75]">
                            Source: {isEmployment ? 'Trainee outcome submission' : 'Institutional Registry'}
                          </span>
                          <span>•</span>
                          <span className={`font-semibold ${
                            isEmployment && !isEmployerValidated
                              ? 'text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200'
                              : 'text-emerald-700'
                          }`}>
                            {isEmployment ? (isEmployerValidated ? 'Validated' : 'Recorded') : event.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs font-mono text-[#5E6B75] border border-dashed border-[#DCE3E7] rounded-lg">
                <p>No outcome history records logged yet.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FOLLOW-UP SYSTEM & ACTION LEDGER                                   */}
      {/* ========================================================================= */}
      {activeTab === 'followups' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Header */}
          <div className="p-4 bg-white border border-[#DCE3E7] rounded-lg">
            <h2 className="text-lg font-serif font-bold text-[#16212B]">
              Longitudinal Outcome Follow-up Registry & Action Ledger
            </h2>
            <p className="text-xs font-mono text-[#5E6B75] mt-0.5">
              Structured retention pulses and verified audit records tracked via Supabase Edge Function & RPC.
            </p>
          </div>

          {/* Pending Follow-ups */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <h3 className="font-serif font-bold text-base text-[#16212B] mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-600" />
              <span>Assigned Follow-ups Requiring Response</span>
              <span className="text-xs font-mono text-[#5E6B75] font-normal">({pendingFollowUps.length})</span>
            </h3>

            {pendingFollowUps.length > 0 ? (
              <div className="space-y-3">
                {pendingFollowUps.map((fu) => (
                  <div key={fu.id} className="p-4 border border-amber-200 bg-amber-50/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {fu.status}
                        </span>
                        <span className="text-[#5E6B75]">ID: {fu.id}</span>
                      </div>
                      <p className="text-[#16212B] font-bold mt-1 text-sm">
                        {fu.notes || 'Scheduled Longitudinal Employment & Skill Retention Review'}
                      </p>
                      <p className="text-[11px] text-[#5E6B75] mt-0.5">
                        Scheduled Date: {new Date(fu.scheduledAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFollowUpId(fu.id);
                        setIsSurveyModalOpen(true);
                      }}
                      className="px-4 py-2 bg-[#18324A] hover:bg-[#263B52] text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Complete Survey</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs font-mono text-[#5E6B75] border border-dashed border-[#DCE3E7] rounded-lg">
                <p>No follow-ups are currently assigned.</p>
              </div>
            )}
          </div>

          {/* Completed Follow-ups History */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <h3 className="font-serif font-bold text-base text-[#16212B] mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Completed Follow-up Submissions</span>
              <span className="text-xs font-mono text-[#5E6B75] font-normal">({completedFollowUps.length})</span>
            </h3>

            {completedFollowUps.length > 0 ? (
              <div className="space-y-3">
                {completedFollowUps.map((fu) => (
                  <div key={fu.id} className="p-4 border border-[#DCE3E7] bg-[#FAF7EE] rounded-lg text-xs font-mono">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {fu.status}
                        </span>
                        <span className="text-[#5E6B75]">ID: {fu.id}</span>
                      </div>
                      <span className="text-[11px] text-[#5E6B75]">
                        Date: {new Date(fu.scheduledAt).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <p className="text-[#16212B] font-medium">{fu.notes}</p>
                    <div className="mt-3 pt-2 border-t border-[#DCE3E7] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#5E6B75]">
                      <div>
                        <span>Status: </span>
                        <strong className="text-[#16212B]">{fu.employmentStatus || 'Employed'}</strong>
                      </div>
                      <div>
                        <span>Salary: </span>
                        <strong className="text-[#16212B]">{fu.monthlySalary ? `₹${fu.monthlySalary}` : 'Recorded'}</strong>
                      </div>
                      <div>
                        <span>Retention: </span>
                        <strong className="text-[#16212B]">{fu.retentionStatus || 'Retained'}</strong>
                      </div>
                      <div>
                        <span>Skill Alignment: </span>
                        <strong className="text-[#16212B]">{fu.skillRelevance || 'Relevant'}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs font-mono text-[#5E6B75] border border-dashed border-[#DCE3E7] rounded-lg">
                <p>No completed follow-ups recorded yet.</p>
              </div>
            )}
          </div>

          {/* Action Ledger */}
          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <h3 className="font-serif font-bold text-base text-[#16212B] mb-2 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#087F8C]" />
              <span>Action Ledger</span>
            </h3>
            <p className="text-[11px] font-mono text-[#5E6B75] mb-4">
              Real aggregated registry entries from training, certification, follow-ups, and outcome logs.
            </p>

            {actionLedgerItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-[#DCE3E7] text-left text-[#5E6B75] bg-slate-50">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Event / Action</th>
                      <th className="py-2.5 px-3">Role & Employer</th>
                      <th className="py-2.5 px-3">Monthly Wage</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionLedgerItems.map((item) => (
                      <tr key={item.id} className="border-b border-[#DCE3E7] hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-[#5E6B75] whitespace-nowrap">{item.date}</td>
                        <td className="py-2.5 px-3 font-bold text-[#16212B]">{item.action}</td>
                        <td className="py-2.5 px-3 text-[#16212B]">{item.roleOrg}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-800">{item.wage}</td>
                        <td className="py-2.5 px-3 text-[#5E6B75] text-[11px]">{item.source}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.isValidated
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-xs font-mono text-[#5E6B75] border border-dashed border-[#DCE3E7] rounded-lg">
                <p>No action ledger records available.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SKILL GAPS & COMPETENCY REGISTRY                                    */}
      {/* ========================================================================= */}
      {activeTab === 'skills' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Header */}
          <div className="p-4 bg-white border border-[#DCE3E7] rounded-lg">
            <h2 className="text-lg font-serif font-bold text-[#16212B]">
              Competency Evaluation & Skill Gap Analysis
            </h2>
            <p className="text-xs font-mono text-[#5E6B75] mt-0.5">
              Assessed skill benchmarks and recommended interventions from authorized training providers.
            </p>
          </div>

          {skillActionNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs font-mono text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{skillActionNotice}</span>
            </div>
          )}

          <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
            <h3 className="font-serif font-bold text-base text-[#16212B] mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#087F8C]" />
              <span>Assessed Skills</span>
              <span className="text-xs font-mono text-[#5E6B75] font-normal">({skillGaps.length} competencies)</span>
            </h3>

            {skillGaps.length > 0 ? (
              <div className="space-y-4">
                {skillGaps.map((sg) => {
                  const score = Math.round(sg.overallScore);
                  const benchmark = 80;
                  const gap = score - benchmark;
                  const statusLabel = gap > 0 ? 'Exceeds Benchmark' : gap === 0 ? 'At Benchmark' : 'Below Benchmark';
                  const isBelow = gap < 0;

                  return (
                    <div key={sg.id} className="p-4 border border-[#DCE3E7] rounded-lg bg-[#FAF7EE] text-xs font-mono space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-serif font-bold text-sm text-[#16212B]">{sg.skillName}</h4>
                          <span className="text-[11px] text-[#5E6B75]">
                            Assessed by: {sg.assessorType} • Date: {new Date(sg.assessmentDate).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isBelow ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {statusLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800">
                            Severity: {sg.severity}
                          </span>
                        </div>
                      </div>

                      {/* Score Comparison Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span>Current Observed Score: <strong className="text-[#16212B]">{score}%</strong></span>
                          <span>Industry Benchmark: <strong className="text-[#5E6B75]">{benchmark}%</strong></span>
                          <span className={gap >= 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                            Gap: {gap >= 0 ? `+${gap}%` : `${gap}%`}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full ${isBelow ? 'bg-amber-500' : 'bg-[#087F8C]'}`}
                            style={{ width: `${Math.min(score, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Intervention & Action */}
                      <div className="pt-2 border-t border-[#DCE3E7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                        <div>
                          <span className="text-[#5E6B75]">Recommended Action: </span>
                          <span className="font-medium text-[#16212B]">
                            {sg.interventionType || 'Standard Competency Upkeep'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRequestAssessment(sg.id, sg.skillName)}
                          disabled={requestingSkillId === sg.id}
                          className="px-3 py-1 bg-white border border-[#DCE3E7] hover:border-[#18324A] text-[#18324A] rounded font-bold transition flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {requestingSkillId === sg.id ? 'Scheduling...' : 'Request Re-Assessment'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs font-mono text-[#5E6B75] border border-dashed border-[#DCE3E7] rounded-lg space-y-3">
                <p className="text-sm font-serif font-bold text-[#16212B]">No competency assessment available yet.</p>
                <p className="text-[11px] text-[#5E6B75] max-w-md mx-auto">
                  Formal skill gap evaluations and benchmark assessments are recorded after course module completion or follow-up reviews.
                </p>
                <button
                  onClick={() => handleRequestAssessment('general_competency', 'General Competency Evaluation')}
                  disabled={requestingSkillId === 'general_competency'}
                  className="px-4 py-2 bg-[#18324A] hover:bg-[#263B52] text-white rounded text-xs font-mono font-bold transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{requestingSkillId === 'general_competency' ? 'Submitting Request...' : 'Request Assessment'}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}
      {/* Profile & Consent Modal */}
      {isProfileModalOpen && (
        <TraineeProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          traineeId={trainee.id}
          initialData={{
            name: trainee.name,
            contactNumber: trainee.contactNumber || '',
            education: trainee.education || '',
            district: trainee.district || '',
            state: trainee.state || '',
            region: trainee.region || '',
            currentOccupation: trainee.currentOccupation || '',
            experienceYears: trainee.experienceYears || 0,
            skills: trainee.skills || [],
            consentStatus: trainee.consentStatus || '',
            consentTimestamp: trainee.consentTimestamp || '',
          }}
          onSuccess={() => loadTraineeData(true)}
        />
      )}

      {/* Follow-up Survey Modal */}
      {isSurveyModalOpen && selectedFollowUpId && (
        <FollowUpSurveyModal
          isOpen={isSurveyModalOpen}
          onClose={() => setIsSurveyModalOpen(false)}
          followUpId={selectedFollowUpId}
          traineeId={trainee.id}
          currentSalary={activeEmployment?.monthlySalary}
          onSuccess={() => {
            loadTraineeData(true);
            setSelectedFollowUpId('');
          }}
        />
      )}

    </div>
  );
}
