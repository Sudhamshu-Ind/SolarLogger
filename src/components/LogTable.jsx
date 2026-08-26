import React, { useState, useMemo } from 'react';
import { Table, Search, Filter, Download, CheckCircle2, Clock, CloudSun, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LogTable({ rawLogs, dailySeries, blocks, onExportCsv }) {
  const [viewMode, setViewMode] = useState('raw'); // 'raw' (manual entries) | 'continuous' (all days)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlockFilter, setSelectedBlockFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Flatten continuous or raw rows
  const tableRows = useMemo(() => {
    if (viewMode === 'raw') {
      return [...rawLogs]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((log, idx) => ({
          id: `raw-${idx}-${log.date}-${log.block}`,
          date: log.date,
          block: log.block,
          cumulativeUnits: Number(log.cumulativeUnits || 0),
          dailyUnits: log.dailyUnits !== null && log.dailyUnits !== undefined ? Number(log.dailyUnits) : '-',
          isManualEntry: log.isManualEntry !== false,
          weather: log.weather || 'Sunny',
          notes: log.notes || '',
          loggedBy: log.loggedBy || 'Staff',
        }));
    }

    // Continuous mode
    const rows = [];
    dailySeries.forEach((day) => {
      blocks.forEach((b) => {
        const bData = day.blockData[b.id];
        if (bData) {
          rows.push({
            id: `cont-${day.date}-${b.id}`,
            date: day.date,
            block: b.id,
            cumulativeUnits: Number(bData.cumulativeUnits || 0),
            dailyUnits: Number((bData.dailyUnits || 0).toFixed(1)),
            isManualEntry: !bData.isEstimated,
            weather: bData.weather || 'Sunny',
            notes: bData.notes || (bData.isEstimated ? 'Pro-rata interpolation' : ''),
            loggedBy: bData.isEstimated ? 'System (Pro-Rata)' : 'Staff',
          });
        }
      });
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [viewMode, rawLogs, dailySeries, blocks]);

  // Filter
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      const matchesBlock = selectedBlockFilter === 'ALL' || row.block === selectedBlockFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        row.date.toLowerCase().includes(q) ||
        row.block.toLowerCase().includes(q) ||
        (row.notes && row.notes.toLowerCase().includes(q)) ||
        (row.weather && row.weather.toLowerCase().includes(q)) ||
        (row.loggedBy && row.loggedBy.toLowerCase().includes(q));

      return matchesBlock && matchesSearch;
    });
  }, [tableRows, selectedBlockFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage]);

  const getBlockColor = (blockId) => {
    const b = blocks.find((item) => item.id === blockId);
    return b ? b.color : '#f59e0b';
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-amber-400" />
            <span>Generation Logs & Inverter Audit Trail</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Browse verified meter readings or inspect calculated pro-rata gap days.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => {
                setViewMode('raw');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'raw'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Direct Inverter Readings ({rawLogs.length})</span>
            </button>
            <button
              onClick={() => {
                setViewMode('continuous');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                viewMode === 'continuous'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>All Continuous Days</span>
            </button>
          </div>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Block Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search date, staff, notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl glass-input text-slate-200 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Filter Block:</span>
          <button
            onClick={() => {
              setSelectedBlockFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              selectedBlockFilter === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/80'
            }`}
          >
            All
          </button>
          {blocks.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setSelectedBlockFilter(b.id);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                selectedBlockFilter === b.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/80'
              }`}
            >
              Block {b.id}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Block</th>
              <th className="px-4 py-3">Inverter Meter (kWh)</th>
              <th className="px-4 py-3">Daily Units (kWh)</th>
              <th className="px-4 py-3">Status / Source</th>
              <th className="px-4 py-3">Weather</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Logged By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-sans">
                  No records match the current filter.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-semibold text-slate-200">{row.date}</td>
                  <td className="px-4 py-3 font-sans">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-semibold text-[11px]"
                      style={{
                        backgroundColor: `${getBlockColor(row.block)}15`,
                        color: getBlockColor(row.block),
                        border: `1px solid ${getBlockColor(row.block)}30`,
                      }}
                    >
                      Block {row.block}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-400">
                    {row.cumulativeUnits.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {typeof row.dailyUnits === 'number' ? `${row.dailyUnits.toLocaleString()} kWh` : row.dailyUnits}
                  </td>
                  <td className="px-4 py-3 font-sans">
                    {row.isManualEntry ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Direct Reading
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-2.5 h-2.5" /> Pro-Rata Gap
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-sans flex items-center gap-1">
                    <CloudSun className="w-3 h-3 text-slate-500" />
                    <span>{row.weather}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-sans max-w-xs truncate" title={row.notes}>
                    {row.notes || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-sans">{row.loggedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredRows.length)} of {filteredRows.length} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
