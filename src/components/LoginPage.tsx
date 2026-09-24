import { useState } from 'react';
import type { StakeholderRole, AppView } from '../types';
import { 
  ShieldCheck, 
  KeyRound, 
  ArrowRight, 
  Building2, 
  GraduationCap, 
  Landmark, 
  UserCheck, 
  Lock, 
  CheckCircle2, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: StakeholderRole, targetView: AppView) => void;
  onNavigateHome: () => void;
}

export function LoginPage({ onLogin, onNavigateHome }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<StakeholderRole>('trainee');
  const [identifier, setIdentifier] = useState('9876543210');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState(['8', '4', '9', '2', '0', '1']);
  const [countdown, setCountdown] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);

  const roleConfigs = [
    {
      role: 'trainee' as StakeholderRole,
      index: '01',
      title: 'Trainee & Alumni',
      subtitle: 'Aadhaar / Mobile / DigiLocker',
      defaultId: '9876543210',
      idLabel: 'Registered Mobile / Aadhaar Virtual ID',
      placeholder: 'Enter 10-digit mobile or 16-digit VID',
      icon: GraduationCap,
      targetView: 'trainee-dashboard' as AppView,
      demoName: 'Priya Sharma (Level 4 Industrial Electrician)',
      ssoProvider: 'DigiLocker National Locker'
    },
    {
      role: 'employer' as StakeholderRole,
      index: '02',
      title: 'Hiring Employer',
      subtitle: 'Corporate GSTIN / EPFO LIN',
      defaultId: 'GSTIN27AABCT2391K1Z2',
      idLabel: 'Corporate GSTIN or Shram Suvidha LIN',
      placeholder: 'e.g. 27AABCT2391K1Z2',
      icon: Building2,
      targetView: 'employer-dashboard' as AppView,
      demoName: 'Tata Motors Ancillary Ltd. (Chakan Unit)',
      ssoProvider: 'Shram Suvidha Single Window'
    },
    {
      role: 'provider' as StakeholderRole,
      index: '03',
      title: 'Training Partner (TP/ITI)',
      subtitle: 'SMART ID / SIP Portal Code',
      defaultId: 'TP-SMART-MH-9481',
      idLabel: 'SMART / NSDC Training Center ID',
      placeholder: 'e.g. TC-401-PUN-09',
      icon: UserCheck,
      targetView: 'provider-dashboard' as AppView,
      demoName: 'Centurion Skill Academy (Pune Metro)',
      ssoProvider: 'Skill India Digital Hub (SIDH)'
    },
    {
      role: 'government' as StakeholderRole,
      index: '04',
      title: 'Mission & Government',
      subtitle: 'Parichay SSO / Jan Samarth',
      defaultId: 'officer.deshmukh@msde.gov.in',
      idLabel: 'NIC / Parichay Official Email',
      placeholder: 'name.domain@gov.in / nic.in',
      icon: Landmark,
      targetView: 'government-dashboard' as AppView,
      demoName: 'MSDE State Directorate (Maharashtra SSM)',
      ssoProvider: 'Parichay Sovereign Auth (NIC)'
    }
  ];

  const currentConfig = roleConfigs.find(r => r.role === selectedRole) || roleConfigs[0];

  const handleRoleSelect = (role: StakeholderRole) => {
    setSelectedRole(role);
    const cfg = roleConfigs.find(r => r.role === role);
    if (cfg) {
      setIdentifier(cfg.defaultId);
    }
    setOtpSent(false);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setOtpSent(true);
    setCountdown(45);
  };

  const handleVerifyAndEnter = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onLogin(selectedRole, currentConfig.targetView);
    }, 600);
  };

  const handleQuickDemoEnter = (role: StakeholderRole, view: AppView) => {
    onLogin(role, view);
  };

  return (
    <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col justify-between selection:bg-[#263B52] selection:text-white">
      {/* Top Banner Navigation */}
      <div className="border-b border-[#D5CEAE] bg-[#FAF7EE] px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onNavigateHome}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-8 h-8 rounded bg-[#263B52] text-[#F4F4E7] flex items-center justify-center font-serif font-bold text-sm tracking-wider shadow-sm">
              क
            </div>
            <div>
              <div className="font-serif font-bold text-sm tracking-wide text-[#0F253B] group-hover:text-[#263B52] transition-colors">
                KAUSHAL SETU <span className="text-xs font-normal text-[#5A6E85]">| कौशल सेतु</span>
              </div>
              <div className="text-[10px] font-mono tracking-wider text-[#7A8C9E] uppercase">
                National Longitudinal Skilling Registry
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D8EEDF] text-[#164627] text-xs font-mono rounded border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D] animate-ping" />
              Sovereign Gate v2.4 Active
            </span>
            <button
              onClick={onNavigateHome}
              className="text-xs font-medium text-[#263B52] hover:underline px-2 py-1"
            >
              ← Back to Overview
            </button>
          </div>
        </div>
      </div>

      {/* Main Ledger Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:py-12 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Role Selector & System Protocol */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EDE8D5] text-[#263B52] rounded text-xs font-mono uppercase tracking-widest border border-[#D5CEAE] mb-3">
                <Lock className="w-3 h-3 text-[#263B52]" />
                Step 01 / Stakeholder Authorization
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F253B] tracking-tight">
                Unified Institutional Ledger Access
              </h1>
              <p className="mt-2 text-sm text-[#4A5D70] leading-relaxed">
                Select your institutional role to access longitudinal retention logs, verify employment pulses, or inspect NCVET outcome telemetry.
              </p>
            </div>

            {/* 4 Roles Ledger Cards */}
            <div className="space-y-2.5">
              {roleConfigs.map((cfg) => {
                const Icon = cfg.icon;
                const isSelected = selectedRole === cfg.role;
                return (
                  <button
                    key={cfg.role}
                    type="button"
                    onClick={() => handleRoleSelect(cfg.role)}
                    className={`w-full text-left p-3.5 rounded border transition-all duration-150 flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#263B52] text-[#F4F4E7] border-[#0F253B] shadow-md ring-1 ring-[#0F253B]'
                        : 'bg-[#FAF7EE] text-[#0F253B] border-[#D5CEAE] hover:bg-[#F2EFE4] hover:border-[#B8B08D]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded flex items-center justify-center font-mono text-xs font-bold ${
                        isSelected 
                          ? 'bg-[#0F253B] text-[#F3E8A8]' 
                          : 'bg-[#EDE8D5] text-[#263B52]'
                      }`}>
                        {cfg.index}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm tracking-tight">
                            {cfg.title}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#3A536F] text-[#D8EEDF]">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className={`text-xs mt-0.5 ${isSelected ? 'text-[#C9DCF1]' : 'text-[#687C92]'}`}>
                          {cfg.subtitle}
                        </div>
                      </div>
                    </div>

                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#F3E8A8]' : 'text-[#7A8C9E]'}`} />
                  </button>
                );
              })}
            </div>

            {/* Quick Demo Simulator Box */}
            <div className="p-4 bg-[#EDE8D5] rounded border border-[#D5CEAE] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#263B52]" />
                  Instant Evaluator Bypass
                </span>
                <span className="text-[10px] font-mono text-[#5A6E85]">Dev & Pilot Access</span>
              </div>
              <p className="text-xs text-[#4A5D70]">
                Jump straight into any stakeholder view with pre-authenticated mock telemetry without typing:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleQuickDemoEnter('trainee', 'trainee-dashboard')}
                  className="px-2.5 py-2 bg-[#FAF7EE] hover:bg-white text-xs font-medium text-[#0F253B] rounded border border-[#C5BDA0] text-left transition-colors flex items-center justify-between group"
                >
                  <span>🎓 Trainee (Priya)</span>
                  <ArrowRight className="w-3 h-3 text-[#7A8C9E] group-hover:text-[#0F253B] group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => handleQuickDemoEnter('employer', 'employer-dashboard')}
                  className="px-2.5 py-2 bg-[#FAF7EE] hover:bg-white text-xs font-medium text-[#0F253B] rounded border border-[#C5BDA0] text-left transition-colors flex items-center justify-between group"
                >
                  <span>🏢 Employer (Tata)</span>
                  <ArrowRight className="w-3 h-3 text-[#7A8C9E] group-hover:text-[#0F253B] group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => handleQuickDemoEnter('provider', 'provider-dashboard')}
                  className="px-2.5 py-2 bg-[#FAF7EE] hover:bg-white text-xs font-medium text-[#0F253B] rounded border border-[#C5BDA0] text-left transition-colors flex items-center justify-between group"
                >
                  <span>🏛️ Provider (Centurion)</span>
                  <ArrowRight className="w-3 h-3 text-[#7A8C9E] group-hover:text-[#0F253B] group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => handleQuickDemoEnter('government', 'government-dashboard')}
                  className="px-2.5 py-2 bg-[#FAF7EE] hover:bg-white text-xs font-medium text-[#0F253B] rounded border border-[#C5BDA0] text-left transition-colors flex items-center justify-between group"
                >
                  <span>🇮🇳 Govt (MSDE SSM)</span>
                  <ArrowRight className="w-3 h-3 text-[#7A8C9E] group-hover:text-[#0F253B] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Terminal & Verification */}
          <div className="lg:col-span-7">
            <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* Terminal Header */}
              <div className="border-b border-[#D5CEAE] pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#263B52]">
                      Secure Portal Entry — {currentConfig.title}
                    </span>
                  </div>
                  <div className="text-xs text-[#5A6E85] mt-1">
                    Authenticating against {currentConfig.ssoProvider}
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[11px] font-mono text-[#7A8C9E] block">Protocol ID</span>
                  <span className="text-xs font-mono font-bold text-[#0F253B]">AUTH-MSDE-2025/4A</span>
                </div>
              </div>

              {/* Persona Context Card */}
              <div className="bg-[#EDE8D5] rounded p-3.5 border border-[#D5CEAE] flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#263B52] text-[#F3E8A8] flex items-center justify-center font-bold text-sm">
                  {currentConfig.role[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#5A6E85] uppercase font-mono">Sample Verified Entity</div>
                  <div className="text-sm font-semibold text-[#0F253B] truncate">
                    {currentConfig.demoName}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-[#164627] bg-[#D8EEDF] px-2 py-0.5 rounded border border-[#B6DBC0]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Whitelisted
                </div>
              </div>

              {!otpSent ? (
                /* Step 1: Identifier Input Form */
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#263B52] font-semibold mb-2">
                      {currentConfig.idLabel}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={currentConfig.placeholder}
                        required
                        className="w-full bg-white border border-[#C5BDA0] focus:border-[#263B52] focus:ring-1 focus:ring-[#263B52] rounded px-3.5 py-2.5 text-sm font-mono text-[#0F253B] shadow-inner outline-none"
                      />
                      <div className="absolute right-3 top-2.5 text-xs font-mono text-[#7A8C9E]">
                        UIDAI / NCVET
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-[#687C92]">
                      Your credential is cryptographically mapped to the 3-party longitudinal ledger.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] py-3 px-4 rounded font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-md hover:shadow cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-[#F3E8A8]" />
                      <span>Request Time-Based 6-Digit OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: OTP Verification Form */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between bg-[#F2C8B4]/20 border border-[#F2C8B4] p-3 rounded">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#D97706]" />
                      <span className="text-xs text-[#0F253B]">
                        OTP sent to registered phone/email mapped to <strong className="font-mono">{identifier}</strong>
                      </span>
                    </div>
                    <button 
                      onClick={() => setOtpSent(false)} 
                      className="text-xs text-[#263B52] hover:underline font-mono"
                    >
                      Edit
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#263B52] font-semibold mb-2">
                      Enter 6-Digit Authentication Token
                    </label>
                    <div className="flex gap-2 sm:gap-3 justify-between">
                      {otpValue.map((digit, idx) => (
                        <input
                          key={idx}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const newOtp = [...otpValue];
                            newOtp[idx] = e.target.value.slice(-1);
                            setOtpValue(newOtp);
                          }}
                          className="w-12 h-12 text-center text-xl font-mono font-bold bg-white border border-[#C5BDA0] focus:border-[#263B52] focus:ring-2 focus:ring-[#263B52] rounded shadow-inner outline-none text-[#0F253B]"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-[#5A6E85]">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className={`w-3.5 h-3.5 ${countdown > 0 ? '' : 'text-[#15803D]'}`} />
                      <span>Resend OTP in 00:{countdown.toString().padStart(2, '0')}</span>
                    </div>
                    <span className="text-[#164627] font-semibold">Test Code Pre-filled</span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={handleVerifyAndEnter}
                      className="w-full bg-[#15803D] hover:bg-[#116631] text-white py-3 px-4 rounded font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-md hover:shadow cursor-pointer disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Establishing Cryptographic Session...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-[#D8EEDF]" />
                          <span>Verify & Enter Dashboard</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Federated Single Sign-On Divider */}
              <div className="pt-4 border-t border-[#D5CEAE]">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#7A8C9E] text-center mb-3">
                  Or Sovereign Federated Identity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleQuickDemoEnter(selectedRole, currentConfig.targetView)}
                    className="p-2.5 rounded bg-white hover:bg-[#F2EFE4] border border-[#D5CEAE] text-left transition-colors flex items-center gap-2 group"
                  >
                    <div className="w-6 h-6 rounded bg-[#EDE8D5] flex items-center justify-center text-xs font-bold text-[#263B52]">
                      D
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-[#0F253B]">DigiLocker</div>
                      <div className="text-[10px] text-[#7A8C9E]">Govt of India</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickDemoEnter(selectedRole, currentConfig.targetView)}
                    className="p-2.5 rounded bg-white hover:bg-[#F2EFE4] border border-[#D5CEAE] text-left transition-colors flex items-center gap-2 group"
                  >
                    <div className="w-6 h-6 rounded bg-[#EDE8D5] flex items-center justify-center text-xs font-bold text-[#263B52]">
                      P
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-[#0F253B]">Parichay SSO</div>
                      <div className="text-[10px] text-[#7A8C9E]">NIC Services</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickDemoEnter(selectedRole, currentConfig.targetView)}
                    className="p-2.5 rounded bg-white hover:bg-[#F2EFE4] border border-[#D5CEAE] text-left transition-colors flex items-center gap-2 group"
                  >
                    <div className="w-6 h-6 rounded bg-[#EDE8D5] flex items-center justify-center text-xs font-bold text-[#263B52]">
                      J
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-[#0F253B]">Jan Samarth</div>
                      <div className="text-[10px] text-[#7A8C9E]">Direct Benefit</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Data Compliance & Legal Footer note */}
              <div className="text-[11px] text-[#7A8C9E] bg-[#EDE8D5]/50 p-3 rounded border border-[#D5CEAE] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#263B52] shrink-0 mt-0.5" />
                <span>
                  Consent Notice: Protected under Digital Personal Data Protection (DPDP) Act 2023. Authentication initiates an ephemeral cryptographic signature for longitudinal tracking validation.
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Sovereign Footing Ledger */}
      <div className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3 px-4 text-center text-xs font-mono text-[#687C92]">
        National Council for Vocational Education and Training (NCVET) · Ministry of Skill Development and Entrepreneurship
      </div>
    </div>
  );
}
