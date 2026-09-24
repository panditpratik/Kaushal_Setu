import { useState } from 'react';
import type { AppView, StakeholderRole } from './types';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { LoginPage } from './components/LoginPage';
import { TraineeDashboard } from './components/TraineeDashboard';
import { EmployerDashboard } from './components/EmployerDashboard';
import { ProviderDashboard } from './components/ProviderDashboard';
import { GovernmentDashboard } from './components/GovernmentDashboard';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [currentRole, setCurrentRole] = useState<StakeholderRole | null>(null);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            onNavigate={handleNavigate} 
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
