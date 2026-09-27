import { useState } from 'react';
import { traineeService } from '../lib/api';
import { 
  X, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  Award,
  TrendingUp
} from 'lucide-react';

interface FollowUpSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUpId: string;
  traineeId: string;
  currentSalary?: number;
  onSuccess: () => void;
}

export function FollowUpSurveyModal({
  isOpen,
  onClose,
  followUpId,
  traineeId,
  currentSalary,
  onSuccess,
}: FollowUpSurveyModalProps) {
  const [employmentStatus, setEmploymentStatus] = useState('Employed');
  const [monthlySalary, setMonthlySalary] = useState<number>(currentSalary ?? 0);
  const [retentionStatus, setRetentionStatus] = useState('Retained in same role');
  const [skillRelevance, setSkillRelevance] = useState('High');
  const [roleRelevance, setRoleRelevance] = useState('Directly aligned with vocational training');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await traineeService.submitFollowUpSurvey({
        followUpId: followUpId,
        trainee_id: traineeId,
        employment_status: employmentStatus,
        monthly_salary: monthlySalary,
        retention_status: retentionStatus,
        skill_relevance: skillRelevance,
        role_relevance: roleRelevance,
        reason_notes: notes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit follow up survey:', err);
      setError(err.message || 'Failed to persist follow-up record to PostgreSQL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#DCE3E7] bg-white">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#18324A]" />
            <div>
              <h3 className="font-serif font-bold text-base text-[#16212B]">
                Longitudinal Outcome Follow-up Survey
              </h3>
              <p className="text-[11px] font-mono text-[#5E6B75]">
                Periodic Employment & Skill Retention Pulse
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#5E6B75] hover:text-[#16212B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Employment Status */}
          <div>
            <label className="block text-[11px] text-[#5E6B75] uppercase mb-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-[#5E6B75]" />
              Current Employment Status
            </label>
            <select
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
              className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
            >
              <option value="Employed">Employed (Formal Payroll / Industry)</option>
              <option value="Self-employed">Self-employed / Micro-Enterprise</option>
              <option value="Apprenticeship">Apprenticeship (NAPS / Industrial Training)</option>
              <option value="Seeking employment">Seeking employment / Transitioning</option>
              <option value="Not employed">Not employed / Higher Education</option>
            </select>
          </div>

          {/* Monthly Compensation */}
          <div>
            <label className="block text-[11px] text-[#5E6B75] uppercase mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-[#5E6B75]" />
              Current Monthly Compensation / Income (₹)
            </label>
            <input
              type="number"
              min="0"
              max="500000"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(parseFloat(e.target.value) || 0)}
              required
              className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
            />
          </div>

          {/* Retention Status */}
          <div>
            <label className="block text-[11px] text-[#5E6B75] uppercase mb-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#5E6B75]" />
              Retention Status
            </label>
            <select
              value={retentionStatus}
              onChange={(e) => setRetentionStatus(e.target.value)}
              className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
            >
              <option value="Retained in same role">Retained in same role & organization</option>
              <option value="Promoted with wage increase">Promoted / Elevated with wage increase</option>
              <option value="Changed company (Lateral)">Changed employer / Lateral move</option>
              <option value="Transitioned to self-employment">Transitioned to self-employment</option>
              <option value="Left workforce temporarily">Left workforce / Sabbatical</option>
            </select>
          </div>

          {/* Skill Relevance */}
          <div>
            <label className="block text-[11px] text-[#5E6B75] uppercase mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#5E6B75]" />
              Skill Relevance in Current Job
            </label>
            <select
              value={skillRelevance}
              onChange={(e) => setSkillRelevance(e.target.value)}
              className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
            >
              <option value="High">High: Daily application of core technical training</option>
              <option value="Moderate">Moderate: Partial usage of vocational tools & concepts</option>
              <option value="Low">Low: Minimal technical crossover</option>
              <option value="Not applicable">Not applicable: Completely different domain</option>
            </select>
          </div>

          {/* Role Relevance */}
          <div>
            <label className="block text-[11px] text-[#5E6B75] uppercase mb-1">
              Role Alignment with Curriculum
            </label>
            <select
              value={roleRelevance}
              onChange={(e) => setRoleRelevance(e.target.value)}
              className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
            >
              <option value="Directly aligned with vocational training">Directly aligned with vocational training</option>
              <option value="Supervisory / Diagnostic escalation">Supervisory / Diagnostic escalation</option>
              <option value="Allied industrial sector">Allied industrial sector</option>
              <option value="Other">Other sector</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] text-[#5E6B75] uppercase mb-1">
              Comments / Notes on Career Trajectory
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE3E7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#EDE8D5] text-[#18324A] rounded text-xs font-mono border border-[#DCE3E7] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#18324A] hover:bg-[#0F253B] disabled:opacity-50 text-white rounded text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Submitting...' : 'Submit Follow-Up Pulse'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default FollowUpSurveyModal;
