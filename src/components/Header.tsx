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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Left: Logo & Wordmark */}
        <div className="flex items-center gap-4 lg:gap-8">
          <button 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 group focus:outline-none text-left"
          >
            <img 
              src={logoSvg} 
              alt="Kaushal Setu कौशल सेतु" 
              className="h-10 w-auto object-contain hidden sm:block" 
            />
            <div className="flex items-center gap-2 sm:hidden">
              <img src={iconSvg} alt="Kaushal Setu" className="h-8 w-auto" />
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-wider text-[#263B52] leading-none">KAUSHAL SETU</span>
                <span className="font-medium text-xs text-[#263B52] leading-none mt-0.5">कौशल सेतु</span>
              </div>
            </div>
          </button>

          {/* Telemetry pill */}
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E3EFFF] border border-[#263B52]/20 text-[11px] font-mono font-medium text-[#263B52] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            Telemetry Node: IN-DEL-9842
          </div>
        </div>

        {/* Center: Navigation Links (on landing) */}
        {!isDashboard ? (
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#47617C]">
            <button 
              onClick={() => onNavigate('landing')}
              className={`hover:text-[#0F253B] transition-colors ${currentView === 'landing' ? 'text-[#0F253B] font-bold border-b-2 border-[#263B52] pb-0.5' : ''}`}
            >
              Overview
            </button>
            <a 
              href="#lifecycle" 
              className="hover:text-[#0F253B] transition-colors"
            >
              5-Stage Lifecycle
            </a>
            <a 
              href="#metrics" 
              className="hover:text-[#0F253B] transition-colors"
            >
              Outcomes
            </a>
            <a 
              href="#stakeholders" 
              className="hover:text-[#0F253B] transition-colors"
            >
              Stakeholders
            </a>
            <a 
              href="#anti-ghosting" 
              className="hover:text-[#0F253B] transition-colors"
            >
              Anti-Ghosting Audit
            </a>
          </nav>
        ) : (
          /* Dashboard Navigation Breadcrumb & Context */
          <div className="flex items-center gap-2 text-xs font-mono text-[#47617C]">
            <span className="text-[#0F253B] font-bold uppercase tracking-wider">
              {currentRole === 'trainee' && 'TRAINEE PORTAL · PRIYA'}
              {currentRole === 'employer' && 'EMPLOYER WORKSPACE · TATA MOTORS ANCILLARY'}
              {currentRole === 'provider' && 'PROVIDER PORTAL · CENTURION ACADEMY'}
              {currentRole === 'government' && 'SOVEREIGN INTELLIGENCE · NCVET / MSDE'}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] bg-[#D8EEDF] text-[#182A3A] font-semibold border border-[#182A3A]/20 rounded">
              3P Verified ✓
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Stakeholder Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-white hover:bg-[#F7EEDC] text-[#263B52] border border-[#263B52] rounded transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-[#263B52]" />
              <span className="hidden sm:inline">Role View:</span>
              <span className="font-bold capitalize">{currentRole || 'Select'}</span>
              <ChevronDown className="w-3 h-3 text-[#263B52]" />
            </button>

            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-64 bg-white border border-[#263B52] shadow-lg rounded z-50 py-1 font-mono text-xs"
                onClick={() => setDropdownOpen(false)}
              >
                <div className="px-3 py-2 bg-[#F4F4E7] border-b border-[#D5CEAE] text-[10px] text-[#47617C] uppercase font-bold tracking-wider">
                  Select Stakeholder Node
                </div>
                <button
                  onClick={() => onNavigate('trainee-dashboard', 'trainee')}
                  className="w-full text-left px-3 py-2 hover:bg-[#F2C8B4]/40 flex items-center justify-between text-[#0F253B]"
                >
                  <span>01. Trainee (Priya)</span>
                  <span className="text-[10px] bg-[#F2C8B4] px-1.5 py-0.5 rounded text-[#182A3A]">Trainee</span>
                </button>
                <button
                  onClick={() => onNavigate('employer-dashboard', 'employer')}
                  className="w-full text-left px-3 py-2 hover:bg-[#C8C4F2]/40 flex items-center justify-between text-[#0F253B]"
                >
                  <span>02. Employer (Tata)</span>
                  <span className="text-[10px] bg-[#C8C4F2] px-1.5 py-0.5 rounded text-[#182A3A]">Employer</span>
                </button>
                <button
                  onClick={() => onNavigate('provider-dashboard', 'provider')}
                  className="w-full text-left px-3 py-2 hover:bg-[#F3E8A8]/40 flex items-center justify-between text-[#0F253B]"
                >
                  <span>03. Training Partner (VTP)</span>
                  <span className="text-[10px] bg-[#F3E8A8] px-1.5 py-0.5 rounded text-[#182A3A]">Provider</span>
                </button>
                <button
                  onClick={() => onNavigate('government-dashboard', 'government')}
                  className="w-full text-left px-3 py-2 hover:bg-[#C9DCF1]/40 flex items-center justify-between text-[#0F253B]"
                >
                  <span>04. State Mission (Gov)</span>
                  <span className="text-[10px] bg-[#C9DCF1] px-1.5 py-0.5 rounded text-[#182A3A]">Government</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          {currentView === 'landing' ? (
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded border border-[#263B52] transition-colors group"
            >
              <span>Stakeholder Login</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : isDashboard ? (
            <button
              onClick={() => onNavigate('landing')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#47617C] hover:text-[#0F253B] transition-colors"
              title="Return to Overview"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('landing')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#263B52] hover:underline"
            >
              Back to Overview
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
