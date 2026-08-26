import React, { useState, useEffect, useMemo } from 'react';
import { X, Lock, Unlock, Sun, CloudRain, Cloud, CloudSun, CheckCircle2, AlertTriangle, ArrowRight, Zap, Calendar, Bluetooth } from 'lucide-react';
import { calculateEntryPreview } from '../services/proRataEngine';

export default function LogEntryModal({
  isOpen,
  onClose,
  onSubmitLog,
  blocks,
  rawLogs,
  initialBlockId = 'A',
  settings,
  onOpenBleScanner,
  initialBleReading = null,
  isAdmin = false,
}) {
  const [selectedBlockId, setSelectedBlockId] = useState(initialBlockId);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [cumulativeUnits, setCumulativeUnits] = useState('');
  const [dailyUnits, setDailyUnits] = useState('');
  const [weather, setWeather] = useState('Sunny');
  const [notes, setNotes] = useState('');
  const [loggedBy, setLoggedBy] = useState('Technician');
  
  // PIN/Password lock
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(isAdmin);
  const [pinError, setPinError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setIsUnlocked(true);
    }
  }, [isAdmin, isOpen]);

  useEffect(() => {
    if (initialBlockId) {
      setSelectedBlockId(initialBlockId);
    }
  }, [initialBlockId, isOpen]);

  // Apply BLE telemetry if provided
  useEffect(() => {
    if (initialBleReading && isOpen) {
      if (initialBleReading.blockId) {
        setSelectedBlockId(initialBleReading.blockId);
      }
      if (initialBleReading.cumulativeUnits !== undefined) {
        setCumulativeUnits(String(initialBleReading.cumulativeUnits));
      }
      if (initialBleReading.dailyUnits !== undefined) {
        setDailyUnits(String(initialBleReading.dailyUnits));
      }
      if (initialBleReading.notes) {
        setNotes(initialBleReading.notes);
      }
      if (initialBleReading.loggedBy) {
        setLoggedBy(initialBleReading.loggedBy);
      }
      // Unlock if PIN is default or unlocked by BLE
      setIsUnlocked(true);
    }
  }, [initialBleReading, isOpen]);

  // Find last recorded entry for the selected block
  const lastKnownEntry = useMemo(() => {
    const blockLogs = rawLogs
      .filter((l) => l.block === selectedBlockId)
      .map((l) => ({
        ...l,
        dateStr: typeof l.date === 'string' ? l.date.substring(0, 10) : l.date,
        cumulativeUnits: Number(l.cumulativeUnits || 0),
      }))
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr));

    if (blockLogs.length > 0) {
      return blockLogs[0];
    }

    const b = blocks.find((item) => item.id === selectedBlockId);
    return {
      dateStr: b ? b.inceptionDate : '2026-07-18',
      cumulativeUnits: b ? Number(b.initialMeterReading || 0) : 0,
    };
  }, [rawLogs, selectedBlockId, blocks]);

  // Real-time gap preview calculation
  const preview = useMemo(() => {
    return calculateEntryPreview({
      blockId: selectedBlockId,
      entryDateStr: entryDate,
      newCumulative: cumulativeUnits,
      newDaily: dailyUnits,
      lastKnownEntry,
    });
  }, [selectedBlockId, entryDate, cumulativeUnits, dailyUnits, lastKnownEntry]);

  if (!isOpen) return null;

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const expectedPassword = settings.adminPin || 'SolarAthens';
    if (pin === expectedPassword) {
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Incorrect admin password. Access denied.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!cumulativeUnits && !dailyUnits) {
      setSubmitError('Please enter at least the cumulative meter reading (or daily generation).');
      return;
    }

    if (cumulativeUnits && Number(cumulativeUnits) < Number(lastKnownEntry.cumulativeUnits || 0)) {
      setSubmitError(`New cumulative reading cannot be less than the previous reading (${lastKnownEntry.cumulativeUnits} kWh).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitLog({
        date: entryDate,
        block: selectedBlockId,
        cumulativeUnits: Number(cumulativeUnits) || Number(lastKnownEntry.cumulativeUnits || 0) + Number(dailyUnits || 0),
        dailyUnits: dailyUnits ? Number(dailyUnits) : null,
        isManualEntry: true,
        weather,
        notes,
        loggedBy: loggedBy.trim() || 'Staff',
      });

      // Reset form
      setCumulativeUnits('');
      setDailyUnits('');
      setNotes('');
      onClose();
    } catch (err) {
      setSubmitError('Failed to record log: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700 shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Log Inverter Reading</h2>
            <p className="text-xs text-slate-400">
              Casagrand Athens • Rooftop Solar Substation
            </p>
          </div>
        </div>

        {/* Security PIN Screen (if not unlocked) */}
        {!isUnlocked ? (
          <form onSubmit={handlePinSubmit} className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Admin Authentication Required</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter community admin password to record inverter meter readings.
                </p>
              </div>

              <div className="max-w-[260px] mx-auto">
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter admin password..."
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setPinError('');
                  }}
                  className="w-full text-center text-sm font-mono px-4 py-2.5 rounded-xl glass-input text-white font-bold"
                />
              </div>

              {pinError && <p className="text-xs font-semibold text-rose-400">{pinError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock & Proceed</span>
              </button>
            </div>
          </form>
        ) : (
          /* Actual Data Entry Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Block & Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Substation Block *
                </label>
                <select
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-white font-semibold bg-slate-900"
                >
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                      {b.name} ({b.capacityKwp} kWp)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reading Date *
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-white font-mono bg-slate-900"
                  required
                />
              </div>
            </div>

            {/* Last Recorded Context Banner */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400">
                  Last recorded reading on <strong className="text-slate-200">{lastKnownEntry.dateStr}</strong>:
                </span>
              </div>
              <span className="font-mono font-bold text-amber-400">
                {lastKnownEntry.cumulativeUnits.toLocaleString()} kWh
              </span>
            </div>

            {/* Inverter Readings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Inverter Meter Readings</span>
                <button
                  type="button"
                  onClick={() => onOpenBleScanner && onOpenBleScanner(selectedBlockId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition shadow-sm shadow-cyan-500/10 active:scale-95"
                >
                  <Bluetooth className="w-3.5 h-3.5 animate-pulse" />
                  <span>⚡ Auto-Read via BLE</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Cumulative Meter Reading (kWh) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder={`e.g. ${Number(lastKnownEntry.cumulativeUnits) + 180}`}
                    value={cumulativeUnits}
                    onChange={(e) => setCumulativeUnits(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-white font-mono font-bold"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Total lifetime units shown on inverter display.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Daily Units (kWh) <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 175"
                    value={dailyUnits}
                    onChange={(e) => setDailyUnits(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Leave blank to let system auto-calculate.
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Pro-Rata Gap Preview Alert */}
            {preview && preview.isGap && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>{preview.daysDiff}-Day Gap Detected</span>
                </div>
                <p className="text-slate-300">
                  Total generation of <strong className="text-amber-300 font-mono">{preview.deltaUnits} kWh</strong> will be smoothly pro-rated across {preview.daysDiff} missing days (<strong className="text-amber-300 font-mono">~{preview.avgDailyUnits} kWh/day</strong>).
                </p>
              </div>
            )}

            {/* Weather & Technician Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Weather Condition
                </label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input text-white bg-slate-900"
                >
                  <option value="Sunny">☀️ Sunny / Clear Sky</option>
                  <option value="Partly Cloudy">⛅ Partly Cloudy</option>
                  <option value="Overcast">☁️ Overcast</option>
                  <option value="Rainy">🌧️ Monsoon / Rainy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Logged By (Staff ID / Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maintenance Staff"
                  value={loggedBy}
                  onChange={(e) => setLoggedBy(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input text-white"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Notes / Inverter Alerts <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Routine cleaning completed, grid outage for 1 hr"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl glass-input text-white"
              />
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {submitError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-glow-amber hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Saving...' : 'Save Inverter Reading'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
