import React from 'react';
import type { AppView, StakeholderRole } from '../types';
import logoSvg from '../assets/logo.svg';
import iconSvg from '../assets/icon.svg';
import { ArrowRight, Activity, LogOut, ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  currentRole: StakeholderRole | null;
  onNavigate: (view: AppView, role?: StakeholderRole) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, currentRole, onNavigate }) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const isDashboard = currentView.endsWith('-dashboard');

  return (
    <header className="sticky top-0 z-50 w-full bg-[#F4F4E7]/95 backdrop-blur-md border-b border-[#D5CEAE] transition-all">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10 lg:px-12 h-[90px] flex items-center justify-between flex-nowrap gap-4">
        
        {/* Zone 1: Logo & Institutional Lockup (Left) */}
        <div className="flex items-center shrink-0">
          <button 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3.5 group focus:outline-none text-left cursor-pointer"
            aria-label="Kaushal Setu Homepage"
          >
            <img 
              src={logoSvg} 
              alt="Kaushal Setu कौशल सेतु" 
              className="h-11 w-auto object-contain hidden sm:block" 
            />
            <div className="flex items-center gap-2.5 sm:hidden">
              <img src={iconSvg} alt="Kaushal Setu" className="h-9 w-auto" />
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-wider text-[#263B52] leading-none">KAUSHAL SETU</span>
                <span className="font-medium text-[11px] text-[#47617C] leading-none mt-1">कौशल सेतु</span>
              </div>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Center) */}
        {!isDashboard ? (
          <nav 
            className="hidden lg:flex items-center gap-7 text-[12px] font-semibold uppercase tracking-wider text-[#47617C] shrink-0"
            aria-label="Primary Navigation"
          >
            <button 
              onClick={() => onNavigate('landing')}
              className={`relative py-1.5 transition-colors cursor-pointer ${
                currentView === 'landing' 
                  ? 'text-[#0F253B] font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#263B52]' 
                  : 'hover:text-[#0F253B]'
              }`}
            >
              Overview
            </button>
            <a 
              href="#lifecycle" 
              className="py-1.5 hover:text-[#0F253B] transition-colors"
            >
              5-Stage Lifecycle
            </a>
            <a 
              href="#metrics" 
              className="py-1.5 hover:text-[#0F253B] transition-colors"
            >
              Outcomes
            </a>
            <a 
              href="#stakeholders" 
              className="py-1.5 hover:text-[#0F253B] transition-colors"
            >
              Stakeholders
            </a>
            <a 
              href="#anti-ghosting" 
              className="py-1.5 hover:text-[#0F253B] transition-colors"
            >
              Anti-Ghosting Audit
            </a>
          </nav>
        ) : (
          /* Dashboard Navigation Breadcrumb & Context */
          <div className="flex items-center gap-2.5 text-xs font-mono text-[#47617C] shrink-0">
            <span className="text-[#0F253B] font-bold uppercase tracking-wider">
              {currentRole === 'trainee' && 'TRAINEE PORTAL · PRIYA'}
              {currentRole === 'employer' && 'EMPLOYER WORKSPACE · TATA MOTORS ANCILLARY'}
              {currentRole === 'provider' && 'PROVIDER PORTAL · CENTURION ACADEMY'}
              {currentRole === 'government' && 'SOVEREIGN INTELLIGENCE · NCVET / MSDE'}
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] bg-[#D8EEDF] text-[#164627] font-semibold border border-[#B6DBC0] rounded">
              3P Verified ✓
            </span>
          </div>
        )}

        {/* Zone 3: Actions (Right) */}
        <div className="flex items-center gap-3.5 shrink-0">
          {/* Quick Stakeholder Role Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono bg-white hover:bg-[#FAF7EE] text-[#263B52] border border-[#263B52] rounded transition-colors cursor-pointer"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <Activity className="w-3.5 h-3.5 text-[#263B52]" />
              <span className="hidden md:inline text-[#52667A]">Role View:</span>
              <span className="font-bold capitalize">{currentRole || 'Select'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#263B52] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-64 bg-white border border-[#263B52] shadow-lg rounded z-50 py-1 font-mono text-xs animate-in fade-in duration-150"
                onClick={() => setDropdownOpen(false)}
              >
                <div className="px-3.5 py-2 bg-[#F4F4E7] border-b border-[#D5CEAE] text-[10px] text-[#47617C] uppercase font-bold tracking-wider">
                  Select Stakeholder Node
                </div>
                <button
                  onClick={() => onNavigate('trainee-dashboard', 'trainee')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#F2C8B4]/30 flex items-center justify-between text-[#0F253B] transition-colors cursor-pointer"
                >
                  <span className="font-medium">01. Trainee (Priya)</span>
                  <span className="text-[10px] bg-[#F2C8B4] px-1.5 py-0.5 rounded text-[#182A3A] font-semibold">Trainee</span>
                </button>
                <button
                  onClick={() => onNavigate('employer-dashboard', 'employer')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#C8C4F2]/30 flex items-center justify-between text-[#0F253B] transition-colors cursor-pointer"
                >
                  <span className="font-medium">02. Employer (Tata)</span>
                  <span className="text-[10px] bg-[#C8C4F2] px-1.5 py-0.5 rounded text-[#182A3A] font-semibold">Employer</span>
                </button>
                <button
                  onClick={() => onNavigate('provider-dashboard', 'provider')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#F3E8A8]/30 flex items-center justify-between text-[#0F253B] transition-colors cursor-pointer"
                >
                  <span className="font-medium">03. Training Partner (VTP)</span>
                  <span className="text-[10px] bg-[#F3E8A8] px-1.5 py-0.5 rounded text-[#182A3A] font-semibold">Provider</span>
                </button>
                <button
                  onClick={() => onNavigate('government-dashboard', 'government')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#C9DCF1]/30 flex items-center justify-between text-[#0F253B] transition-colors cursor-pointer"
                >
                  <span className="font-medium">04. State Mission (Gov)</span>
                  <span className="text-[10px] bg-[#C9DCF1] px-1.5 py-0.5 rounded text-[#182A3A] font-semibold">Government</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          {currentView === 'landing' ? (
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded border border-[#263B52] transition-colors group cursor-pointer"
            >
              <span>Stakeholder Login</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : isDashboard ? (
            <button
              onClick={() => onNavigate('landing')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[#47617C] hover:text-[#0F253B] hover:bg-[#FAF7EE] rounded transition-colors cursor-pointer"
              title="Return to Overview"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('landing')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-[#263B52] hover:underline cursor-pointer"
            >
              Back to Overview
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
