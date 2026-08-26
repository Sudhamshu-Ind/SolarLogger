import React, { useState } from 'react';
import { Zap, IndianRupee, Leaf, Calendar, TrendingUp, Cpu, TreePine, ArrowUpRight } from 'lucide-react';
import { formatINR } from '../services/analytics';

export default function MetricCards({ metrics, settings, inceptionDate = "2026-07-18" }) {
  const [showMwh, setShowMwh] = useState(true);

  const formattedInception = (() => {
    try {
      const d = new Date(inceptionDate);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return inceptionDate;
    }
  })();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. Lifetime Generation Card */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-5 sm:p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lifetime Generation</span>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5 fill-amber-400/20" />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
            {showMwh
              ? `${(metrics.lifetimeMwh || 0).toLocaleString()} MWh`
              : `${(metrics.lifetimeUnits || 0).toLocaleString()} kWh`}
          </div>
          <button
            onClick={() => setShowMwh(!showMwh)}
            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline uppercase ml-2"
          >
            {showMwh ? 'Show kWh' : 'Show MWh'}
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Since {formattedInception}</span>
          </div>
          <span className="font-semibold text-amber-400/90 font-mono">
            {metrics.totalCapacityKwp} kWp Total
          </span>
        </div>
      </div>

      {/* 2. Month-To-Date (MTD) & Daily Average */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-5 sm:p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">This Month (MTD)</span>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
          {(metrics.mtdUnits || 0).toLocaleString()} <span className="text-lg font-normal text-slate-400">kWh</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Avg. Daily Output:</span>
          <span className="font-semibold text-sky-400 font-mono">
            {(metrics.avgDailyUnits || 0).toFixed(1)} kWh/day
          </span>
        </div>
      </div>

      {/* 3. Financial Savings Card */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-5 sm:p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tariff Savings</span>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight font-mono">
          {formatINR(metrics.lifetimeSavings)}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Grid Tariff:</span>
          <span className="font-semibold text-emerald-300 font-mono">
            ₹{settings.gridTariffPerKwh || 8.50} / unit
          </span>
        </div>
      </div>

      {/* 4. Environmental Impact Card */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-5 sm:p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">CO₂ Avoided</span>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Leaf className="w-5 h-5" />
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-teal-300 tracking-tight font-mono">
          {metrics.co2OffsetTons >= 1 ? `${metrics.co2OffsetTons} Tons` : `${metrics.co2OffsetKg} kg`}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1 text-teal-400">
            <TreePine className="w-3.5 h-3.5" />
            <span>Equiv. Trees:</span>
          </div>
          <span className="font-semibold text-teal-300 font-mono">
            ~{metrics.treesPlanted.toLocaleString()} planted
          </span>
        </div>
      </div>
    </div>
  );
}
