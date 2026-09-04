import React, { useState } from 'react';
import { Activity, Clock, PlusCircle, CheckCircle, AlertTriangle, AlertOctagon, Zap, Bluetooth, Layers, Calendar } from 'lucide-react';
import { safeFormatDate } from '../services/proRataEngine';

export default function LoggingHealthBadge({ blocks, blockLatestStatus, onLogBlock, onBleScanBlock }) {
  const [phaseFilter, setPhaseFilter] = useState('ALL'); // 'ALL' | '1' | '2'

  // Partition blocks by phase
  const phase1Blocks = blocks.filter((b) => Number(b.phase) === 1 || ['A', 'B', 'F'].includes(b.id));
  const phase2Blocks = blocks.filter((b) => Number(b.phase) === 2 || ['G', 'K'].includes(b.id));

  const phase1Cap = phase1Blocks.reduce((acc, b) => acc + (b.capacityKwp || 0), 0);
  const phase2Cap = phase2Blocks.reduce((acc, b) => acc + (b.capacityKwp || 0), 0);

  const renderBlockCard = (block) => {
    const status = blockLatestStatus[block.id] || {
      daysSinceLastLog: 0,
      lastLoggedDate: block.inceptionDate,
      lastCumulativeUnits: 0,
      statusLevel: 'healthy',
    };

    const isHealthy = status.daysSinceLastLog <= 2;
    const isWarning = status.daysSinceLastLog > 2 && status.daysSinceLastLog <= 7;
    const isOverdue = status.daysSinceLastLog > 7;

    const formattedDate = safeFormatDate(status.lastLoggedDate, 'dd MMM yyyy');
    const relativeTimeStr = status.daysSinceLastLog === 0
      ? 'Today'
      : status.daysSinceLastLog === 1
      ? 'Yesterday'
      : `${status.daysSinceLastLog}d ago`;

    return (
      <div
        key={block.id}
        className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 hover:border-slate-700 transition relative overflow-hidden flex flex-col justify-between shadow-lg group"
        style={{ borderTopColor: block.color, borderTopWidth: '3px' }}
      >
        <div>
          {/* Header: Plant Name & Capacity */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: block.color }} />
                <h4 className="font-bold text-sm text-white truncate tracking-tight">{block.name}</h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                {block.capacityKwp} kWp • {block.inverterModel || 'Deye Inverter'}
              </p>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase tracking-wider shrink-0">
              Phase {block.phase || (['A', 'B', 'F'].includes(block.id) ? 1 : 2)}
            </span>
          </div>

          {/* Hero Meter Value */}
          <div className="my-3 py-2.5 px-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Cumulative Generation
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                {status.lastCumulativeUnits.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase font-mono">kWh</span>
            </div>
          </div>

          {/* Clubbed Status & Logging Date */}
          <div className="mb-3">
            {isHealthy && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 w-full">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Up to date • {formattedDate} ({relativeTimeStr})</span>
              </div>
            )}
            {isWarning && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/25 w-full">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Pro-Rata active • {formattedDate} ({relativeTimeStr})</span>
              </div>
            )}
            {isOverdue && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/25 w-full">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">Due for log • {formattedDate} ({relativeTimeStr})</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Admin Quick Actions (Compact) */}
        <div className="pt-2 border-t border-slate-800/70 flex items-center justify-end gap-1.5">
          <button
            onClick={() => onBleScanBlock && onBleScanBlock(block.id)}
            title="Scan & Read Inverter via Bluetooth"
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700/60 transition active:scale-95"
          >
            <Bluetooth className="w-3 h-3" />
            <span>BLE</span>
          </button>
          <button
            onClick={() => onLogBlock(block.id)}
            title="Record Manual Meter Reading"
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition active:scale-95"
          >
            <PlusCircle className="w-3 h-3" />
            <span>Log Meter</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-6">
      {/* Section Header with Phase Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Rooftop Substations &amp; Meter Status</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time generation meters and health monitoring across Athens rooftop plants.
          </p>
        </div>

        {/* Phase Filter Tabs */}
        <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 self-start text-xs font-semibold">
          <button
            onClick={() => setPhaseFilter('ALL')}
            className={`px-3 py-1 rounded-lg transition ${
              phaseFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({blocks.length})
          </button>
          <button
            onClick={() => setPhaseFilter('1')}
            className={`px-3 py-1 rounded-lg transition ${
              phaseFilter === '1'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Phase 1 ({phase1Cap} kWp)
          </button>
          <button
            onClick={() => setPhaseFilter('2')}
            className={`px-3 py-1 rounded-lg transition ${
              phaseFilter === '2'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Phase 2 ({phase2Cap} kWp)
          </button>
        </div>
      </div>

      {/* Phase 1 Group */}
      {(phaseFilter === 'ALL' || phaseFilter === '1') && phase1Blocks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Phase 1 Solar Plants
              </span>
              <span className="text-[11px] text-slate-400">
                (Blocks A, B, F)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {phase1Cap} kWp Installed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {phase1Blocks.map(renderBlockCard)}
          </div>
        </div>
      )}

      {/* Phase 2 Group */}
      {(phaseFilter === 'ALL' || phaseFilter === '2') && phase2Blocks.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Phase 2 Solar Plants
              </span>
              <span className="text-[11px] text-slate-400">
                (Blocks G, K)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              {phase2Cap} kWp Installed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phase2Blocks.map(renderBlockCard)}
          </div>
        </div>
      )}
    </div>
  );
}
