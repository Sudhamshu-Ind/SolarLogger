import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon, Award, Gauge } from 'lucide-react';

export default function BlockDistributionChart({ metrics, blocks }) {
  const specificYields = Object.values(metrics.blockSpecificYields || {});

  const pieData = specificYields.map((b) => ({
    name: b.blockName,
    value: b.totalKwh,
    percentage: b.percentageShare,
    color: b.color,
  }));

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs">
          <div className="font-bold text-white flex items-center gap-1.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
            {data.name}
          </div>
          <div className="text-slate-300 font-mono">
            {data.value.toLocaleString()} kWh ({data.payload.percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-emerald-400" />
            <span>Block Share & Specific Yield</span>
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Efficiency Benchmark
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Specific Yield (kWh/kWp) measures plant generation normalized against installed peak capacity.
        </p>

        {/* Donut and Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5">
            {specificYields.map((item) => (
              <div key={item.blockId} className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between font-semibold mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-200">{item.blockName}</span>
                  </div>
                  <span className="text-amber-400 font-mono">{item.percentageShare}%</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                  <span>{item.totalKwh.toLocaleString()} kWh</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {item.specificYieldKwhPerKwp} kWh/kWp
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Higher kWh/kWp indicates better solar panel irradiance capture.</span>
      </div>
    </div>
  );
}
