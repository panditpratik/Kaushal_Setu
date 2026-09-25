import React from 'react';
import iconSvg from '../assets/icon.svg';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#D5CEAE] bg-[#FAF7EE] text-[#102A43] pt-12 pb-8">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10 lg:px-12 flex flex-col justify-between">
        
        {/* Main 4-Column Grid: Left Identity + 3 Domain Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-10 border-b border-[#D5CEAE]">
          
          {/* Left: Wordmark + Hindi line + One-line description */}
          <div className="md:col-span-4 lg:col-span-5 flex flex-col items-start pr-0 md:pr-6">
            <div className="flex items-center gap-3 mb-3">
              <img src={iconSvg} alt="Kaushal Setu Mark" className="h-8 w-auto" />
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-wider text-[#263B52] leading-none">
                  KAUSHALSETU
                </span>
                <span className="font-medium text-xs text-[#52667A] leading-none mt-1">
                  कौशल सेतु · National Longitudinal Skilling Registry
                </span>
              </div>
            </div>
            
            <p className="text-xs text-[#52667A] leading-relaxed max-w-sm mt-1 font-sans">
              Continuous 18-month career outcome tracking, triple-party consensus verification, and statutory curriculum feedback under NCVET standards.
            </p>

            <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-[#47617C]">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Sovereign Registry Node: IN-DEL-9842</span>
            </div>
          </div>

          {/* Column 1: Platform */}
          <div className="md:col-span-2 lg:col-span-2 flex flex-col">
            <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-[#263B52] mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-[#52667A]">
              <li>
                <a href="#overview" className="hover:text-[#0F253B] transition-colors">Overview</a>
              </li>
              <li>
                <a href="#lifecycle" className="hover:text-[#0F253B] transition-colors">5-Stage Lifecycle</a>
              </li>
              <li>
                <a href="#metrics" className="hover:text-[#0F253B] transition-colors">Outcome Benchmarks</a>
              </li>
              <li>
                <a href="#anti-ghosting" className="hover:text-[#0F253B] transition-colors">Longitudinal Telemetry</a>
              </li>
            </ul>
          </div>

          {/* Column 2: Verification */}
          <div className="md:col-span-3 lg:col-span-2 flex flex-col">
            <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-[#263B52] mb-3">
              Verification
            </h4>
            <ul className="space-y-2 text-xs text-[#52667A]">
              <li>
                <a href="#anti-ghosting" className="hover:text-[#0F253B] transition-colors">3-Party Consensus</a>
              </li>
              <li>
                <span className="text-[#52667A]">EPFO Contribution Pulse</span>
              </li>
              <li>
                <span className="text-[#52667A]">Aadhaar Biometric Proof</span>
              </li>
              <li>
                <span className="text-[#52667A]">Anti-Ghosting Audit Logs</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Stakeholders */}
          <div className="md:col-span-3 lg:col-span-3 flex flex-col">
            <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-[#263B52] mb-3">
              Stakeholders
            </h4>
            <ul className="space-y-2 text-xs text-[#52667A]">
              <li>
                <a href="#stakeholders" className="hover:text-[#0F253B] transition-colors">Trainee Career Passport</a>
              </li>
              <li>
                <a href="#stakeholders" className="hover:text-[#0F253B] transition-colors">Employer Workspace (LIN)</a>
              </li>
              <li>
                <a href="#stakeholders" className="hover:text-[#0F253B] transition-colors">Training Partners (VTP / ITI)</a>
              </li>
              <li>
                <a href="#stakeholders" className="hover:text-[#0F253B] transition-colors">State Mission Control (MSDE)</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Restrained Legal Links */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-[#52667A] text-center sm:text-left">
          <div className="max-w-md sm:max-w-none">
            © 2026 Kaushal Setu · National Council for Vocational Education and Training (NCVET)
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-[#47617C]">
            <span className="hover:text-[#0F253B] cursor-pointer">Privacy Policy</span>
            <span>·</span>
            <span className="hover:text-[#0F253B] cursor-pointer">Terms of Telemetry</span>
            <span>·</span>
            <span className="hover:text-[#0F253B] cursor-pointer">Accessibility Statement</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
