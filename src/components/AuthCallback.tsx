import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { StakeholderRole, AppView } from '../types';
import logoSvg from '../assets/logo.svg';
import { AlertCircle } from 'lucide-react';

interface AuthCallbackProps {
  onSuccess: (role: StakeholderRole, view: AppView) => void;
  onFailure: (errorMessage: string) => void;
}

export function AuthCallback({ onSuccess, onFailure }: AuthCallbackProps) {
  const { session, profile, resolveAndBootstrapProfile } = useAuth();
  const [statusText, setStatusText] = useState('Verifying authentication token...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        setStatusText('Establishing secure institutional session with Supabase Cloud...');
        
        // Wait briefly for Supabase to parse URL hash/code if present
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (cancelled) return;

        setStatusText('Resolving verified user profile & institutional role...');
        const resolvedProfile = profile || (await resolveAndBootstrapProfile());

        if (!resolvedProfile) {
          throw new Error('Unable to resolve user profile from Supabase database.');
        }

        const roleTargetMap: Record<string, { role: StakeholderRole; view: AppView }> = {
          TRAINEE: { role: 'trainee', view: 'trainee-dashboard' },
          EMPLOYER: { role: 'employer', view: 'employer-dashboard' },
          TRAINING_PROVIDER: { role: 'provider', view: 'provider-dashboard' },
          GOVERNMENT: { role: 'government', view: 'government-dashboard' },
        };

        const target = roleTargetMap[resolvedProfile.role] || {
          role: 'trainee',
          view: 'trainee-dashboard',
        };

        setStatusText(`Authenticated as ${resolvedProfile.role}. Redirecting to dashboard...`);
        setTimeout(() => {
          if (!cancelled) {
            onSuccess(target.role, target.view);
          }
        }, 500);
      } catch (err: any) {
        console.error('Auth callback failure:', err);
        if (!cancelled) {
          setErrorMessage(err.message || 'Authentication callback failed.');
          onFailure(err.message || 'Authentication callback failed.');
        }
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [session, profile, resolveAndBootstrapProfile, onSuccess, onFailure]);

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] flex flex-col items-center justify-center p-6 text-[#0F253B]">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md w-full shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[#0F253B]">Authentication Callback Issue</h2>
          <p className="text-xs text-red-700 font-mono bg-red-50 p-3 rounded border border-red-100">
            {errorMessage}
          </p>
          <a
            href="/?view=login"
            className="inline-block px-4 py-2 bg-[#263B52] hover:bg-[#1C2C3D] text-white rounded font-mono text-xs font-semibold tracking-wider transition-colors"
          >
            Return to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4E7] flex flex-col items-center justify-center p-6 text-[#0F253B]">
      <div className="bg-white border border-[#D5CEAE] rounded-xl p-8 max-w-md w-full shadow-sm text-center space-y-6">
        <img src={logoSvg} alt="Kaushal Setu" className="h-9 w-auto mx-auto object-contain" />
        <div className="w-12 h-12 border-4 border-[#263B52] border-t-transparent rounded-full animate-spin mx-auto" />
        <div>
          <h2 className="text-lg font-serif font-bold text-[#0F253B]">Authorizing Session</h2>
          <p className="text-xs text-[#52667A] font-mono mt-1">{statusText}</p>
        </div>
        <div className="text-[10px] font-mono text-[#7A8C9E] uppercase tracking-wider">
          Secured by Supabase Cloud & PostgreSQL RLS
        </div>
      </div>
    </div>
  );
}
