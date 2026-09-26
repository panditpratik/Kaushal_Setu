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
import { authService, type AuthUser } from './lib/api';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [currentRole, setCurrentRole] = useState<StakeholderRole | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Restore authenticated session on mount (Phase 19: GET /api/auth/me)
  useEffect(() => {
    authService.getMe().then((user) => {
      if (user) {
        setCurrentUser(user);
        const roleMap: Record<string, { role: StakeholderRole; view: AppView }> = {
          TRAINEE: { role: 'trainee', view: 'trainee-dashboard' },
          EMPLOYER: { role: 'employer', view: 'employer-dashboard' },
          TRAINING_PROVIDER: { role: 'provider', view: 'provider-dashboard' },
          GOVERNMENT: { role: 'government', view: 'government-dashboard' },
        };
        const mapped = roleMap[user.role];
        if (mapped) {
          setCurrentRole(mapped.role);
        }
      }
    });
  }, []);

  const handleNavigate = (view: AppView, role?: StakeholderRole) => {
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
    authService.getMe().then((u) => setCurrentUser(u));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = useCallback(async () => {
    await authService.logout();
    setCurrentUser(null);
    setCurrentRole(null);
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
      {currentView === 'login' ? (
        <LoginPage 
          onLogin={handleLogin} 
          onNavigateHome={() => handleNavigate('landing')} 
        />
      ) : currentView === 'trainee-dashboard' ? (
        <TraineeDashboard 
          onNavigateHome={() => handleNavigate('landing')} 
          onSwitchRole={handleSwitchRole} 
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
        <>
          <Header 
            currentView={currentView} 
            currentRole={currentRole} 
            currentUser={currentUser}
            onNavigate={handleNavigate} 
            onLogout={handleLogout}
          />
          <main className="flex-1">
            <LandingPage onNavigate={handleNavigate} />
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}

export default App;
