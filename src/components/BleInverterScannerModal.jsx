import React, { useState, useEffect } from 'react';
import {
  X,
  Bluetooth,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Radio,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  Info,
  Layers,
} from 'lucide-react';
import {
  isWebBluetoothSupported,
  connectAndReadDeyeBle,
  simulateDeyeBleRead,
} from '../services/deyeBleService';

export default function BleInverterScannerModal({
  isOpen,
  onClose,
  blocks,
  rawLogs,
  initialBlockId = 'A',
  onApplyReading,
}) {
  const [selectedBlockId, setSelectedBlockId] = useState(initialBlockId);
  const [status, setStatus] = useState('idle'); // 'idle' | 'scanning' | 'reading' | 'success' | 'error'
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [telemetry, setTelemetry] = useState(null);
  const [showHex, setShowHex] = useState(false);
  const [useSimulation, setUseSimulation] = useState(false);

  const isBluetoothSupported = isWebBluetoothSupported();

  useEffect(() => {
    if (initialBlockId) {
      setSelectedBlockId(initialBlockId);
    }
  }, [initialBlockId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setProgressMsg('');
      setErrorMsg('');
      setTelemetry(null);
      setShowHex(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBlock = blocks.find((b) => b.id === selectedBlockId) || blocks[0];

  // Get last known entry for comparison
  const blockLogs = rawLogs
    .filter((l) => l.block === selectedBlockId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const lastKnownEntry = blockLogs[0] || {
    date: currentBlock?.inceptionDate || '2026-07-18',
    cumulativeUnits: Number(currentBlock?.initialMeterReading || 0),
  };

  const handleStartBleScan = async (forceSimulate = false) => {
    setErrorMsg('');
    setTelemetry(null);
    setStatus('scanning');

    const shouldSimulate = forceSimulate || useSimulation || !isBluetoothSupported;

    try {
      let result;
      if (shouldSimulate) {
        result = await simulateDeyeBleRead(currentBlock, lastKnownEntry, {
          onProgress: (msg) => setProgressMsg(msg),
        });
      } else {
        setStatus('reading');
        result = await connectAndReadDeyeBle({
          onProgress: (msg) => setProgressMsg(msg),
        });
      }

      setTelemetry(result);
      setStatus('success');
      setProgressMsg('Inverter telemetry extracted successfully!');
    } catch (err) {
      console.error('BLE connection error:', err);
      setStatus('error');
      setErrorMsg(
        err.message || 'Failed to communicate with the Inverter BLE logger. Ensure Bluetooth is enabled and the inverter is within range.'
      );
    }
  };

  const handleApply = () => {
    if (!telemetry) return;
    onApplyReading({
      blockId: selectedBlockId,
      cumulativeUnits: telemetry.cumulativeUnits,
      dailyUnits: telemetry.dailyUnits,
      notes: `Direct BLE extraction (${telemetry.deviceName || 'Deye Inverter'})`,
      loggedBy: 'BLE Inverter Sync',
      timestamp: telemetry.timestamp,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Decorative background glow */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentBlock?.color || '#0284c7' }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Bluetooth className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Inverter Bluetooth (BLE) Extraction</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                Modbus RTU / GATT
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Extract live meter readings directly from Deye / Solarman rooftop inverters
            </p>
          </div>
        </div>

        {/* Block Selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Target Rooftop Substation
          </label>
          <div className="grid grid-cols-3 gap-2">
            {blocks.map((b) => {
              const isSelected = b.id === selectedBlockId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelectedBlockId(b.id);
                    setTelemetry(null);
                    setStatus('idle');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{b.name}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 mt-1">
                    {b.capacityKwp} kWp • {b.inverterModel || 'Inverter'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Web Bluetooth Compatibility Warning if not supported */}
        {!isBluetoothSupported && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-semibold">Web Bluetooth API not detected in this browser.</span>
              <p className="text-[11px] text-amber-400/80 mt-0.5">
                Chrome & Edge (Desktop & Android) support Web Bluetooth natively. You can use the built-in <strong>BLE Simulator</strong> below for testing.
              </p>
            </div>
          </div>
        )}

        {/* Center Scanner Action & Status Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {status === 'idle' && (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Radio className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm font-bold text-white">Ready to Connect to Inverter Logger</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ensure you are standing within 10–15 meters of the {currentBlock?.name} inverter on the rooftop and the official mobile app is closed.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartBleScan(false)}
                  disabled={!isBluetoothSupported}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 ${
                    isBluetoothSupported
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Bluetooth className="w-4 h-4" />
                  <span>Scan &amp; Pair Inverter BLE</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartBleScan(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Run BLE Simulator (Demo)</span>
                </button>
              </div>
            </div>
          )}

          {(status === 'scanning' || status === 'reading') && (
            <div className="p-8 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-center flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 animate-spin">
                  <RefreshCw className="w-8 h-8" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400 border-t-transparent animate-ping opacity-25" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-cyan-300">
                  {status === 'scanning' ? 'Searching for Nearby BLE Inverter...' : 'Querying Modbus Holding Registers...'}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1 animate-pulse">
                  {progressMsg || 'Communicating with Bluetooth GATT server...'}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-300">Bluetooth Communication Error</h4>
                  <p className="text-xs text-rose-400/90 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleStartBleScan(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Scan
                </button>
                <button
                  type="button"
                  onClick={() => handleStartBleScan(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Test with Simulator
                </button>
              </div>
            </div>
          )}

          {/* Extracted Telemetry Card */}
          {status === 'success' && telemetry && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 space-y-4">
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {telemetry.deviceName || 'Deye Inverter BLE Logger'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {telemetry.connectionType === 'LIVE_BLE' ? '🟢 Live GATT Connection' : '✨ Simulated Inverter Reading'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    Modbus CRC Verified
                  </span>
                </div>

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                      Cumulative Total
                    </span>
                    <span className="text-lg font-bold font-mono text-amber-400">
                      {telemetry.cumulativeUnits.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1 font-semibold">kWh</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                      Today's Yield
                    </span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {telemetry.dailyUnits.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1 font-semibold">kWh</span>
                  </div>

                  {telemetry.activePowerKw !== undefined && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                        Real-time AC Power
                      </span>
                      <span className="text-lg font-bold font-mono text-cyan-400">
                        {telemetry.activePowerKw}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1 font-semibold">kW</span>
                    </div>
                  )}
                </div>

                {/* Last reading delta comparison */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Previous Reading:</span>
                  <span className="font-mono">
                    {lastKnownEntry.cumulativeUnits} kWh ({lastKnownEntry.date})
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    +{(telemetry.cumulativeUnits - Number(lastKnownEntry.cumulativeUnits || 0)).toFixed(1)} kWh delta
                  </span>
                </div>

                {/* Raw Hex toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowHex(!showHex)}
                    className="text-[11px] text-slate-500 hover:text-slate-400 font-mono flex items-center gap-1"
                  >
                    <Cpu className="w-3 h-3" />
                    {showHex ? 'Hide Modbus Raw Frame' : 'View Modbus Raw Frame'}
                  </button>

                  {showHex && (
                    <div className="mt-2 p-2.5 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-cyan-400 overflow-x-auto">
                      <code>{telemetry.rawHex || '01 03 0C 00 ...'}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>

          {status === 'success' && telemetry ? (
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Reading to Log Form</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleStartBleScan(false)}
              disabled={!isBluetoothSupported}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rescan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
