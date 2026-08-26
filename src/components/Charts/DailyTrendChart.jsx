import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatDailyChartData } from '../../services/analytics';
import { Sparkles, Calendar, Layers, Info } from 'lucide-react';

export default function DailyTrendChart({ dailySeries, blocks }) {
  const [timeRange, setTimeRange] = useState('30d'); // '7d' | '30d' | 'all'
  const [selectedBlock, setSelectedBlock] = useState('ALL'); // 'ALL' or block id

  // Format data
  const rawChartData = useMemo(() => {
    return formatDailyChartData(dailySeries, blocks);
  }, [dailySeries, blocks]);

  // Filter by timeframe
  const filteredData = useMemo(() => {
    if (!rawChartData || rawChartData.length === 0) return [];
    if (timeRange === '7d') {
      return rawChartData.slice(-7);
    }
    if (timeRange === '30d') {
      return rawChartData.slice(-30);
    }
    return rawChartData;
  }, [rawChartData, timeRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const isEst = dataPoint.isEstimated;
      const hasEst = dataPoint.hasEstimatedBlock;

      return (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="font-bold text-slate-200 text-sm">{dataPoint.formattedDate}</span>
            {isEst ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pro-Rata Estimated
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Direct Reading
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono">
            {blocks
              .filter((b) => selectedBlock === 'ALL' || selectedBlock === b.id)
              .map((b) => {
                const val = dataPoint[b.id] || 0;
                const isBlockEst = dataPoint[`${b.id}_isEstimated`];
                return (
                  <div key={b.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="text-slate-300">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white">{val} kWh</span>
                      {isBlockEst && <span className="text-[9px] text-amber-400 font-sans">(est)</span>}
                    </div>
                  </div>
                );
              })}

            <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between font-bold text-slate-100">
              <span className="font-sans">Total Daily:</span>
              <span className="text-amber-400 text-sm">
                {selectedBlock === 'ALL'
                  ? `${dataPoint.total} kWh`
                  : `${dataPoint[selectedBlock] || 0} kWh`}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800">
      {/* Chart Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Daily Solar Generation Trend</span>
            </h3>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Continuous Series
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tracking daily kWh output. Gaps between logged dates are automatically filled via pro-rata interpolation.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Block Selector */}
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => setSelectedBlock('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                selectedBlock === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Blocks
            </button>
            {blocks.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBlock(b.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  selectedBlock === b.id
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {b.id}
              </button>
            ))}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            {[
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: 'all', label: 'All Time' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  timeRange === t.id
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[320px] sm:h-[380px] w-full">
        {filteredData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No solar log entries recorded yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                {blocks.map((b) => (
                  <linearGradient key={b.id} id={`colorBlock_${b.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={b.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={b.color} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="formattedDate"
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
                tickFormatter={(val) => `${val}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
              />

              {selectedBlock === 'ALL' ? (
                blocks.map((b) => (
                  <Area
                    key={b.id}
                    type="monotone"
                    dataKey={b.id}
                    name={b.name}
                    stroke={b.color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#colorBlock_${b.id})`}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                ))
              ) : (
                <Area
                  type="monotone"
                  dataKey={selectedBlock}
                  name={blocks.find((b) => b.id === selectedBlock)?.name || selectedBlock}
                  stroke={blocks.find((b) => b.id === selectedBlock)?.color || '#f59e0b'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#colorBlock_${selectedBlock})`}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Solid Line: Direct Technician Entry
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Gradient Fill: Continuous Pro-Rata Interpolation
          </span>
        </div>
        <span className="text-slate-500">Unit: kWh (Units Generated)</span>
      </div>
    </div>
  );
}
