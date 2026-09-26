// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import type { AppView, StakeholderRole } from './types';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { LoginPage } from './components/LoginPage';
import { TraineeDashboard } from './components/TraineeDashboard';
import { EmployerDashboard } from './components/EmployerDashboard';
import { ProviderDashboard } from './components/ProviderDashboard';
import { GovernmentDashboard } from './components/GovernmentDashboard';
import { useAuth } from './context/AuthContext';
import type { AuthUser } from './lib/api';

export function App() {
  const { user, profile, stakeholderRole, defaultView, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [currentRole, setCurrentRole] = useState<StakeholderRole | null>(null);

  // Tab persistence for Trainee Portal (?tab=trajectory | ?tab=skills | ?tab=ledger)
  const [traineeTab, setTraineeTab] = useState<'trajectory' | 'skills' | 'ledger'>(() => {
    if (typeof window === 'undefined') return 'trajectory';
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'skills' || tab === 'ledger') return tab;
    return 'trajectory';
  });

  // Popstate listener for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'skills' || tab === 'ledger') {
        setTraineeTab(tab);
      } else if (tab === 'trajectory') {
        setTraineeTab('trajectory');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTraineeTab = useCallback((tab: 'trajectory' | 'skills' | 'ledger') => {
    setTraineeTab(tab);
    if (currentView !== 'trainee-dashboard') {
      setCurrentView('trainee-dashboard');
      setCurrentRole('trainee');
    }
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({ tab }, '', url.toString());
  }, [currentView]);

  // Sync state when Supabase user profile loads or changes
  useEffect(() => {
    if (profile && stakeholderRole) {
      setCurrentRole(stakeholderRole);
      // Auto-navigate to user's dashboard if currently on login or landing
      if (currentView === 'login' || currentView === 'landing') {
        setCurrentView(defaultView);
      }
    } else if (!user) {
      setCurrentRole(null);
    }
  }, [profile, stakeholderRole, defaultView, user]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = useCallback(async () => {
    await signOut();
    setCurrentRole(null);
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [signOut]);

  const handleSwitchRole = (roleStr: string) => {
    const role = roleStr as StakeholderRole;
    setCurrentRole(role);
    if (role === 'trainee') setCurrentView('trainee-dashboard');
    else if (role === 'employer') setCurrentView('employer-dashboard');
    else if (role === 'provider') setCurrentView('provider-dashboard');
    else if (role === 'government') setCurrentView('government-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] font-sans flex flex-col selection:bg-[#263B52] selection:text-white">
      {currentView !== 'login' && (
        <Header 
          currentView={currentView} 
          currentRole={currentRole} 
          currentUser={currentUser}
          activeTraineeTab={traineeTab}
          onNavigate={handleNavigate} 
          onSelectTraineeTab={handleSelectTraineeTab}
          onLogout={handleLogout}
        />
      )}
      <main className="flex-1">
        {currentView === 'login' ? (
          <LoginPage 
            onLogin={handleLogin} 
            onNavigateHome={() => handleNavigate('landing')} 
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
          />
        ) : currentView === 'government-dashboard' ? (
          <GovernmentDashboard 
            onNavigateHome={() => handleNavigate('landing')} 
            onSwitchRole={handleSwitchRole} 
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
