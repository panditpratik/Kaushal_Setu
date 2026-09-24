import { useState } from 'react';
import { 
  Landmark, 
  ShieldCheck, 
  CheckCircle2, 
  Filter,
  BarChart3,
  Download,
  CheckSquare
} from 'lucide-react';

interface GovernmentDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function GovernmentDashboard({ onNavigateHome, onSwitchRole }: GovernmentDashboardProps) {
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [batchReleased, setBatchReleased] = useState(false);

  const districtData = [
    {
      district: 'Pune Metro Region',
      activeTrainees: 42100,
      retention6m: 91.2,
      retention12m: 87.5,
      avgStartingWage: '₹17,400',
      avgCurrentWage: '₹21,800',
      wageDelta: '+25.2%',
      complianceRate: 99.8,
      leadEmployer: 'Tata Motors, Bharat Forge, Bajaj'
    },
    {
      district: 'Chhatrapati Sambhajinagar',
      activeTrainees: 28400,
      retention6m: 88.4,
      retention12m: 83.9,
      avgStartingWage: '₹15,800',
      avgCurrentWage: '₹18,900',
      wageDelta: '+19.6%',
      complianceRate: 99.4,
      leadEmployer: 'Endurance Tech, Varroc, Škoda'
    },
    {
      district: 'Nashik Engineering Cluster',
      activeTrainees: 24900,
      retention6m: 89.1,
      retention12m: 85.2,
      avgStartingWage: '₹16,200',
      avgCurrentWage: '₹19,600',
      wageDelta: '+20.9%',
      complianceRate: 99.7,
      leadEmployer: 'Mahindra & Mahindra, Bosch'
    },
    {
      district: 'Nagpur Logistics & Tech',
      activeTrainees: 19800,
      retention6m: 86.0,
      retention12m: 81.3,
      avgStartingWage: '₹15,200',
      avgCurrentWage: '₹17,800',
      wageDelta: '+17.1%',
      complianceRate: 99.2,
      leadEmployer: 'MIHAN SEZ, TAL Manufacturing'
    }
  ];

  const handleReleaseDbtBatch = () => {
    setBatchReleased(true);
    setTimeout(() => {
      alert("DBT Milestone Batch Dispatched: ₹4.85 Crores authorized across 42 accredited training partners with verified 12-month retention.");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col selection:bg-[#263B52] selection:text-white">
      {/* Top Banner Navigation */}
      <div className="border-b border-[#D5CEAE] bg-[#FAF7EE] px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onNavigateHome}
              className="flex items-center gap-2 group text-left"
            >
              <div className="w-8 h-8 rounded bg-[#263B52] text-[#F4F4E7] flex items-center justify-center font-serif font-bold text-sm tracking-wider">
                क
              </div>
              <div>
                <div className="font-serif font-bold text-sm tracking-wide text-[#0F253B] group-hover:text-[#263B52] transition-colors">
                  KAUSHAL SETU <span className="text-xs font-normal text-[#5A6E85]">| कौशल सेतु</span>
                </div>
                <div className="text-[10px] font-mono tracking-wider text-[#7A8C9E] uppercase">
                  National Skilling Mission & Sovereign Intelligence
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#D5CEAE]" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D8EEDF] text-[#164627] text-xs font-mono border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              NIC Sovereign Auth: officer.deshmukh@msde.gov.in
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSwitchRole('trainee')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#263B52] rounded text-xs font-mono transition-colors"
            >
              Switch to Trainee View →
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* State Directorate Header Snapshot */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            <div className="lg:col-span-5 flex items-start gap-4">
              <div className="w-14 h-14 rounded bg-[#263B52] text-[#F3E8A8] flex items-center justify-center font-serif font-bold text-xl border-2 border-[#D5CEAE] shadow-xs">
                GOI
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0F253B]">
                    Ministry of Skill Development & Entrepreneurship
                  </h1>
                </div>
                <p className="text-xs text-[#5A6E85] mt-0.5">
                  State Directorate of Vocational Education · Maharashtra Mission Control
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs font-mono text-[#7A8C9E]">
                  <Landmark className="w-3.5 h-3.5 text-[#263B52]" />
                  <span>NCVET National Outcome Verification Engine (NOVE)</span>
                </div>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Verified Beneficiaries</span>
                <span className="text-lg font-bold font-mono text-[#0F253B]">1,48,290</span>
                <span className="text-[10px] font-mono text-[#15803D] block mt-0.5">Aadhaar Linked</span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">12M Retention</span>
                <span className="text-lg font-bold font-mono text-[#15803D]">84.5%</span>
                <span className="text-[10px] font-mono text-[#15803D] block mt-0.5">+38.5% vs Legacy</span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Ghost Deficit</span>
                <span className="text-lg font-bold font-mono text-[#15803D]">0.00%</span>
                <span className="text-[10px] font-mono text-[#5A6E85] block mt-0.5">3-Party Proof</span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Fiscal Protection</span>
                <span className="text-lg font-bold font-mono text-[#0F253B]">₹412 Cr</span>
                <span className="text-[10px] font-mono text-[#15803D] block mt-0.5">Subsidies Protected</span>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 1: 3-Party Consensus Anti-Ghosting Architecture */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5CEAE] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#263B52]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                Section 01 · Triple-Party Consensus Engine
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#0F253B]">
                Cryptographic Anti-Ghosting Telemetry
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-[#D8EEDF] text-[#164627] text-xs font-mono font-bold border border-[#B6DBC0] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ledger Health: 99.82% Consensus
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Node 1 */}
            <div className="p-4 bg-[#EDE8D5]/70 rounded border border-[#D5CEAE] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-[#263B52]">Node 01: Trainee</span>
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
              </div>
              <h3 className="font-bold text-sm text-[#0F253B]">Aadhaar Virtual ID & Mobile Pulse</h3>
              <p className="text-[11px] text-[#4A5D70]">
                Trainee validates active employment monthly via zero-knowledge OTP. Geo-fenced to accredited industrial zones.
              </p>
              <div className="font-mono text-[10px] text-[#164627] pt-1">
                Active Responses: 94.8%
              </div>
            </div>

            {/* Node 2 */}
            <div className="p-4 bg-[#EDE8D5]/70 rounded border border-[#D5CEAE] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-[#263B52]">Node 02: Employer</span>
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
              </div>
              <h3 className="font-bold text-sm text-[#0F253B]">EPFO Shram Suvidha API Linkage</h3>
              <p className="text-[11px] text-[#4A5D70]">
                Direct payroll ECR filing automatically confirms salary credits and uninterrupted statutory provident fund deposits.
              </p>
              <div className="font-mono text-[10px] text-[#164627] pt-1">
                Automated Pulse: 100% Tamperproof
              </div>
            </div>

            {/* Node 3 */}
            <div className="p-4 bg-[#EDE8D5]/70 rounded border border-[#D5CEAE] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-[#263B52]">Node 03: Provider</span>
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
              </div>
              <h3 className="font-bold text-sm text-[#0F253B]">NCVET Skill Passport Ledger</h3>
              <p className="text-[11px] text-[#4A5D70]">
                Training institute logs practical workshop hours and assessments, earning performance DBT bonuses strictly on 12M tenure.
              </p>
              <div className="font-mono text-[10px] text-[#164627] pt-1">
                Accreditation: 5-Star Benchmark
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Sovereign District Wage Multipliers & Policy Benchmarks */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5CEAE] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#263B52]">
                <BarChart3 className="w-3.5 h-3.5 text-[#263B52]" />
                Section 02 · District Longitudinal Wage Multipliers
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#0F253B]">
                Sovereign Wage Progression & Retention Benchmarks by Cluster
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded border border-[#D5CEAE] text-xs font-mono text-[#263B52]">
                <Filter className="w-3.5 h-3.5 text-[#5A6E85]" />
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  <option value="All">All Maharashtra Clusters</option>
                  <option value="Pune Metro Region">Pune Metro Region</option>
                  <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
                  <option value="Nashik Engineering Cluster">Nashik Engineering Cluster</option>
                  <option value="Nagpur Logistics & Tech">Nagpur Logistics & Tech</option>
                </select>
              </div>

              <button
                onClick={handleReleaseDbtBatch}
                disabled={batchReleased}
                className="px-3 py-1.5 bg-[#15803D] hover:bg-[#116631] text-white rounded text-xs font-mono flex items-center gap-1.5 shadow transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{batchReleased ? 'DBT Batch Authorized' : 'Authorize Q3 Retention DBT Batch'}</span>
              </button>

              <button
                onClick={() => alert("Downloading State Longitudinal Skilling Audit PDF (MSDE-MH-Q3-2025)...")}
                className="px-3 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#263B52] rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-[#D5CEAE]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            </div>
          </div>

          {/* District Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EDE8D5] border-b border-[#D5CEAE] font-mono text-[11px] text-[#263B52] uppercase tracking-wider">
                  <th className="py-3 px-3">Industrial Cluster / District</th>
                  <th className="py-3 px-3">Active Beneficiaries</th>
                  <th className="py-3 px-3 text-center">6M Retention</th>
                  <th className="py-3 px-3 text-center">12M Retention</th>
                  <th className="py-3 px-3">Starting Wage</th>
                  <th className="py-3 px-3">12M Wage (Avg)</th>
                  <th className="py-3 px-3">Longitudinal Delta</th>
                  <th className="py-3 px-3">Key Hiring Sectors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5CEAE] font-mono text-xs">
                {districtData
                  .filter(d => selectedDistrict === 'All' || d.district === selectedDistrict)
                  .map((dist, idx) => (
                  <tr key={idx} className="hover:bg-[#F2EFE4] transition-colors">
                    <td className="py-3 px-3 font-sans font-bold text-[#0F253B]">
                      {dist.district}
                    </td>
                    <td className="py-3 px-3 text-[#263B52]">
                      {dist.activeTrainees.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#15803D]">
                      {dist.retention6m}%
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#263B52]">
                      {dist.retention12m}%
                    </td>
                    <td className="py-3 px-3 text-[#7A8C9E]">
                      {dist.avgStartingWage}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#0F253B]">
                      {dist.avgCurrentWage}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#15803D]">
                      {dist.wageDelta}
                    </td>
                    <td className="py-3 px-3 font-sans text-[#4A5D70] text-[11px]">
                      {dist.leadEmployer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Footer */}
      <div className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3 px-4 text-center text-xs font-mono text-[#687C92]">
        National Longitudinal Skilling Observatory · Ministry of Skill Development and Entrepreneurship · NIC Cloud
      </div>
    </div>
  );
}
