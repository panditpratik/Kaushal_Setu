import React from 'react';
import heroPlaneSvg from '../assets/hero-plane.svg';
import { useTraineeDossier } from '../hooks/useTraineeDossier';
import type { TraineeDossier } from '../lib/api';

export interface TrajectoryArcCardProps {
  traineeId?: string;
  data?: TraineeDossier | null;
  loading?: boolean;
  error?: string | null;
  onViewDossier: () => void;
}

export const TrajectoryCardSkeleton: React.FC = () => (
  <div className="w-full max-w-[560px] bg-white border border-[#263B52] rounded-lg p-4 sm:p-5 shadow-xs relative animate-pulse">
    {/* Header Tag Strip */}
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#D5CEAE] mb-3.5 text-[11px] font-mono text-[#47617C]">
      <span className="font-bold text-[#0F253B] uppercase tracking-wider flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#F2C8B4] shrink-0" />
        <span>LONGITUDINAL TRAJECTORY ARC</span>
      </span>
      <span className="text-[#52667A] font-semibold shrink-0">TEL-NODE #4892</span>
    </div>

    {/* The SVG Plane Illustration Placeholder */}
    <div className="w-full aspect-[16/10] rounded border border-[#D5CEAE] overflow-hidden bg-[#FAF7EE] flex items-center justify-center">
      <span className="text-xs font-mono text-[#52667A]">Syncing Telemetry Node...</span>
    </div>

    {/* Trajectory Velocity Footer Strip Skeleton */}
    <div className="mt-3.5 p-3.5 bg-[#FAF7EE] border border-[#D5CEAE] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
      <div className="min-w-0">
        <div className="h-2.5 bg-[#D5CEAE] rounded w-28 mb-1.5" />
        <div className="h-4 bg-[#D5CEAE] rounded w-48" />
      </div>
      <div className="h-7 bg-[#263B52]/20 rounded w-24 shrink-0" />
    </div>
  </div>
);

export const TrajectoryCardError: React.FC<{ error?: string | null; onViewDossier: () => void }> = ({ error: _error, onViewDossier }) => (
  <div className="w-full max-w-[560px] bg-white border border-[#263B52] rounded-lg p-4 sm:p-5 shadow-xs relative">
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#D5CEAE] mb-3.5 text-[11px] font-mono text-[#47617C]">
      <span className="font-bold text-[#0F253B] uppercase tracking-wider flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        <span>LONGITUDINAL TRAJECTORY ARC</span>
      </span>
      <span className="text-[#52667A] font-semibold shrink-0">TEL-NODE #4892</span>
    </div>

    <div className="w-full h-auto rounded border border-[#D5CEAE] overflow-hidden bg-[#FAF7EE]">
      <img 
        src={heroPlaneSvg} 
        alt="KaushalSetu Trajectory Arc & Paper Plane" 
        className="w-full h-auto object-contain select-none" 
      />
    </div>

    <div className="mt-3.5 p-3.5 bg-[#FAF7EE] border border-[#D5CEAE] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
      <div className="min-w-0">
        <span className="text-[#52667A] text-[10px] block uppercase tracking-wider">
          Priya's Active Velocity:
        </span>
        <span className="text-[#0F253B] font-bold block">
          +22% Net Wage Lift (14M Tenure)
        </span>
      </div>
      <button 
        onClick={onViewDossier}
        className="px-3 py-1.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-[11px] font-semibold uppercase tracking-wider rounded transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
      >
        View Dossier
      </button>
    </div>
  </div>
);

export const TrajectoryArcCard: React.FC<TrajectoryArcCardProps> = ({ 
  traineeId = 'cmugpipt8000duyu8eus0jdzn',
  data: externalData,
  loading: externalLoading,
  error: externalError,
  onViewDossier 
}) => {
  // If parent provided pre-fetched hook data, use it; otherwise invoke the hook
  const hookResult = useTraineeDossier(externalData !== undefined ? '' : traineeId);
  const data = externalData !== undefined ? externalData : hookResult.data;
  const loading = externalLoading !== undefined ? externalLoading : hookResult.loading;
  const error = externalError !== undefined ? externalError : hookResult.error;

  if (loading) return <TrajectoryCardSkeleton />;
  if (error || !data) return <TrajectoryCardError error={error} onViewDossier={onViewDossier} />;

  const firstName = data.trainee?.name ? data.trainee.name.split(' ')[0] : 'Priya';
  const wageLift = data.trajectoryVelocity?.wageLiftPercent ?? 22;
  const tenure = data.trajectoryVelocity?.tenureMonths ?? 14;
  const velocityText = `+${wageLift}% Net Wage Lift (${tenure}M Tenure)`;

  return (
    <div className="w-full max-w-[560px] bg-white border border-[#263B52] rounded-lg p-4 sm:p-5 shadow-xs relative">
      {/* Header Tag Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#D5CEAE] mb-3.5 text-[11px] font-mono text-[#47617C]">
        <span className="font-bold text-[#0F253B] uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F2C8B4] shrink-0" />
          <span>LONGITUDINAL TRAJECTORY ARC</span>
        </span>
        <span className="text-[#52667A] font-semibold shrink-0">TEL-NODE #4892</span>
      </div>

      {/* The SVG Plane Illustration */}
      <div className="w-full h-auto rounded border border-[#D5CEAE] overflow-hidden bg-[#FAF7EE]">
        <img 
          src={heroPlaneSvg} 
          alt="KaushalSetu Trajectory Arc & Paper Plane" 
          className="w-full h-auto object-contain select-none" 
        />
      </div>

      {/* Trajectory Velocity Footer Strip */}
      <div className="mt-3.5 p-3.5 bg-[#FAF7EE] border border-[#D5CEAE] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="min-w-0">
          <span className="text-[#52667A] text-[10px] block uppercase tracking-wider">
            {firstName}'s Active Velocity:
          </span>
          <span className="text-[#0F253B] font-bold block">
            {velocityText}
          </span>
        </div>
        <button 
          onClick={onViewDossier}
          className="px-3 py-1.5 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-[11px] font-semibold uppercase tracking-wider rounded transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
        >
          View Dossier
        </button>
      </div>
    </div>
  );
};
