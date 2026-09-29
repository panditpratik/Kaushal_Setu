import { X, Calendar, Building2, ShieldCheck, Clock, Award, Briefcase, FileCheck, CheckCircle2, BookOpen } from 'lucide-react';

export interface JourneyMilestone {
  date: string;
  title: string;
  type: string;
  status: string;
  organization?: string;
  details?: string;
}

interface JourneyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: JourneyMilestone | null;
  isValidatedByEmployer?: boolean;
}

export function JourneyDetailModal({
  isOpen,
  onClose,
  event,
  isValidatedByEmployer = false,
}: JourneyDetailModalProps) {
  if (!isOpen || !event) return null;

  const isEmployment = event.type === 'EMPLOYMENT_PLACED';
  const isCertification = event.type === 'CERTIFICATION_ISSUED';
  const isTraining = event.type === 'TRAINING_ENROLLED' || event.type === 'TRAINING_COMPLETED';
  const isFollowUp = event.type === 'FOLLOW_UP_SCHEDULED' || event.type === 'FOLLOW_UP_COMPLETED';

  const getIcon = () => {
    if (isCertification) return <Award className="w-5 h-5 text-[#087F8C]" />;
    if (isEmployment) return <Briefcase className="w-5 h-5 text-emerald-600" />;
    if (isFollowUp) return <FileCheck className="w-5 h-5 text-amber-600" />;
    if (isTraining) return <BookOpen className="w-5 h-5 text-[#18324A]" />;
    return <Calendar className="w-5 h-5 text-[#18324A]" />;
  };

  const formattedDate = event.date 
    ? new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Recorded in Registry';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#DCE3E7] bg-white">
          <div className="flex items-center gap-2.5">
            {getIcon()}
            <div>
              <h3 className="font-serif font-bold text-base text-[#16212B]">
                Milestone Telemetry Record
              </h3>
              <p className="text-[11px] font-mono text-[#5E6B75]">
                Event Type: {event.type}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-[#5E6B75] hover:text-[#16212B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs font-mono">
          
          {/* Main Title & Organization */}
          <div className="p-4 bg-white border border-[#DCE3E7] rounded-lg">
            <span className="text-[10px] uppercase font-bold text-[#087F8C] block mb-1">
              Milestone Name
            </span>
            <h4 className="font-serif font-bold text-base text-[#16212B]">
              {event.title}
            </h4>
            <div className="flex items-center gap-2 mt-2 text-[#5E6B75]">
              <Building2 className="w-4 h-4 text-[#18324A]" />
              <span className="font-medium text-[#16212B]">{event.organization || 'National Skill Registry'}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-[#DCE3E7] rounded-lg">
              <span className="text-[10px] text-[#5E6B75] block">Date Recorded</span>
              <span className="font-bold text-[#16212B]">{formattedDate}</span>
            </div>

            <div className="p-3 bg-white border border-[#DCE3E7] rounded-lg">
              <span className="text-[10px] text-[#5E6B75] block">Validation Status</span>
              {isEmployment ? (
                isValidatedByEmployer ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Validated by Employer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Reported by Trainee
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-[#18324A]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {event.status || 'Verified'}
                </span>
              )}
            </div>
          </div>

          {/* Verification Protocol Notice */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Cryptographic Registry Audit Trail</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              {isEmployment
                ? isValidatedByEmployer
                  ? 'This employment outcome has been confirmed directly by the employer organization through the authenticated employer verification portal.'
                  : 'This employment record was reported by the candidate and is currently pending institutional employer verification in accordance with national protocol.'
                : 'This longitudinal milestone is authenticated against Supabase PostgreSQL ledger records and verified provider cohorts.'}
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#18324A] hover:bg-[#263B52] text-white rounded font-bold cursor-pointer transition"
            >
              Close Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
