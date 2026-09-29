import React, { useState } from 'react';
import type { StakeholderRole, AppView } from '../types';
import { useAuth } from '../context/AuthContext';
import logoSvg from '../assets/logo.svg';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown,
  GraduationCap,
  UserCheck,
  Building2,
  ShieldCheck
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: StakeholderRole, targetView: AppView) => void;
  onNavigateHome: () => void;
}

type AuthMode = 'signin' | 'signup' | 'magiclink' | 'forgot';

export function LoginPage({ onLogin, onNavigateHome }: LoginPageProps) {
  const { 
    signIn, 
    signUp, 
    signInWithOtp, 
    verifyOtp, 
    resetPasswordForEmail, 
    signInWithOAuth 
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');

  // Form fields
  const [email, setEmail] = useState('trainee@kaushalsetu.gov.in');
  const [password, setPassword] = useState('Password@123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'TRAINEE' | 'EMPLOYER' | 'TRAINING_PROVIDER'>('TRAINEE');
  const [otpCode, setOtpCode] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [showEvaluatorBar, setShowEvaluatorBar] = useState(false);

  // 1. Email + Password Sign In
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);
    setIsLoading(true);
    setLoadingText('Signing in...');

    try {
      const { profile } = await signIn(email.trim(), password);

      const roleTargetMap: Record<string, { role: StakeholderRole; view: AppView }> = {
        TRAINEE: { role: 'trainee', view: 'trainee-dashboard' },
        EMPLOYER: { role: 'employer', view: 'employer-dashboard' },
        TRAINING_PROVIDER: { role: 'provider', view: 'provider-dashboard' },
        GOVERNMENT: { role: 'government', view: 'government-dashboard' },
      };

      const mapped = roleTargetMap[profile.role] || { role: 'trainee', view: 'trainee-dashboard' };
      onLogin(mapped.role, mapped.view);
    } catch (err: any) {
      setErrorMessage(err.message || 'Email or password is incorrect.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email + Password Sign Up
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Creating account...');

    try {
      const cleanEmail = email.trim();
      const cleanPassword = password;
      await signUp(
        cleanEmail,
        cleanPassword,
        fullName.trim(),
        accountType
      );

      // Attempt immediate seamless login since email auto-confirm trigger is active
      setLoadingText('Authenticating registered account...');
      try {
        const { profile } = await signIn(cleanEmail, cleanPassword);
        const roleTargetMap: Record<string, { role: StakeholderRole; view: AppView }> = {
          TRAINEE: { role: 'trainee', view: 'trainee-dashboard' },
          EMPLOYER: { role: 'employer', view: 'employer-dashboard' },
          TRAINING_PROVIDER: { role: 'provider', view: 'provider-dashboard' },
          GOVERNMENT: { role: 'government', view: 'government-dashboard' },
        };
        const mapped = roleTargetMap[profile.role] || { 
          role: accountType === 'EMPLOYER' ? 'employer' : accountType === 'TRAINING_PROVIDER' ? 'provider' : 'trainee', 
          view: accountType === 'EMPLOYER' ? 'employer-dashboard' : accountType === 'TRAINING_PROVIDER' ? 'provider-dashboard' : 'trainee-dashboard' 
        };
        onLogin(mapped.role, mapped.view);
        return;
      } catch (autoLoginErr: any) {
        if (autoLoginErr?.message?.toLowerCase().includes('confirm')) {
          setSuccessNotice(
            'Account created! Please verify your email before signing in.'
          );
        } else {
          setSuccessNotice('Account registered successfully. You may now sign in.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to register account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Email Magic Link / OTP Send
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setErrorMessage(null);
    setSuccessNotice(null);
    setIsLoading(true);
    setLoadingText('Sending sign-in link...');

    try {
      await signInWithOtp(email.trim());
      setSuccessNotice('Check your email for a secure sign-in link or verification code.');
      setShowOtpInput(true);
    } catch (err: any) {
      setErrorMessage(err.message || "We couldn't send the sign-in link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify OTP Code (if received via email)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setLoadingText('Verifying code...');

    try {
      const { profile } = await verifyOtp(email.trim(), otpCode.trim());
      if (profile) {
        const roleTargetMap: Record<string, { role: StakeholderRole; view: AppView }> = {
          TRAINEE: { role: 'trainee', view: 'trainee-dashboard' },
          EMPLOYER: { role: 'employer', view: 'employer-dashboard' },
          TRAINING_PROVIDER: { role: 'provider', view: 'provider-dashboard' },
          GOVERNMENT: { role: 'government', view: 'government-dashboard' },
        };
        const mapped = roleTargetMap[profile.role] || { role: 'trainee', view: 'trainee-dashboard' };
        onLogin(mapped.role, mapped.view);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Forgot Password Request
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setErrorMessage(null);
    setSuccessNotice(null);
    setIsLoading(true);
    setLoadingText('Sending reset instructions...');

    try {
      await resetPasswordForEmail(email.trim());
      setSuccessNotice('Password reset instructions have been sent if the account is eligible.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Continue with Google OAuth
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    setLoadingText('Connecting to Google...');

    try {
      await signInWithOAuth('google');
    } catch (err: any) {
      // Explain clearly if Google OAuth is pending provider credentials
      if (err.message?.includes('provider credentials') || err.message?.includes('not enabled')) {
        setErrorMessage(
          'Google Sign-In requires Client ID & Secret configuration in Supabase Cloud dashboard (Authentication > Providers > Google).'
        );
      } else {
        setErrorMessage(err.message || 'Google sign-in could not be completed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for evaluator testing of the 4 verified roles
  const handleQuickFill = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('Password@123');
    setErrorMessage(null);
    setSuccessNotice(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col justify-between selection:bg-[#263B52] selection:text-white">
      {/* Top Banner Navigation */}
      <header className="border-b border-[#D5CEAE] bg-[#FAF7EE] px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onNavigateHome}
            className="flex items-center gap-2 group text-left cursor-pointer"
            aria-label="Kaushal Setu Homepage"
          >
            <img src={logoSvg} alt="Kaushal Setu" className="h-8 sm:h-9 w-auto object-contain" />
          </button>
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-mono text-[#52667A] block">
              Government of India · Ministry of Skill Development
            </span>
            <span className="text-[10px] font-mono text-[#7A8C9E]">
              National Longitudinal Skilling Registry
            </span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6 sm:my-10">
        <div className="bg-white border border-[#D5CEAE] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-sm space-y-6">
          
          {/* Logo & Institutional Lockup */}
          <div className="text-center space-y-1.5">
            <img 
              src={logoSvg} 
              alt="Kaushal Setu" 
              className="h-10 w-auto mx-auto object-contain mb-2" 
            />
            <div className="text-xs font-mono font-semibold tracking-wider text-[#52667A] uppercase">
              From Skills to Sustainable Careers
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0F253B]">
              {mode === 'signin' && 'Sign in to your account'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'magiclink' && 'Sign in with Email Link'}
              {mode === 'forgot' && 'Reset your password'}
            </h1>
          </div>

          {/* Feedback & Error Banners */}
          {errorMessage && (
            <div 
              role="alert" 
              className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div 
              role="status" 
              className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successNotice}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODE 1: EMAIL + PASSWORD SIGN IN                                  */}
          {/* ================================================================= */}
          {mode === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A8C9E]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold text-[#0F253B]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessNotice(null);
                      setMode('forgot');
                    }}
                    className="text-xs font-mono text-[#263B52] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A8C9E]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7A8C9E] hover:text-[#0F253B] cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#1C2C3D] text-white rounded-lg font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{loadingText}</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-[#D5CEAE] w-full" />
                <span className="bg-white px-3 text-[10px] font-mono text-[#7A8C9E] uppercase tracking-wider">
                  OR
                </span>
                <div className="border-t border-[#D5CEAE] w-full" />
              </div>

              {/* Alternative Auth Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-3 bg-white hover:bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-xs font-mono text-[#0F253B] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessNotice(null);
                    setMode('magiclink');
                  }}
                  className="w-full py-2.5 px-3 bg-white hover:bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-xs font-mono text-[#0F253B] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-[#52667A]" />
                  <span>Continue with Email Link</span>
                </button>
              </div>

              {/* Bottom Toggle */}
              <div className="pt-4 border-t border-[#FAF7EE] text-center text-xs text-[#52667A]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessNotice(null);
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setFullName('');
                    setAccountType('TRAINEE');
                    setMode('signup');
                  }}
                  className="font-semibold text-[#263B52] hover:underline cursor-pointer ml-1"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* MODE 2: SIGN UP / REGISTRATION                                    */}
          {/* ================================================================= */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A8C9E]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Priya Sharma / HR Lead"
                    autoComplete="name"
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A8C9E]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                  Stakeholder Account Type
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAccountType('TRAINEE')}
                    className={`p-2 rounded-lg border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                      accountType === 'TRAINEE'
                        ? 'border-[#263B52] bg-white ring-2 ring-[#263B52]/20'
                        : 'border-[#D5CEAE] bg-[#FAF9F5]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-[#263B52]" />
                      <div className="text-xs font-bold text-[#0F253B]">Trainee</div>
                    </div>
                    <div className="text-[10px] text-[#52667A]">Job Seeker</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('EMPLOYER')}
                    className={`p-2 rounded-lg border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                      accountType === 'EMPLOYER'
                        ? 'border-[#263B52] bg-white ring-2 ring-[#263B52]/20'
                        : 'border-[#D5CEAE] bg-[#FAF9F5]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#263B52]" />
                      <div className="text-xs font-bold text-[#0F253B]">Employer</div>
                    </div>
                    <div className="text-[10px] text-[#52667A]">Hiring Org</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('TRAINING_PROVIDER')}
                    className={`p-2 rounded-lg border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                      accountType === 'TRAINING_PROVIDER'
                        ? 'border-[#263B52] bg-white ring-2 ring-[#263B52]/20'
                        : 'border-[#D5CEAE] bg-[#FAF9F5]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#263B52]" />
                      <div className="text-xs font-bold text-[#0F253B]">Provider</div>
                    </div>
                    <div className="text-[10px] text-[#52667A]">ITI / Academy</div>
                  </button>
                </div>
                <div className="text-[10px] text-[#7A8C9E] font-mono mt-1">
                  * Note: Government administrative roles require state directorate provisioning.
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A8C9E]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7A8C9E] hover:text-[#0F253B] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A8C9E]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#1C2C3D] text-white rounded-lg font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{loadingText}</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-[#FAF7EE] text-center text-xs text-[#52667A]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessNotice(null);
                    setMode('signin');
                  }}
                  className="font-semibold text-[#263B52] hover:underline cursor-pointer ml-1"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* MODE 3: EMAIL MAGIC LINK / OTP                                    */}
          {/* ================================================================= */}
          {mode === 'magiclink' && (
            <div className="space-y-4">
              <p className="text-xs text-[#52667A] leading-relaxed">
                Enter your email address to receive a passwordless magic sign-in link and verification code.
              </p>

              <form onSubmit={handleSendMagicLink} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A8C9E]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#263B52] hover:bg-[#1C2C3D] text-white rounded-lg font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <span>Send Sign-in Link</span>
                  )}
                </button>
              </form>

              {/* Optional 6-digit OTP code verification section */}
              {showOtpInput && (
                <form onSubmit={handleVerifyOtp} className="pt-3 border-t border-[#FAF7EE] space-y-3">
                  <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP code"
                    className="w-full py-2 px-3 text-center tracking-[0.3em] font-mono text-base bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 bg-[#087F8C] hover:bg-[#066570] text-white rounded font-mono text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Verify Code & Sign In
                  </button>
                </form>
              )}

              <div className="pt-3 border-t border-[#FAF7EE] text-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessNotice(null);
                    setMode('signin');
                  }}
                  className="text-xs font-mono text-[#263B52] hover:underline cursor-pointer"
                >
                  Back to password sign in
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* MODE 4: FORGOT PASSWORD                                           */}
          {/* ================================================================= */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <p className="text-xs text-[#52667A] leading-relaxed">
                Enter your registered email address and we'll send you instructions to securely reset your password.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A8C9E]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#1C2C3D] text-white rounded-lg font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{loadingText}</span>
                  </>
                ) : (
                  <span>Send Reset Instructions</span>
                )}
              </button>

              <div className="pt-3 border-t border-[#FAF7EE] text-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessNotice(null);
                    setMode('signin');
                  }}
                  className="text-xs font-mono text-[#263B52] hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* DISCREET INSTITUTIONAL EVALUATOR QUICK-FILL BAR                   */}
          {/* ================================================================= */}
          <div className="pt-2 border-t border-[#FAF7EE]">
            <button
              type="button"
              onClick={() => setShowEvaluatorBar(!showEvaluatorBar)}
              className="w-full flex items-center justify-between text-[11px] font-mono text-[#52667A] hover:text-[#0F253B] py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                Institutional Evaluator Credentials (1-Click Fill)
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showEvaluatorBar ? 'rotate-180' : ''}`} />
            </button>

            {showEvaluatorBar && (
              <div className="grid grid-cols-2 gap-1.5 pt-2 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => handleQuickFill('trainee@kaushalsetu.gov.in')}
                  className="p-1.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded hover:border-[#263B52] text-left truncate cursor-pointer"
                  title="Priya Sharma (Trainee)"
                >
                  <span className="font-bold text-[#0F253B] block">01 Trainee</span>
                  <span className="text-[#52667A] truncate block">trainee@kaushalsetu...</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('employer@tata.example.com')}
                  className="p-1.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded hover:border-[#263B52] text-left truncate cursor-pointer"
                  title="Tata Motors Ancillary (Employer)"
                >
                  <span className="font-bold text-[#0F253B] block">02 Employer</span>
                  <span className="text-[#52667A] truncate block">employer@tata...</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('provider@centurion.example.com')}
                  className="p-1.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded hover:border-[#263B52] text-left truncate cursor-pointer"
                  title="Centurion Skill Academy (Provider)"
                >
                  <span className="font-bold text-[#0F253B] block">03 Provider</span>
                  <span className="text-[#52667A] truncate block">provider@centurion...</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('gov@msde.gov.in')}
                  className="p-1.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded hover:border-[#263B52] text-left truncate cursor-pointer"
                  title="MSDE Directorate (Government)"
                >
                  <span className="font-bold text-[#0F253B] block">04 Government</span>
                  <span className="text-[#52667A] truncate block">gov@msde.gov.in</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Institutional Security Notice Footer */}
      <footer className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3 text-center text-[10px] font-mono text-[#7A8C9E]">
        National Longitudinal Skilling Registry · ISO 27001 & DPDP 2023 Compliant · Supabase Auth Protected
      </footer>
    </div>
  );
}
