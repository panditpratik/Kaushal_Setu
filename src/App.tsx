// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import type { AppView, StakeholderRole, TraineeTab, ProviderTab, GovernmentTab } from './types';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { LoginPage } from './components/LoginPage';
import { AuthCallback } from './components/AuthCallback';
import { PasswordResetPage } from './components/PasswordResetPage';
import { TraineeDashboard } from './components/TraineeDashboard';
import { EmployerDashboard } from './components/EmployerDashboard';
import { ProviderDashboard } from './components/ProviderDashboard';
import { GovernmentDashboard } from './components/GovernmentDashboard';
import { useAuth } from './context/AuthContext';
import type { AuthUser } from './lib/api';

export function App() {
  const { user, profile, stakeholderRole, defaultView, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window === 'undefined') return 'landing';
    const path = window.location.pathname.replace(/\/$/, '');
    if (path === '/auth/callback') return 'auth-callback';
    if (path === '/auth/reset-password') return 'reset-password';
    if (path === '/login') return 'login';

    const params = new URLSearchParams(window.location.search);
    const v = params.get('view') as AppView | null;
    if (v && [
      'landing', 
      'login', 
      'auth-callback', 
      'reset-password', 
      'trainee-dashboard', 
      'employer-dashboard', 
      'provider-dashboard', 
      'government-dashboard'
    ].includes(v)) {
      return v;
    }
    return 'landing';
  });
  const [currentRole, setCurrentRole] = useState<StakeholderRole | null>(null);

  // Tab persistence for Trainee Portal (?tab=overview | training | outcomes | journey | followups | skills)
  const [traineeTab, setTraineeTab] = useState<TraineeTab>(() => {
    if (typeof window === 'undefined') return 'overview';
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TraineeTab | null;
    if (tab && ['overview', 'training', 'outcomes', 'journey', 'followups', 'skills'].includes(tab)) {
      return tab;
    }
    if ((tab as any) === 'trajectory') return 'journey';
    if ((tab as any) === 'ledger') return 'followups';
    return 'overview';
  });

  // Tab persistence for Training Provider Portal (?ptab=overview | programmes | trainees | training-records | outcomes | skills | non-placement)
  const [providerTab, setProviderTab] = useState<ProviderTab>(() => {
    if (typeof window === 'undefined') return 'overview';
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('ptab') as ProviderTab | null;
    if (tab && ['overview', 'programmes', 'trainees', 'training-records', 'outcomes', 'skills', 'non-placement'].includes(tab)) {
      return tab;
    }
    return 'overview';
  });

  // Tab persistence for Government Portal (?gtab=overview | analytics | programmes | providers | districts | skills | non-placement | attrition | interventions | follow-ups)
  const [governmentTab, setGovernmentTab] = useState<GovernmentTab>(() => {
    if (typeof window === 'undefined') return 'overview';
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('gtab') as GovernmentTab | null;
    if (tab && ['overview', 'analytics', 'programmes', 'providers', 'districts', 'skills', 'non-placement', 'attrition', 'interventions', 'follow-ups'].includes(tab)) {
      return tab;
    }
    return 'overview';
  });

  const syncViewToUrl = useCallback((view: AppView) => {
    const url = new URL(window.location.href);
    if (view === 'auth-callback') {
      window.history.pushState({ view }, '', '/auth/callback');
      return;
    }
    if (view === 'reset-password') {
      window.history.pushState({ view }, '', '/auth/reset-password');
      return;
    }
    if (url.pathname.startsWith('/auth/')) {
      url.pathname = '/';
    }
    if (view === 'landing') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', view);
    }
    window.history.pushState({ view }, '', url.toString());
  }, []);

  // Popstate listener for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/\/$/, '');
      if (path === '/auth/callback') {
        setCurrentView('auth-callback');
        return;
      }
      if (path === '/auth/reset-password') {
        setCurrentView('reset-password');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TraineeTab | null;
      if (tabParam && ['overview', 'training', 'outcomes', 'journey', 'followups', 'skills'].includes(tabParam)) {
        setTraineeTab(tabParam);
      } else if ((tabParam as any) === 'trajectory') {
        setTraineeTab('journey');
      } else if ((tabParam as any) === 'ledger') {
        setTraineeTab('followups');
      }

      const ptabParam = params.get('ptab') as ProviderTab | null;
      if (ptabParam && ['overview', 'programmes', 'trainees', 'training-records', 'outcomes', 'skills', 'non-placement'].includes(ptabParam)) {
        setProviderTab(ptabParam);
      }

      const gtabParam = params.get('gtab') as GovernmentTab | null;
      if (gtabParam && ['overview', 'analytics', 'programmes', 'providers', 'districts', 'skills', 'non-placement', 'attrition', 'interventions', 'follow-ups'].includes(gtabParam)) {
        setGovernmentTab(gtabParam);
      }

      const viewParam = params.get('view') as AppView | null;
      if (viewParam && [
        'landing', 
        'login', 
        'auth-callback', 
        'reset-password', 
        'trainee-dashboard', 
        'employer-dashboard', 
        'provider-dashboard', 
        'government-dashboard'
      ].includes(viewParam)) {
        setCurrentView(viewParam);
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTraineeTab = useCallback((tab: TraineeTab) => {
    setTraineeTab(tab);
    if (currentView !== 'trainee-dashboard') {
      setCurrentView('trainee-dashboard');
      setCurrentRole('trainee');
      syncViewToUrl('trainee-dashboard');
    }
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({ tab }, '', url.toString());
  }, [currentView, syncViewToUrl]);

  const handleSelectProviderTab = useCallback((tab: ProviderTab) => {
    setProviderTab(tab);
    if (currentView !== 'provider-dashboard') {
      setCurrentView('provider-dashboard');
      setCurrentRole('provider');
      syncViewToUrl('provider-dashboard');
    }
    const url = new URL(window.location.href);
    url.searchParams.set('ptab', tab);
    window.history.pushState({ ptab: tab }, '', url.toString());
  }, [currentView, syncViewToUrl]);

  const handleSelectGovernmentTab = useCallback((tab: GovernmentTab) => {
    setGovernmentTab(tab);
    if (currentView !== 'government-dashboard') {
      setCurrentView('government-dashboard');
      setCurrentRole('government');
      syncViewToUrl('government-dashboard');
    }
    const url = new URL(window.location.href);
    url.searchParams.set('gtab', tab);
    window.history.pushState({ gtab: tab }, '', url.toString());
  }, [currentView, syncViewToUrl]);

  // Sync state when Supabase user profile loads or changes
  useEffect(() => {
    if (loading) return;

    if (profile && stakeholderRole) {
      setCurrentRole(stakeholderRole);
      // Auto-navigate to user's dashboard if currently on login or landing (with no explicit ?view set)
      const params = new URLSearchParams(window.location.search);
      const viewInUrl = params.get('view');
      if (!viewInUrl || currentView === 'login') {
        setCurrentView(defaultView);
        syncViewToUrl(defaultView);
      }
    } else if (!user) {
      setCurrentRole(null);
      const isProtectedDashboard = [
        'trainee-dashboard',
        'employer-dashboard',
        'provider-dashboard',
        'government-dashboard',
      ].includes(currentView);
      if (isProtectedDashboard) {
        setCurrentView('login');
        syncViewToUrl('login');
      }
    }
  }, [loading, profile, stakeholderRole, defaultView, user, currentView, syncViewToUrl]);

  const currentUser: AuthUser | null = profile
    ? {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        traineeId: profile.traineeId,
        employerId: profile.employerId,
        providerId: profile.providerId,
        govId: profile.govId,
      }
    : null;

  const handleNavigate = (view: AppView, role?: StakeholderRole) => {
    // Route Protection: Unauthenticated access to dashboard views redirects to login
    const isProtectedDashboard = [
      'trainee-dashboard',
      'employer-dashboard',
      'provider-dashboard',
      'government-dashboard',
    ].includes(view);

    if (isProtectedDashboard && !user) {
      setCurrentView('login');
      syncViewToUrl('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Role check for UX navigation
    if (user && profile) {
      if (view === 'trainee-dashboard' && profile.role !== 'TRAINEE') {
        alert('Access Restricted: You are authenticated as ' + profile.role + ', not TRAINEE.');
        return;
      }
      if (view === 'employer-dashboard' && profile.role !== 'EMPLOYER') {
        alert('Access Restricted: You are authenticated as ' + profile.role + ', not EMPLOYER.');
        return;
      }
      if (view === 'provider-dashboard' && profile.role !== 'TRAINING_PROVIDER') {
        alert('Access Restricted: You are authenticated as ' + profile.role + ', not TRAINING_PROVIDER.');
        return;
      }
      if (view === 'government-dashboard' && profile.role !== 'GOVERNMENT') {
        alert('Access Restricted: You are authenticated as ' + profile.role + ', not GOVERNMENT.');
        return;
      }
    }

    setCurrentView(view);
    syncViewToUrl(view);
    if (role) {
      setCurrentRole(role);
    } else if (view === 'trainee-dashboard') {
      setCurrentRole('trainee');
    } else if (view === 'employer-dashboard') {
      setCurrentRole('employer');
    } else if (view === 'provider-dashboard') {
      setCurrentRole('provider');
    } else if (view === 'government-dashboard') {
      setCurrentRole('government');
    } else if (view === 'landing' || view === 'login') {
      setCurrentRole(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (role: StakeholderRole, targetView: AppView) => {
    setCurrentRole(role);
    setCurrentView(targetView);
    syncViewToUrl(targetView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = useCallback(async () => {
    await signOut();
    setCurrentRole(null);
    setCurrentView('landing');
    syncViewToUrl('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [signOut, syncViewToUrl]);

  const handleSwitchRole = (roleStr: string) => {
    const role = roleStr as StakeholderRole;
    setCurrentRole(role);
    let target: AppView = 'landing';
    if (role === 'trainee') target = 'trainee-dashboard';
    else if (role === 'employer') target = 'employer-dashboard';
    else if (role === 'provider') target = 'provider-dashboard';
    else if (role === 'government') target = 'government-dashboard';
    setCurrentView(target);
    syncViewToUrl(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] flex flex-col items-center justify-center font-sans text-[#0F253B]">
        <div className="w-12 h-12 border-4 border-[#263B52] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-xs font-mono font-bold tracking-widest text-[#263B52] uppercase">
          Establishing Secure Institutional Session...
        </div>
        <div className="text-[11px] font-mono text-[#52667A] mt-1">
          Supabase Cloud Auth • NCVET Telemetry Node
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] font-sans flex flex-col selection:bg-[#263B52] selection:text-white">
      {currentView !== 'login' && currentView !== 'auth-callback' && currentView !== 'reset-password' && (
        <Header 
          currentView={currentView} 
          currentRole={currentRole} 
          currentUser={currentUser}
          activeTraineeTab={traineeTab}
          activeProviderTab={providerTab}
          activeGovernmentTab={governmentTab}
          onNavigate={handleNavigate} 
          onSelectTraineeTab={handleSelectTraineeTab}
          onSelectProviderTab={handleSelectProviderTab}
          onSelectGovernmentTab={handleSelectGovernmentTab}
          onLogout={handleLogout}
        />
      )}
      <main className="flex-1">
        {currentView === 'login' ? (
          <LoginPage 
            onLogin={handleLogin} 
            onNavigateHome={() => handleNavigate('landing')} 
          />
        ) : currentView === 'auth-callback' ? (
          <AuthCallback 
            onSuccess={handleLogin} 
            onFailure={() => handleNavigate('login')} 
          />
        ) : currentView === 'reset-password' ? (
          <PasswordResetPage 
            onNavigateToLogin={() => handleNavigate('login')} 
          />
        ) : currentView === 'trainee-dashboard' ? (
          <TraineeDashboard 
            onNavigateHome={() => handleNavigate('landing')} 
            onSwitchRole={handleSwitchRole} 
            activeTab={traineeTab}
            onTabChange={handleSelectTraineeTab}
          />
        ) : currentView === 'employer-dashboard' ? (
          <EmployerDashboard 
            onNavigateHome={() => handleNavigate('landing')} 
            onSwitchRole={handleSwitchRole} 
          />
        ) : currentView === 'provider-dashboard' ? (
          <ProviderDashboard 
            onNavigateHome={() => handleNavigate('landing')} 
            onSwitchRole={handleSwitchRole} 
            activeTab={providerTab}
            onTabChange={handleSelectProviderTab}
          />
        ) : currentView === 'government-dashboard' ? (
          <GovernmentDashboard 
            onNavigateHome={() => handleNavigate('landing')} 
            onSwitchRole={handleSwitchRole} 
            activeTab={governmentTab}
            onTabChange={handleSelectGovernmentTab}
          />
        ) : (
          <LandingPage onNavigate={handleNavigate} />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
