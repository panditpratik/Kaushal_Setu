import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logoSvg from '../assets/logo.svg';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

interface PasswordResetPageProps {
  onNavigateToLogin: () => void;
}

export function PasswordResetPage({ onNavigateToLogin }: PasswordResetPageProps) {
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(newPassword);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col justify-between selection:bg-[#263B52] selection:text-white">
      {/* Top Banner Navigation */}
      <div className="border-b border-[#D5CEAE] bg-[#FAF7EE] px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onNavigateToLogin}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <img src={logoSvg} alt="Kaushal Setu" className="h-8 w-auto object-contain" />
          </button>
          <div className="text-[11px] font-mono text-[#52667A]">
            Government of India • Ministry of Skill Development
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="bg-white border border-[#D5CEAE] rounded-xl p-6 sm:p-8 max-w-md w-full shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-serif font-bold text-[#0F253B]">Reset Password</h1>
            <p className="text-xs text-[#52667A]">
              Choose a secure, strong password for your KaushalSetu account.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 font-serif">Password Updated Successfully</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Your new credentials have been safely stored in Supabase Auth.
                </p>
              </div>
              <button
                onClick={onNavigateToLogin}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#1C2C3D] text-white rounded font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A8C9E]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
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

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#0F253B] block">
                  Confirm New Password
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
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-[#FAF9F5] border border-[#D5CEAE] rounded-lg text-sm text-[#0F253B] placeholder:text-[#7A8C9E] focus:outline-none focus:ring-2 focus:ring-[#263B52]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#263B52] hover:bg-[#1C2C3D] text-white rounded-lg font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resetting password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-[#FAF7EE] text-center">
            <button
              onClick={onNavigateToLogin}
              className="text-xs font-mono text-[#263B52] hover:underline cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3 text-center text-[10px] font-mono text-[#7A8C9E]">
        National Longitudinal Skilling Registry · ISO 27001 & DPDP 2023 Compliant
      </div>
    </div>
  );
}
