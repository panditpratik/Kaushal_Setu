import React from 'react';
import iconSvg from '../assets/icon.svg';
import { Shield, FileCheck, Landmark } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative w-full overflow-hidden pt-16 pb-12 border-t border-[#D5CEAE] bg-[#F7F4EB] text-[#182A3A]">
      {/* Ambient pastel cloud blur silhouettes from Stitch */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-end justify-center overflow-hidden">
        <div className="w-[550px] h-[180px] rounded-full blur-3xl bg-[#F2C8B4] opacity-25 translate-y-12 -translate-x-28"></div>
        <div className="w-[600px] h-[200px] rounded-full blur-3xl bg-[#C8C4F2] opacity-30 translate-y-16"></div>
        <div className="w-[500px] h-[190px] rounded-full blur-3xl bg-[#D8EEDF] opacity-25 translate-y-14 translate-x-32"></div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Ledger Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-[#D5CEAE]/60 text-xs">
          
          <div className="flex flex-col gap-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <img src={iconSvg} alt="Kaushal Setu Mark" className="h-7 w-auto" />
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-wider text-[#263B52]">KAUSHALSETU</span>
                <span className="font-serif italic text-xs text-[#47617C]">Longitudinal Skilling Intelligence</span>
              </div>
            </div>
            <p className="text-[#52667A] leading-relaxed mt-1">
              National vocational trajectory registry bridging skilling institutions, employers, and government outcome governance.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono font-bold text-[#263B52] uppercase tracking-wider text-[11px]">
              Institutional Telemetry
            </span>
            <ul className="space-y-1.5 text-[#47617C] font-mono text-[11px]">
              <li><span className="text-[#263B52] font-semibold">Node Code:</span> IN-DEL-9842</li>
              <li><span className="text-[#263B52] font-semibold">Framework:</span> NCVET / NSQF L1-L8</li>
              <li><span className="text-[#263B52] font-semibold">Protocol:</span> 3-Party Consensus (3P)</li>
              <li><span className="text-[#263B52] font-semibold">Consensus Latency:</span> ~14ms Pulse</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono font-bold text-[#263B52] uppercase tracking-wider text-[11px]">
              Security & Compliance
            </span>
            <div className="flex flex-col gap-1.5 text-[#52667A]">
              <div className="flex items-center gap-1.5 text-xs text-[#0F253B] font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                <span>DPDP Act 2023 Compliant</span>
              </div>
              <p className="text-[11px] leading-normal">
                Zero data stored on unverified endpoints. Biometric telemetry anchored to sovereign Aadhaar and EPFO pulses.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono font-bold text-[#263B52] uppercase tracking-wider text-[11px]">
              Federated Gateways
            </span>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2 py-1 bg-white border border-[#D5CEAE] rounded flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-[#263B52]" /> DigiLocker
              </span>
              <span className="px-2 py-1 bg-white border border-[#D5CEAE] rounded flex items-center gap-1">
                <Landmark className="w-3 h-3 text-[#263B52]" /> Jan Samarth
              </span>
              <span className="px-2 py-1 bg-white border border-[#D5CEAE] rounded flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#263B52]" /> Parichay Gov
              </span>
            </div>
          </div>

        </div>

        {/* Bottom Ledger Stamp */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[#47617C]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span className="uppercase tracking-widest text-[#263B52] font-semibold">
              KAUSHALSETU ARCHIVAL TELEMETRY ENGINE · REVISION 2025.04
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#0F253B]">Ledger Block #4892</span>
            <span>© 2025 KAUSHALSETU. All rights reserved.</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
