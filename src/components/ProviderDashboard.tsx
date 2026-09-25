import { useState, useEffect } from 'react';
import { PROVIDER_BATCHES } from '../data/mockData';
import type { ProviderBatch } from '../types';
import { fetchProviderBatches } from '../lib/api';
import { 
  UserCheck, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen
} from 'lucide-react';

interface ProviderDashboardProps {
  onNavigateHome: () => void;
  onSwitchRole: (role: string) => void;
}

export function ProviderDashboard({ onNavigateHome, onSwitchRole }: ProviderDashboardProps) {
  const [batches, setBatches] = useState<ProviderBatch[]>(PROVIDER_BATCHES);
  const [selectedBatch, setSelectedBatch] = useState<ProviderBatch>(PROVIDER_BATCHES[0]);
  const [moduleDeployed, setModuleDeployed] = useState(false);

  useEffect(() => {
    fetchProviderBatches('centurion').then(res => {
      if (res && res.length > 0) {
        setBatches(res);
        setSelectedBatch(res[0]);
      }
    });
  }, []);

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
                  Training Partner Performance & DBT Portal
                </div>
              </div>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#D5CEAE]" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D8EEDF] text-[#164627] text-xs font-mono border border-[#B6DBC0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
              SMART ID: TP-SMART-MH-9481 · 5-Star Accredited
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSwitchRole('government')}
              className="px-2.5 py-1.5 bg-[#EDE8D5] hover:bg-[#E2DDC7] text-[#263B52] rounded text-xs font-mono transition-colors"
            >
              Switch to Government View →
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 sm:px-8 space-y-6">
        
        {/* Training Provider Header Snapshot */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            <div className="lg:col-span-5 flex items-start gap-4">
              <div className="w-14 h-14 rounded bg-[#263B52] text-[#F3E8A8] flex items-center justify-center font-serif font-bold text-xl border-2 border-[#D5CEAE] shadow-xs">
                CA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0F253B]">
                    Centurion Skill Academy
                  </h1>
                </div>
                <p className="text-xs text-[#5A6E85] mt-0.5">
                  Pune Metro Regional Training Hub, Maharashtra
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs font-mono text-[#7A8C9E]">
                  <UserCheck className="w-3.5 h-3.5 text-[#263B52]" />
                  <span>NCVET Authorized Awarding Body Partner #AAB-981</span>
                </div>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Total Enrolled</span>
                <span className="text-lg font-bold font-mono text-[#0F253B]">133</span>
                <span className="text-[10px] font-mono text-[#15803D] block mt-0.5">3 Active Batches</span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">Placement Rate</span>
                <span className="text-lg font-bold font-mono text-[#15803D]">91.2%</span>
                <span className="text-[10px] font-mono text-[#5A6E85] block mt-0.5">117 Placed in Industry</span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">12M Retention</span>
                <span className="text-lg font-bold font-mono text-[#0F253B]">84.6%</span>
                <span className="text-[10px] font-mono text-[#15803D] block mt-0.5">+14% vs National Avg</span>
              </div>

              <div className="bg-[#EDE8D5] p-3 rounded border border-[#D5CEAE]">
                <span className="text-[10px] font-mono uppercase text-[#687C92] block">DBT Incentive</span>
                <span className="text-lg font-bold font-mono text-[#15803D] flex items-center gap-0.5">
                  ₹7.50L
                </span>
                <span className="text-[10px] font-mono text-[#15803D] block mt-0.5">Unlocked via Retention</span>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 1: Batch Performance & Retention Ledger */}
        <div className="bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5CEAE] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#263B52]">
                <Award className="w-3.5 h-3.5 text-[#263B52]" />
                Section 01 · Batch Performance & Longitudinal Retention Telemetry
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#0F253B]">
                Accredited Cohorts & Direct Benefit Incentive Milestones
              </h2>
            </div>

            <div className="text-xs font-mono text-[#5A6E85]">
              NCVET Tier-1 Retention Multiplier Applied
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {batches.map((batch) => {
              const isSelected = selectedBatch.id === batch.id;
              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch)}
                  className={`p-4 rounded border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white border-[#263B52] shadow-md ring-1 ring-[#263B52]'
                      : 'bg-[#EDE8D5]/60 border-[#D5CEAE] hover:bg-[#FAF7EE]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF7EE] border border-[#D5CEAE] text-[#263B52]">
                      {batch.id}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                      batch.status === 'audited' 
                        ? 'bg-[#D8EEDF] text-[#164627]' 
                        : batch.status === 'active' 
                        ? 'bg-[#C9DCF1] text-[#163558]'
                        : 'bg-[#F3E8A8] text-[#54480A]'
                    }`}>
                      {batch.status}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-sm text-[#0F253B] line-clamp-1">
                    {batch.name}
                  </h3>
                  <div className="text-xs text-[#5A6E85] mt-0.5 mb-3">
                    {batch.sector}
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-t border-[#D5CEAE] text-center text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-[#7A8C9E] block">Enrolled</span>
                      <span className="font-bold text-[#0F253B]">{batch.enrolled}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7A8C9E] block">Certified</span>
                      <span className="font-bold text-[#0F253B]">{batch.certified}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7A8C9E] block">Placed</span>
                      <span className="font-bold text-[#15803D]">{batch.placed}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#D5CEAE] space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#5A6E85]">6M Retention Rate</span>
                      <span className="font-bold text-[#15803D]">{batch.retentionRate6m}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#5A6E85]">12M Retention Rate</span>
                      <span className="font-bold text-[#263B52]">{batch.retentionRate12m}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1 text-[#164627] font-semibold bg-[#D8EEDF]/50 px-2 py-1 rounded">
                      <span>DBT Incentive</span>
                      <span>{batch.incentiveAmount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: DBT Performance-Linked Incentive Unlock Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
            <div className="border-b border-[#D5CEAE] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Section 02 · DBT Performance Disbursement Protocol
              </span>
              <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                Tranche 3 Incentive Unlock Ledger: {selectedBatch.id}
              </h3>
              <p className="text-xs text-[#5A6E85] mt-1">
                Under the KaushalSetu reform, training partner payments are disbursed in tranches tied directly to verified longitudinal retention milestones.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Tranche 1 */}
              <div className="p-3 bg-white rounded border border-[#D5CEAE] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D8EEDF] text-[#164627] flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0F253B]">Tranche 1: Mobilization & Workshop Training (30%)</div>
                    <div className="text-[11px] text-[#7A8C9E]">420 Practical Hours verified via biometric attendance</div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#15803D]">Disbursed (₹4.20L)</span>
              </div>

              {/* Tranche 2 */}
              <div className="p-3 bg-white rounded border border-[#D5CEAE] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D8EEDF] text-[#164627] flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0F253B]">Tranche 2: NCVET Assessment & First Placement (50%)</div>
                    <div className="text-[11px] text-[#7A8C9E]">89% pass rate, 40 trainees placed in Tier-1 auto ancillaries</div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#15803D]">Disbursed (₹7.00L)</span>
              </div>

              {/* Tranche 3 */}
              <div className="p-3 bg-[#EDE8D5] rounded border border-[#263B52] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#263B52] text-[#F3E8A8] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0F253B]">Tranche 3: 12-Month Retention Bonus (20% Premium)</div>
                    <div className="text-[11px] text-[#5A6E85]">EPFO-verified {selectedBatch.retentionRate12m}% retention exceeds the 70% threshold</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-[#15803D] block">{selectedBatch.incentiveAmount}</span>
                  <span className="text-[10px] font-mono text-[#263B52]">Automated DBT Transfer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Incoming Employer Feedback & Syllabus Interventions */}
          <div className="lg:col-span-5 bg-[#FAF7EE] border border-[#D5CEAE] rounded-lg p-6 shadow-xs space-y-4">
            <div className="border-b border-[#D5CEAE] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#263B52] block">
                Section 03 · Dynamic Curriculum Action
              </span>
              <h3 className="text-lg font-serif font-bold text-[#0F253B]">
                Incoming Employer Telemetry
              </h3>
            </div>

            <div className="p-4 bg-[#EDE8D5] rounded border border-[#D5CEAE] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-[#263B52] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                  Tata Motors Operational Report
                </span>
                <span className="text-[10px] font-mono text-[#7A8C9E]">24 Nov 2024</span>
              </div>

              <p className="text-[11px] text-[#0F253B] leading-relaxed">
                "Batch 14 graduates understand basic circuit diagrams, but require hands-on calibration experience with Siemens S7-1200 PLCs."
              </p>

              <div className="pt-2 border-t border-[#D5CEAE] flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#5A6E85]">
                  Micro-Credential #IND-409
                </span>
                <button
                  onClick={() => setModuleDeployed(true)}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                    moduleDeployed 
                      ? 'bg-[#D8EEDF] text-[#164627] font-semibold' 
                      : 'bg-[#263B52] hover:bg-[#1A2C40] text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{moduleDeployed ? 'Module Deployed to LMS' : 'Deploy PLC Module'}</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#687C92] bg-white p-3 rounded border border-[#D5CEAE] space-y-1">
              <div className="font-semibold text-[#0F253B]">Closing the Skilling Gap:</div>
              <div>Deploying this micro-credential automatically alerts all 43 certified trainees from Batch 14 with a 10-hour weekend hybrid workshop on PLC diagnostic calibration.</div>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <div className="border-t border-[#D5CEAE] bg-[#FAF7EE] py-3 px-4 text-center text-xs font-mono text-[#687C92]">
        KaushalSetu Training Partner Terminal · National Council for Vocational Education and Training
      </div>
    </div>
  );
}
