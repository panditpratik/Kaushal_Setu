import { useState } from 'react';
import { traineeService } from '../lib/api';
import { X, Award, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface AddCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  traineeId: string;
  onSuccess: () => void;
}

export function AddCertificateModal({
  isOpen,
  onClose,
  traineeId,
  onSuccess,
}: AddCertificateModalProps) {
  const [certName, setCertName] = useState('');
  const [issuingBody, setIssuingBody] = useState('NCVET Authorized Body');
  const [certNumber, setCertNumber] = useState('');
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().split('T')[0]);
  const [courseTitle, setCourseTitle] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim()) {
      setError('Please provide the certificate or credential name.');
      return;
    }
    if (!certNumber.trim()) {
      setError('Please provide a certificate or credential number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await traineeService.addCertificate({
        trainee_id: traineeId,
        certificate_name: certName.trim(),
        issuing_body: issuingBody.trim() || 'NCVET Authorized Body',
        certificate_number: certNumber.trim(),
        issued_at: issuedAt || new Date().toISOString().split('T')[0],
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add certificate:', err);
      setError(err.message || 'Unable to record certificate in database.');
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
            <Award className="w-5 h-5 text-[#18324A]" />
            <div>
              <h3 className="font-serif font-bold text-base text-[#16212B]">
                Register New Qualification / Certificate
              </h3>
              <p className="text-[11px] font-mono text-[#5E6B75]">
                Persist verified credential record to National Skill Registry
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
              Certificate / Credential Title *
            </label>
            <input
              type="text"
              required
              value={certName}
              onChange={(e) => setCertName(e.target.value)}
              placeholder="e.g. Certified Industrial Electrician & PLC Specialist"
              className="w-full px-3 py-2 bg-white border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
              Issuing Body / Training Authority *
            </label>
            <input
              type="text"
              required
              value={issuingBody}
              onChange={(e) => setIssuingBody(e.target.value)}
              placeholder="e.g. NCVET / Skill India Mission"
              className="w-full px-3 py-2 bg-white border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                Certificate / Credential No. *
              </label>
              <input
                type="text"
                required
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                placeholder="e.g. NCVET/2026/09441"
                className="w-full px-3 py-2 bg-white border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#16212B] mb-1">
              Associated Programme / Course (Optional)
            </label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g. Industrial Electrician & Automation Diagnostics"
              className="w-full px-3 py-2 bg-white border border-[#DCE3E7] rounded text-xs font-mono text-[#16212B] focus:outline-none focus:border-[#18324A]"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800">
            Recorded certificates are cryptographically linked to your Trainee Registry Profile and become visible immediately across Trainee, Provider, and Government dossiers.
          </div>

          <div className="pt-3 border-t border-[#DCE3E7] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-[#DCE3E7] text-[#16212B] rounded cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#18324A] hover:bg-[#263B52] text-white rounded font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Certificate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
