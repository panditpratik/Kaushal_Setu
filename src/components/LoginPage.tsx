import { useState } from 'react';
import type { StakeholderRole, AppView } from '../types';
import { authService } from '../lib/api';
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
  const [emailInput, setEmailInput] = useState('trainee@kaushalsetu.gov.in');
  const [passwordInput, setPasswordInput] = useState('Password@123');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roleConfigs = [
    {
      role: 'trainee' as StakeholderRole,
      index: '01',
      title: 'Trainee & Alumni',
      subtitle: 'Aadhaar / Mobile / DigiLocker',
      defaultEmail: 'trainee@kaushalsetu.gov.in',
      idLabel: 'Registered Email or Passport Identifier',
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
      defaultEmail: 'employer@tata.example.com',
      idLabel: 'Corporate / Shram Suvidha Email',
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
      defaultEmail: 'provider@centurion.example.com',
      idLabel: 'SMART / NSDC Accredited Email',
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
      defaultEmail: 'gov@msde.gov.in',
      idLabel: 'NIC / Parichay Official Email',
      icon: Landmark,
      targetView: 'government-dashboard' as AppView,
      demoName: 'MSDE State Directorate (Maharashtra SSM)',
      ssoProvider: 'Parichay Jan Samarth SSO'
    }
  ];

  const currentConfig = roleConfigs.find(c => c.role === selectedRole) || roleConfigs[0];

  const handleRoleSelect = (role: StakeholderRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    const cfg = roleConfigs.find(c => c.role === role);
    if (cfg) {
      setEmailInput(cfg.defaultEmail);
      setPasswordInput('Password@123');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const data = await authService.login(emailInput, passwordInput);
      const roleTarget: Record<string, { role: StakeholderRole; view: AppView }> = {
        TRAINEE: { role: 'trainee', view: 'trainee-dashboard' },
        EMPLOYER: { role: 'employer', view: 'employer-dashboard' },
        TRAINING_PROVIDER: { role: 'provider', view: 'provider-dashboard' },
        GOVERNMENT: { role: 'government', view: 'government-dashboard' },
      };

      const mapped = roleTarget[data.user.role] || { role: selectedRole, view: currentConfig.targetView };
      onLogin(mapped.role, mapped.view);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickEvaluatorLogin = async (role: StakeholderRole, targetView: AppView) => {
    setIsVerifying(true);
    setErrorMessage(null);
    const cfg = roleConfigs.find(c => c.role === role);
    const email = cfg ? cfg.defaultEmail : 'trainee@kaushalsetu.gov.in';

    try {
      const data = await authService.login(email, 'Password@123');
      const roleTarget: Record<string, { role: StakeholderRole; view: AppView }> = {
        TRAINEE: { role: 'trainee', view: 'trainee-dashboard' },
        EMPLOYER: { role: 'employer', view: 'employer-dashboard' },
        TRAINING_PROVIDER: { role: 'provider', view: 'provider-dashboard' },
        GOVERNMENT: { role: 'government', view: 'government-dashboard' },
      };
      const mapped = roleTarget[data.user.role] || { role, view: targetView };
      onLogin(mapped.role, mapped.view);
    } catch (err: any) {
      setErrorMessage(`Authentication failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col justify-between selection:bg-[#263B52] selection:text-white">
      {/* Top Banner Navigation */}
      <div className="border-b border-[#D5CEAE] bg-[#FAF7EE] px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onNavigateHome}
            className="flex items-center gap-2 group text-left cursor-pointer"
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              PostgreSQL Authentication Active
            </span>
            <button
              onClick={onNavigateHome}
              className="text-xs font-medium text-[#263B52] hover:underline px-2 py-1 cursor-pointer"
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
                    className={`w-full text-left p-3.5 rounded border transition-all duration-150 flex items-center justify-between cursor-pointer ${
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

            {/* Quick Evaluator Access Box */}
            <div className="p-4 bg-[#EDE8D5] rounded border border-[#D5CEAE] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#263B52]" />
                  Evaluator Fast-Track Login
                </span>
                <span className="text-[10px] font-mono text-[#15803D] font-bold">PostgreSQL Verified</span>
              </div>
              <p className="text-xs text-[#4A5D70]">
                Click below to authenticate against PostgreSQL using real bcrypt credentials:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleQuickEvaluatorLogin('trainee', 'trainee-dashboard')}
                  className="px-2.5 py-2 bg-[#FAF7EE] hover:bg-white text-xs font-medium text-[#0F253B] rounded border border-[#C5BDA0] text-left transition-colors flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <span>🎓 Trainee (Priya)</span>
                  <ArrowRight className="w-3 h-3 text-[#7A8C9E] group-hover:text-[#0F253B] group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleQuickEvaluatorLogin('employer', 'employer-dashboard')}
                  className="px-2.5 py-2 bg-[#FAF7EE] hover:bg-white text-xs font-medium text-[#0F253B] rounded border border-[#C5BDA0] text-left transition-colors flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <span>🏢 Employer (Tata)</span>
                  <ArrowRight className="w-3 h-3 text-[#7A8C9E] group-hover:text-[#0F253B] group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleQuickEvaluatorLogin('provider', 'provider-dashboard')}
                  className="px-2.5 py-2 bg-[#FAF7EE] hover:bg-white text-xs font-medium text-[#0F253B] rounded border border-[#C5BDA0] text-left transition-colors flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <span>🏛️ Provider (Centurion)</span>
                  <ArrowRight className="w-3 h-3 text-[#7A8C9E] group-hover:text-[#0F253B] group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleQuickEvaluatorLogin('government', 'government-dashboard')}
                  className="px-2.5 py-2 bg-[#FAF7EE] hover:bg-white text-xs font-medium text-[#0F253B] rounded border border-[#C5BDA0] text-left transition-colors flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <span>🇮🇳 Govt (MSDE SSM)</span>
                  <ArrowRight className="w-3 h-3 text-[#7A8C9E] group-hover:text-[#0F253B] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Terminal */}
          <div className="lg:col-span-7">
            <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* Terminal Header */}
              <div className="border-b border-[#D5CEAE] pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#263B52]">
                      Authentication Terminal — {currentConfig.title}
                    </span>
                  </div>
                  <div className="text-xs text-[#5A6E85] mt-1">
                    Authenticating against KaushalSetu PostgreSQL Core
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[11px] font-mono text-[#7A8C9E] block">Protocol ID</span>
                  <span className="text-xs font-mono font-bold text-[#0F253B]">JWT-BCRYPT-2026</span>
                </div>
              </div>

              {/* Persona Context Card */}
              <div className="bg-[#EDE8D5] rounded p-3.5 border border-[#D5CEAE] flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#263B52] text-[#F3E8A8] flex items-center justify-center font-bold text-sm">
                  {currentConfig.role[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#5A6E85] uppercase font-mono">Target Seed Identity</div>
                  <div className="text-sm font-semibold text-[#0F253B] truncate">
                    {currentConfig.demoName}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-[#164627] bg-[#D8EEDF] px-2 py-0.5 rounded border border-[#B6DBC0]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Database Record Ready
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-100 border border-red-300 rounded text-xs font-mono text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Real Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#263B52] font-semibold mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    placeholder="Enter registered email"
                    className="w-full bg-white border border-[#C5BDA0] focus:border-[#263B52] focus:ring-1 focus:ring-[#263B52] rounded px-3.5 py-2.5 text-sm font-mono text-[#0F253B] shadow-inner outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#263B52] font-semibold mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="w-full bg-white border border-[#C5BDA0] focus:border-[#263B52] focus:ring-1 focus:ring-[#263B52] rounded px-3.5 py-2.5 text-sm font-mono text-[#0F253B] shadow-inner outline-none"
                  />
                  <div className="text-[11px] font-mono text-[#7A8C9E] mt-1">
                    Development seed accounts password: <code className="bg-[#EDE8D5] px-1 py-0.5 rounded text-[#263B52]">Password@123</code>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] py-3 px-4 rounded font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-md hover:shadow cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying with PostgreSQL API...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 text-[#F3E8A8]" />
                        <span>Authenticate & Enter Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Data Compliance & Legal Footer note */}
              <div className="text-[11px] text-[#7A8C9E] bg-[#EDE8D5]/50 p-3 rounded border border-[#D5CEAE] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#263B52] shrink-0 mt-0.5" />
                <span>
                  Consent Notice: Protected under Digital Personal Data Protection (DPDP) Act 2023. Authentication initiates an ephemeral cryptographic session token.
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
