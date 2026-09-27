import { useState } from 'react';
import { traineeService } from '../lib/api';
import { 
  X, 
  User, 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface TraineeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  traineeId: string;
  initialData?: {
    name?: string;
    contactNumber?: string;
    education?: string;
    district?: string;
    state?: string;
    region?: string;
    currentOccupation?: string;
    experienceYears?: number;
    skills?: string[];
    consentStatus?: string;
    consentTimestamp?: string;
  };
  onSuccess: () => void;
}

export function TraineeProfileModal({
  isOpen,
  onClose,
  traineeId,
  initialData,
  onSuccess,
}: TraineeProfileModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [contactNumber, setContactNumber] = useState(initialData?.contactNumber || '');
  const [education, setEducation] = useState(initialData?.education || 'ITI Diploma (Electrical)');
  const [district, setDistrict] = useState(initialData?.district || 'Pune');
  const [state, setState] = useState(initialData?.state || 'Maharashtra');
  const [region, setRegion] = useState(initialData?.region || 'Western Zone');
  const [currentOccupation, setCurrentOccupation] = useState(initialData?.currentOccupation || 'Sr. Industrial Electrician');
  const [experienceYears, setExperienceYears] = useState<number>(initialData?.experienceYears || 2);
  const [skillsStr, setSkillsStr] = useState((initialData?.skills || ['PLC Diagnostics', 'Control Wiring', 'Panel Maintenance']).join(', '));
  
  const [consentGranted, setConsentGranted] = useState(
    initialData?.consentStatus ? initialData.consentStatus === 'CONSENTED' : true
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const skillsArray = skillsStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      await traineeService.updateProfileAndConsent({
        trainee_id: traineeId,
        name,
        contact_number: contactNumber,
        education,
        district,
        state,
        region,
        current_occupation: currentOccupation,
        experience_years: experienceYears,
        skills: skillsArray,
        consent_status: consentGranted ? 'CONSENTED' : 'REVOKED',
        consent_version: 'DPDP_2023_V1',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update profile & consent:', err);
      setError(err.message || 'Failed to persist profile updates to PostgreSQL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF7EE] border border-[#DCE3E7] rounded-lg max-w-xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#DCE3E7] bg-white">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#18324A]" />
            <div>
              <h3 className="font-serif font-bold text-base text-[#16212B]">
                Trainee Profile & DPDP Outcome Consent
              </h3>
              <p className="text-[11px] font-mono text-[#5E6B75]">
                Sovereign NCVET Registry · Real PostgreSQL Record
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

          {/* Name & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#5E6B75] uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#5E6B75] uppercase mb-1">
                Contact Number
              </label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
              />
            </div>
          </div>

          {/* Education & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#5E6B75] uppercase mb-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#5E6B75]" />
                Highest Education
              </label>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
              >
                <option value="10th Standard / Matric">10th Standard / Matric</option>
                <option value="12th Standard / Higher Secondary">12th Standard / Higher Secondary</option>
                <option value="ITI Diploma (Electrical)">ITI Diploma (Electrical)</option>
                <option value="Polytechnic Diploma">Polytechnic Diploma</option>
                <option value="Graduate / B.Voc">Graduate / B.Voc</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#5E6B75] uppercase mb-1">
                Experience (Years)
              </label>
              <input
                type="number"
                min="0"
                max="40"
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
              />
            </div>
          </div>

          {/* Location Details (Aggregated Geography) */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-[#5E6B75] uppercase mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#5E6B75]" />
                District
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#5E6B75] uppercase mb-1">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#5E6B75] uppercase mb-1">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
              />
            </div>
          </div>

          {/* Current Occupation & Skills */}
          <div>
            <label className="block text-[11px] text-[#5E6B75] uppercase mb-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-[#5E6B75]" />
              Current Occupation / Designation
            </label>
            <input
              type="text"
              value={currentOccupation}
              onChange={(e) => setCurrentOccupation(e.target.value)}
              className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#5E6B75] uppercase mb-1">
              Relevant Skills (Comma separated)
            </label>
            <input
              type="text"
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder="e.g. PLC Troubleshooting, Industrial Wiring, Sensor Calibration"
              className="w-full p-2 bg-white border border-[#DCE3E7] rounded text-xs text-[#16212B] focus:border-[#18324A] outline-none"
            />
          </div>

          {/* DPDP ACT 2023 LONGITUDINAL CONSENT SECTION */}
          <div className="p-4 bg-white border border-[#087F8C] rounded-lg space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#087F8C]" />
              <span className="font-bold text-xs text-[#18324A]">
                Consent to Longitudinal Outcome Tracking
              </span>
            </div>

            <p className="text-[11px] text-[#5E6B75] leading-relaxed">
              In accordance with the <strong>Digital Personal Data Protection (DPDP) Act 2023</strong>, KaushalSetu uses your submitted vocational information exclusively for:
            </p>

            <ul className="list-disc list-inside text-[11px] text-[#5E6B75] space-y-0.5">
              <li>Employment outcome tracking & salary progression measurement</li>
              <li>Post-training workforce retention analysis (3M, 6M, 12M milestones)</li>
              <li>Skill-gap diagnosis & personalized upskilling recommendations</li>
              <li>Aggregated, anonymized national policy analytics for MSDE</li>
            </ul>

            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none border-t border-[#EDE8D5]">
              <input
                type="checkbox"
                checked={consentGranted}
                onChange={(e) => setConsentGranted(e.target.checked)}
                className="mt-0.5 rounded text-[#087F8C] focus:ring-[#087F8C]"
              />
              <span className="text-[11px] font-semibold text-[#16212B]">
                I grant consent for longitudinal outcome tracking under version DPDP_2023_V1. I understand I can revoke this consent at any time.
              </span>
            </label>
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
              <span>{loading ? 'Saving to Database...' : 'Save Profile & Consent'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default TraineeProfileModal;
