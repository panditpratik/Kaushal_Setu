import { useState, useEffect, useCallback } from 'react';
import { governmentService, type DistrictMetric } from '../lib/api';
import { 
  CheckCircle2, 
  Filter,
  BarChart3,
  Download,
  CheckSquare,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface GovernmentDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function GovernmentDashboard({ onNavigateHome, onSwitchRole }: GovernmentDashboardProps) {
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedProgramme, setSelectedProgramme] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [districts, setDistricts] = useState<DistrictMetric[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionRecorded, setActionRecorded] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await governmentService.getAnalytics({
        district: selectedDistrict,
        programme: selectedProgramme,
        provider: selectedProvider,
      });
      setDistricts(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      console.error('Failed to load government analytics:', err);
      setError(err.message || 'Unable to load government analytics from PostgreSQL.');
    } finally {
      setLoading(false);
    }
  }, [selectedDistrict, selectedProgramme, selectedProvider]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRecordProgrammeAction = async () => {
    try {
      await governmentService.recordAction({
        actionType: 'PROGRAMME_ACTION_RECORDED',
        district: selectedDistrict,
        amount: '₹14,50,000',
        notes: `Policy milestone action confirmed for ${selectedDistrict} cluster.`,
      });
      setActionRecorded(true);
      setActionNotice('Programme action recorded: Audit log saved to PostgreSQL.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Action failed: ${err.message}`);
    }
  };

  const handleExportData = () => {
    const jsonStr = JSON.stringify({ meta, districts }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KaushalSetu-Audit-${selectedDistrict.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setActionNotice('Report data exported successfully as JSON.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  if (loading && districts.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-[#263B52] border-t-transparent animate-spin mb-4" />
        <p className="font-mono text-sm text-[#47617C]">Loading Macro Skilling Analytics from PostgreSQL...</p>
      </div>
    );
  }

  if (error && districts.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">KaushalSetu Database Connection Error</h2>
        <p className="text-sm font-mono text-red-700 max-w-md mb-6">{error}</p>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-[#263B52] text-white rounded font-mono text-sm flex items-center gap-2 hover:bg-[#0F253B] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4E7] text-[#0F253B] flex flex-col selection:bg-[#263B52] selection:text-white">
      {/* Top Banner Navigation */}
      <div className="border-b border-[#D5CEAE] bg-[#FAF7EE] px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onNavigateHome}
              className="flex items-center gap-2 group text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded bg-[#263B52] text-[#F4F4E7] flex items-center justify-center font-serif font-bold text-sm tracking-wider">
                क
              </div>
              <div>
                <div className="font-serif font-bold text-sm tracking-wide text-[#0F253B] group-hover:text-[#263B52] transition-colors">
                  KAUSHAL SETU <span className="text-xs font-normal text-[#5A6E85]">| कौशल सेतु</span>
                </div>
                <div className="text-[10px] font-mono tracking-wider text-[#7A8C9E] uppercase">
                  National Skilling Grid & Policy Observatory
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#D5CEAE]" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D8EEDF] text-[#164627] text-xs font-mono border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              DIRECTORATE ACCESS · Live PostgreSQL Telemetry
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSwitchRole('trainee')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#263B52] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Trainee View →
            </button>
            <button
              onClick={() => onSwitchRole('employer')}
              className="px-2.5 py-1.5 bg-[#263B52] hover:bg-[#1A2C40] text-[#F4F4E7] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Employer Portal →
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div className="bg-emerald-100 border-b border-emerald-300 px-4 py-2 text-center text-xs font-mono text-emerald-800 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* Policy Dashboard Header */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-6 space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Sovereign Skilling Registry
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F253B]">
                Macro Telemetry Observatory
              </h1>
              <p className="text-xs text-[#52667A]">
                Tripartite Verification Grid · Longitudinal Wage Lift Analytics · Anti-Fraud Audit
              </p>
            </div>

            <div className="md:col-span-6 flex flex-wrap items-center justify-start md:justify-end gap-3 pt-2 md:pt-0">
              <div className="p-3 bg-white border border-[#D5CEAE] rounded text-left min-w-[130px]">
                <div className="text-[10px] font-mono uppercase text-[#7A8C9E]">Tracked Trainees</div>
                <div className="text-xl font-serif font-bold text-[#0F253B]">1,15,200</div>
                <div className="text-[10px] text-[#16803D] font-mono">28 Districts Active</div>
              </div>

              <div className="p-3 bg-white border border-[#D5CEAE] rounded text-left min-w-[130px]">
                <div className="text-[10px] font-mono uppercase text-[#7A8C9E]">6M Retention</div>
                <div className="text-xl font-serif font-bold text-[#16803D]">89.2%</div>
                <div className="text-[10px] text-[#52667A] font-mono">Consensus Verified</div>
              </div>

              <div className="p-3 bg-white border border-[#D5CEAE] rounded text-left min-w-[130px]">
                <div className="text-[10px] font-mono uppercase text-[#7A8C9E]">Avg Wage Lift</div>
                <div className="text-xl font-serif font-bold text-[#263B52]">+21.9%</div>
                <div className="text-[10px] text-[#16803D] font-mono">Wage Ledger Confirmed</div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 1: Tripartite Verification Architecture Cards */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
          <div className="border-b border-[#D5CEAE] pb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
              Section 01 · Triangulation Consensus Protocol
            </span>
            <h2 className="text-lg font-serif font-bold text-[#0F253B]">
              Zero Ghost Placements Architecture: Three Sovereign Nodes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#EDE8D5]/70 rounded border border-[#D5CEAE] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-[#263B52]">Node 01: Trainee</span>
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
              </div>
              <h3 className="font-bold text-sm text-[#0F253B]">Aadhaar e-KYC & Mobile Pulse</h3>
              <p className="text-[11px] text-[#4A5D70]">
                Trainee validates active employment monthly via zero-knowledge OTP. Geo-fenced to accredited industrial zones.
              </p>
              <div className="font-mono text-[10px] text-[#164627] pt-1">
                Active Responses: 94.8%
              </div>
            </div>

            <div className="p-4 bg-[#EDE8D5]/70 rounded border border-[#D5CEAE] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-[#263B52]">Node 02: Employer</span>
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
              </div>
              <h3 className="font-bold text-sm text-[#0F253B]">Payroll Validation Linkage</h3>
              <p className="text-[11px] text-[#4A5D70]">
                Direct payroll filing automatically confirms salary credits and uninterrupted statutory provident fund deposits.
              </p>
              <div className="font-mono text-[10px] text-[#164627] pt-1">
                Automated Pulse: 100% Tamperproof
              </div>
            </div>

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
                  <option value="All">All Clusters</option>
                  <option value="Pune">Pune Metro Region</option>
                  <option value="Sambhajinagar">Chhatrapati Sambhajinagar</option>
                  <option value="Nashik">Nashik Engineering Cluster</option>
                  <option value="Nagpur">Nagpur Logistics & Tech</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded border border-[#D5CEAE] text-xs font-mono text-[#263B52]">
                <select
                  value={selectedProgramme}
                  onChange={(e) => setSelectedProgramme(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  <option value="All">All Schemes</option>
                  <option value="PMKVY">PMKVY 4.0</option>
                  <option value="MSSDS">State Mission (MSSDS)</option>
                  <option value="DDU-GKY">DDU-GKY</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded border border-[#D5CEAE] text-xs font-mono text-[#263B52]">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  <option value="All">All Providers</option>
                  <option value="Centurion Skill Academy">Centurion Skill Academy</option>
                </select>
              </div>

              <button
                onClick={handleRecordProgrammeAction}
                disabled={actionRecorded}
                className="px-3 py-1.5 bg-[#15803D] hover:bg-[#116631] text-white rounded text-xs font-mono flex items-center gap-1.5 shadow transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{actionRecorded ? 'Programme Action Logged' : 'Record Programme Action'}</span>
              </button>

              <button
                onClick={handleExportData}
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
                  <th className="py-3 px-3">Current Wage</th>
                  <th className="py-3 px-3">Longitudinal Delta</th>
                  <th className="py-3 px-3">Compliance Rate</th>
                  <th className="py-3 px-3">Anchor Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DEC3] font-mono">
                {districts.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-[#F2EFE4] transition-colors"
                  >
                    <td className="py-3 px-3 font-sans font-bold text-[#0F253B]">
                      {item.district}
                    </td>

                    <td className="py-3 px-3 text-[#263B52]">
                      {item.activeTrainees.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-[#164627] bg-[#D8EEDF] px-2 py-0.5 rounded border border-[#B6DBC0]">
                        <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                        {item.retention6m}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-[#263B52]">
                        {item.retention12m}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-[#5A6E85]">
                      {item.avgStartingWage}
                    </td>

                    <td className="py-3 px-3 font-bold text-[#0F253B]">
                      {item.avgCurrentWage}
                    </td>

                    <td className="py-3 px-3 font-bold text-[#15803D]">
                      {item.wageDelta}
                    </td>

                    <td className="py-3 px-3 text-[#263B52]">
                      {item.complianceRate}%
                    </td>

                    <td className="py-3 px-3 font-sans text-[#4A5D70] max-w-[200px] truncate">
                      {item.leadEmployer}
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
        KaushalSetu Sovereign Observatory · Ministry of Skill Development and Entrepreneurship · Live PostgreSQL Sync
      </div>
    </div>
  );
}
