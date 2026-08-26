import React, { useState, useEffect } from 'react';
import { X, Settings, Link, IndianRupee, Shield, Plus, Trash2, CheckCircle2, RotateCcw, AlertTriangle, Cpu } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  blocks,
  onSaveSettings,
  onSaveBlocks,
  onResetData,
  onZeroiseData,
  onForceSync,
}) {
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [localBlocks, setLocalBlocks] = useState([...blocks]);
  const [testStatus, setTestStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'blocks' | 'reset'
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings({ ...settings });
      setLocalBlocks([...blocks]);
    }
  }, [isOpen, settings, blocks]);

  if (!isOpen) return null;

  const handleTestUrl = async () => {
    if (!localSettings.gasWebAppUrl || !localSettings.gasWebAppUrl.startsWith('http')) {
      setTestStatus({ success: false, message: 'Please enter a valid https:// script.google.com URL' });
      return;
    }
    setIsTestingUrl(true);
    setTestStatus(null);
    try {
      const res = await fetch(`${localSettings.gasWebAppUrl}?action=getData`);
      const data = await res.json();
      if (data.success) {
        setTestStatus({
          success: true,
          message: `Connected successfully! Found ${data.logs ? data.logs.length : 0} logs and ${data.blocks ? data.blocks.length : 0} blocks.`,
        });
      } else {
        setTestStatus({ success: false, message: data.error || 'Server responded with error' });
      }
    } catch (err) {
      setTestStatus({ success: false, message: 'Connection failed: ' + err.message });
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleAddBlock = () => {
    const nextLetter = String.fromCharCode(65 + localBlocks.length); // Next alphabet
    const colors = ['#f59e0b', '#0284c7', '#10b981', '#a855f7', '#ec4899', '#f97316'];
    const assignedColor = colors[localBlocks.length % colors.length];

    const newBlock = {
      id: nextLetter,
      name: `Block ${nextLetter} (Rooftop Plant)`,
      capacityKwp: 40,
      inceptionDate: '2026-07-18',
      initialMeterReading: 0,
      color: assignedColor,
      inverterModel: 'Growatt 40KTL3-X',
      status: 'Active',
    };
    setLocalBlocks([...localBlocks, newBlock]);
  };

  const handleRemoveBlock = (blockId) => {
    if (localBlocks.length <= 1) {
      alert('Must keep at least 1 active block.');
      return;
    }
    setLocalBlocks(localBlocks.filter((b) => b.id !== blockId));
  };

  const handleBlockChange = (blockId, field, value) => {
    setLocalBlocks(
      localBlocks.map((b) => {
        if (b.id === blockId) {
          return { ...b, [field]: field === 'capacityKwp' || field === 'initialMeterReading' ? Number(value) : value };
        }
        return b;
      })
    );
  };

  const handleSaveAll = () => {
    onSaveSettings(localSettings);
    onSaveBlocks(localBlocks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">System Settings & Configuration</h2>
            <p className="text-xs text-slate-400">
              Casagrand Athens Solar Monitor Parameters
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'general'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            General & Tariffs
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'blocks'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Substation Blocks ({localBlocks.length})
          </button>
          <button
            onClick={() => setActiveTab('reset')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'reset'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            Data Reset
          </button>
        </div>

        {/* Tab 1: General & Tariffs */}
        {activeTab === 'general' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Google Apps Script Web App URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={localSettings.gasWebAppUrl || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, gasWebAppUrl: e.target.value })}
                  className="flex-1 px-3.5 py-2 rounded-xl glass-input text-white font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTestUrl}
                    disabled={isTestingUrl}
                    className="px-3.5 py-2 font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    {isTestingUrl ? 'Testing...' : 'Test Sync'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (onForceSync) {
                        setIsTestingUrl(true);
                        const res = await onForceSync(localSettings.gasWebAppUrl);
                        setIsTestingUrl(false);
                        setTestStatus(res);
                      }
                    }}
                    disabled={isTestingUrl}
                    className="px-3.5 py-2 font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition"
                  >
                    Push All to Sheet
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Connects directly to your Google Sheet. Click <strong>"Push All to Sheet"</strong> to upload all local logs &amp; update BlockMetadata in your Google Sheet immediately.
              </span>
              {testStatus && (
                <div
                  className={`mt-2 p-2.5 rounded-xl text-xs font-semibold ${
                    testStatus.success
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {testStatus.message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Grid Electricity Tariff (₹ / kWh)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={localSettings.gridTariffPerKwh}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, gridTariffPerKwh: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-white font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used for financial savings calculation.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Admin Login Password (Security Lock)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SolarAthens"
                  value={localSettings.adminPin || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, adminPin: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-white font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Password required to access Settings & submit solar logs.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  CO₂ Factor (kg / kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={localSettings.co2FactorKgPerKwh}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, co2FactorKgPerKwh: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Trees Factor (Trees / kWh)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={localSettings.treesFactorPerKwh}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, treesFactorPerKwh: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Blocks Configuration */}
        {activeTab === 'blocks' && (
          <div className="space-y-3 text-xs max-h-[360px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">
                Configure rooftop substations. You can dynamically add new blocks anytime.
              </span>
              <button
                type="button"
                onClick={handleAddBlock}
                className="flex items-center gap-1 px-3 py-1.5 font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Block</span>
              </button>
            </div>

            {localBlocks.map((block) => (
              <div
                key={block.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={block.color}
                      onChange={(e) => handleBlockChange(block.id, 'color', e.target.value)}
                      className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={block.name}
                      onChange={(e) => handleBlockChange(block.id, 'name', e.target.value)}
                      className="px-2.5 py-1 rounded-lg glass-input text-white font-bold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(block.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Remove Block"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Capacity (kWp)</label>
                    <input
                      type="number"
                      value={block.capacityKwp}
                      onChange={(e) => handleBlockChange(block.id, 'capacityKwp', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg glass-input text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Inception Date</label>
                    <input
                      type="date"
                      value={block.inceptionDate}
                      onChange={(e) => handleBlockChange(block.id, 'inceptionDate', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg glass-input text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Initial Meter (kWh)</label>
                    <input
                      type="number"
                      value={block.initialMeterReading || 0}
                      onChange={(e) => handleBlockChange(block.id, 'initialMeterReading', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg glass-input text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Inverter Model</label>
                    <input
                      type="text"
                      value={block.inverterModel || ''}
                      onChange={(e) => handleBlockChange(block.id, 'inverterModel', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg glass-input text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Data Reset */}
        {activeTab === 'reset' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <RotateCcw className="w-4 h-4" />
                <span>Zeroise &amp; Start Fresh Live Readings</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Clears all historical mock logs and sets baseline meters to <strong>0 kWh</strong> for Block A (8 kWp), Block B (20 kWp), and Block F (31 kWp) so you can enter live daily readings.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to zeroise all logs and start fresh with 0 kWh baseline?')) {
                    if (onZeroiseData) onZeroiseData();
                    else onResetData();
                    onClose();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md transition active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Zeroise All Data (Ready for Live Entries)</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-glow-amber transition"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
}
