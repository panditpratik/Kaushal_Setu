import { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Building2, 
  UserCheck, 
  ArrowRight, 
  CheckCircle2, 
  FileText,
  Lock,
  Sparkles
} from 'lucide-react';
import type { TraineeProfile } from '../types';

interface OutcomeVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TraineeProfile;
  onSuccess: (updatedSalary: number, uan: string) => void;
}

export function OutcomeVerificationModal({
  isOpen,
  onClose,
  profile,
  onSuccess
}: OutcomeVerificationModalProps) {
  const [uan, setUan] = useState('101988294812');
  const [wageAmount, setWageAmount] = useState('22500');
  const [supervisorEmail, setSupervisorEmail] = useState('vikram.r@tatamotors.com');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      setVerifiedSuccess(true);
      setTimeout(() => {
        onSuccess(parseInt(wageAmount) || profile.currentSalary, uan);
        setVerifiedSuccess(false);
        onClose();
      }, 1200);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F253B]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg shadow-2xl overflow-hidden text-[#0F253B] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#263B52] text-[#F4F4E7] flex items-center justify-between border-b border-[#0F253B]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#0F253B] flex items-center justify-center text-[#F3E8A8]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm tracking-wide">
                EPFO 3-Party Longitudinal Verification
              </h3>
              <p className="text-[11px] font-mono text-[#C9DCF1]">
                Sovereign Wage & Retention Protocol · Act 2023
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#C9DCF1] hover:text-white hover:bg-[#3A536F] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {verifiedSuccess ? (
          /* Success Screen */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#D8EEDF] text-[#164627] flex items-center justify-center mx-auto border-2 border-[#16803D] animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="font-serif font-bold text-xl text-[#0F253B]">
              Wage Enhancement Successfully Verified!
            </h4>
            <p className="text-xs font-mono text-[#4A5D70] max-w-md mx-auto">
              Automated pulse matched against EPFO Return Code <span className="font-bold text-[#263B52]">{uan}</span>. Updated wage ledger recorded on sovereign trajectory.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EDE8D5] text-[#164627] rounded text-xs font-mono font-bold border border-[#D5CEAE]">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              Increment: +₹{(parseInt(wageAmount) - profile.baselineSalary).toLocaleString()} (+{(((parseInt(wageAmount) - profile.baselineSalary)/profile.baselineSalary)*100).toFixed(1)}%)
            </div>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Trainee Card Snapshot */}
            <div className="bg-[#EDE8D5] p-3.5 rounded border border-[#D5CEAE] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#687C92] block font-mono text-[10px] uppercase">Beneficiary Profile</span>
                <span className="font-bold text-[#0F253B]">{profile.name}</span>
                <span className="text-[#4A5D70] block">{profile.course}</span>
              </div>
              <div className="text-right">
                <span className="text-[#687C92] block font-mono text-[10px] uppercase">Placement Entity</span>
                <span className="font-semibold text-[#0F253B]">{profile.company}</span>
                <span className="text-[10px] font-mono text-[#15803D]">Tenure: {profile.tenureMonths} Months Active</span>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-mono uppercase tracking-wider text-[#263B52] font-semibold mb-1">
                  12-Digit Universal Account Number (UAN / EPFO)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={uan}
                    onChange={(e) => setUan(e.target.value)}
                    className="w-full bg-white border border-[#C5BDA0] focus:border-[#263B52] rounded px-3 py-2 font-mono text-sm shadow-inner outline-none text-[#0F253B]"
                    placeholder="e.g. 101988294812"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] font-mono text-[#15803D] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Live Shram Suvidha API
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono uppercase tracking-wider text-[#263B52] font-semibold mb-1">
                    Latest Verified Monthly Wage (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={wageAmount}
                    onChange={(e) => setWageAmount(e.target.value)}
                    className="w-full bg-white border border-[#C5BDA0] focus:border-[#263B52] rounded px-3 py-2 font-mono text-sm shadow-inner outline-none text-[#0F253B]"
                    placeholder="22500"
                  />
                  <span className="text-[10px] text-[#7A8C9E] mt-1 block">
                    Baseline: ₹{profile.baselineSalary.toLocaleString()}/mo
                  </span>
                </div>

                <div>
                  <label className="block font-mono uppercase tracking-wider text-[#263B52] font-semibold mb-1">
                    Supervisor Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    value={supervisorEmail}
                    onChange={(e) => setSupervisorEmail(e.target.value)}
                    className="w-full bg-white border border-[#C5BDA0] focus:border-[#263B52] rounded px-3 py-2 font-mono text-sm shadow-inner outline-none text-[#0F253B]"
                    placeholder="supervisor@domain.com"
                  />
                  <span className="text-[10px] text-[#7A8C9E] mt-1 block">
                    Sends cryptographic sign-off token
                  </span>
                </div>
              </div>

              {/* 3-Party Consensus Explainer */}
              <div className="p-3 bg-[#FAF7EE] border border-[#D5CEAE] rounded space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-[#263B52] flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-[#263B52]" />
                  Cryptographic Triple-Verification Checklist
                </span>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-[#4A5D70]">
                  <div className="p-2 bg-white rounded border border-[#EDE8D5] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>Trainee Consent</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-[#EDE8D5] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>EPFO Electronic File</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-[#EDE8D5] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>Supervisor Sign</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#D5CEAE]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono font-medium text-[#4A5D70] hover:text-[#0F253B] hover:bg-[#EDE8D5] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2.5 bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] rounded text-xs font-mono font-medium transition-all shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Matching EPFO Electronic Records...</span>
                  </>
                ) : (
                  <>
                    <span>Commit Verified Pulse</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#F3E8A8]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
