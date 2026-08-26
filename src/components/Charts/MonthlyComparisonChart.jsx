import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { aggregateMonthlyData } from '../../services/analytics';
import { BarChart3, Layers, BarChart2 } from 'lucide-react';

export default function MonthlyComparisonChart({ dailySeries, blocks }) {
  const [isStacked, setIsStacked] = useState(true);

  const monthlyData = useMemo(() => {
    return aggregateMonthlyData(dailySeries, blocks);
  }, [dailySeries, blocks]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs min-w-[200px]">
          <div className="border-b border-slate-800 pb-2 mb-2 font-bold text-slate-200 text-sm">
            {dataPoint.monthLabel}
          </div>
          <div className="space-y-1.5 font-mono">
            {blocks.map((b) => {
              const val = dataPoint[b.id] || 0;
              return (
                <div key={b.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-slate-300">{b.name}</span>
                  </div>
                  <span className="font-bold text-white">{val.toLocaleString()} kWh</span>
                </div>
              );
            })}
            <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between font-bold text-slate-100">
              <span className="font-sans">Total Monthly:</span>
              <span className="text-amber-400 text-sm">{dataPoint.totalUnits.toLocaleString()} kWh</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <span>Monthly Generation Breakdown</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated solar output per block across calendar months.
          </p>
        </div>

        <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 self-start">
          <button
            onClick={() => setIsStacked(true)}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition ${
              isStacked ? 'bg-sky-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stacked</span>
          </button>
          <button
            onClick={() => setIsStacked(false)}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition ${
              !isStacked ? 'bg-sky-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Grouped</span>
          </button>
        </div>
      </div>

      <div className="h-[280px] sm:h-[320px] w-full">
        {monthlyData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No monthly data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
              />

              {blocks.map((b) => (
                <Bar
                  key={b.id}
                  dataKey={b.id}
                  name={b.name}
                  fill={b.color}
                  stackId={isStacked ? 'a' : undefined}
                  radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
