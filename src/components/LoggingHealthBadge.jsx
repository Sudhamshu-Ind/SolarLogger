import React from 'react';
import { Activity, Clock, PlusCircle, CheckCircle, AlertTriangle, AlertOctagon, Zap, Bluetooth } from 'lucide-react';
import { safeFormatDate } from '../services/proRataEngine';

export default function LoggingHealthBadge({ blocks, blockLatestStatus, onLogBlock, onBleScanBlock }) {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Rooftop Substation Status &amp; Logging Health</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Intermittent readings are automatically pro-rated across missing days until next meter check.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {blocks.map((block) => {
          const status = blockLatestStatus[block.id] || {
            daysSinceLastLog: 0,
            lastLoggedDate: block.inceptionDate,
            lastCumulativeUnits: 0,
            statusLevel: 'healthy',
          };

          const isHealthy = status.daysSinceLastLog <= 2;
          const isWarning = status.daysSinceLastLog > 2 && status.daysSinceLastLog <= 7;
          const isOverdue = status.daysSinceLastLog > 7;

          return (
            <div
              key={block.id}
              className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition relative overflow-hidden"
              style={{ borderLeftColor: block.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{block.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                    <Zap className="w-3 h-3 text-amber-400" /> {block.capacityKwp} kWp • {block.inverterModel || 'Inverter'}
                  </span>
                </div>

                {isHealthy && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" /> Up to Date
                  </span>
                )}
                {isWarning && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" /> Pro-Rata Active
                  </span>
                )}
                {isOverdue && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertOctagon className="w-3 h-3" /> Due for Log
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Last Reading</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {safeFormatDate(status.lastLoggedDate, 'dd MMM yyyy')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Meter Value</span>
                  <span className="font-mono font-semibold text-amber-400">
                    {status.lastCumulativeUnits.toLocaleString()} kWh
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {status.daysSinceLastLog === 0
                    ? 'Logged today'
                    : status.daysSinceLastLog === 1
                    ? 'Logged yesterday'
                    : `${status.daysSinceLastLog} days ago`}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onBleScanBlock && onBleScanBlock(block.id)}
                    title="Connect to Inverter via Bluetooth"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition active:scale-95"
                  >
                    <Bluetooth className="w-3.5 h-3.5" />
                    <span>BLE</span>
                  </button>
                  <button
                    onClick={() => onLogBlock(block.id)}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Log Meter</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
