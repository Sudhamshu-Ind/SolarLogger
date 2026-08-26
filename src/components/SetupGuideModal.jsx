import React, { useState } from 'react';
import {
  X,
  Sheet,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Sparkles,
  CheckCircle2,
  Bluetooth,
  Radio,
  Smartphone,
  Cpu,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { GAS_SCRIPT_CODE } from '../services/gasScriptCode';

export default function SetupGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('ble'); // 'ble' | 'sheets'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-slate-700 shadow-2xl p-6 relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            {activeTab === 'ble' ? <Bluetooth className="w-5 h-5" /> : <Sheet className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">System Guides &amp; Substation Setup</h2>
            <p className="text-xs text-slate-400">
              Configure Bluetooth Inverter sync and Google Sheets cloud integration
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-4 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('ble')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
              activeTab === 'ble'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>Inverter BLE Bluetooth Guide</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
              activeTab === 'sheets'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sheet className="w-3.5 h-3.5" />
            <span>Google Sheets Cloud Setup</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 text-xs pr-1 flex-1">
          {activeTab === 'ble' && (
            <div className="space-y-4">
              {/* How it works overview */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span>How Direct Inverter BLE Reading Works</span>
                </h3>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Deye and Solarman Wi-Fi/BLE logger sticks broadcast a local Bluetooth Low Energy service. Using the modern <strong>Web Bluetooth API</strong>, CGSolarLog communicates directly with the logger stick via <strong>Modbus RTU over GATT</strong> to extract lifetime cumulative kWh and daily yields in seconds.
                </p>
              </div>

              {/* 3 Step Quick Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <span className="font-bold text-white">Stand Near Inverter</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Go to the rooftop substation (Block A, B, or F). Stand within <strong>10–15 meters</strong> line of sight of the inverter logger stick.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <span className="font-bold text-white">Close Phone App</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Ensure the official Deye/Solarman smartphone app is <strong>closed or disconnected</strong>, as the BLE stick only allows 1 active client connection.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <span className="font-bold text-white">Tap "Inverter BLE"</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Click <strong>Inverter BLE</strong> in the header or in the Log Modal. Select your device from the browser prompt to instantly sync!
                  </p>
                </div>
              </div>

              {/* Supported Platforms & Browser Compatibility */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Browser &amp; Operating System Support</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <span className="font-bold block">✅ Android Phones &amp; Tablets</span>
                    <span className="text-slate-400">Google Chrome, Microsoft Edge, Samsung Internet.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <span className="font-bold block">✅ Windows &amp; Mac Laptops</span>
                    <span className="text-slate-400">Google Chrome, Microsoft Edge, Opera.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 col-span-1 sm:col-span-2">
                    <span className="font-bold block">📱 Apple iOS (iPhone &amp; iPad)</span>
                    <span className="text-slate-400">
                      Safari does not support Web Bluetooth. iOS users can open CGSolarLog inside the free <a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-bold">Bluefy Web BLE Browser</a> on App Store.
                    </span>
                  </div>
                </div>
              </div>

              {/* Modbus Register Mapping Info */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Inverter Modbus Register Mapping</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-slate-500 block">Daily Yield</span>
                    <span className="text-cyan-400 font-bold">Reg 0x003C (60)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-slate-500 block">Total Lifetime</span>
                    <span className="text-amber-400 font-bold">Reg 0x003F-40</span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-slate-500 block">Active AC Power</span>
                    <span className="text-emerald-400 font-bold">Reg 0x0056-57</span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-slate-500 block">Inverter Temp</span>
                    <span className="text-rose-400 font-bold">Reg 0x005A (90)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sheets' && (
            <div className="space-y-4">
              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <span className="font-bold text-white">Create Google Sheet</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-amber-400 underline">sheets.new</a> in your browser and name it <strong>"Casagrand Athens Solar Log"</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <span className="font-bold text-white">Open Apps Script</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    In top menu, click <strong>Extensions &gt; Apps Script</strong>. Replace the empty function with the script below.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <span className="font-bold text-white">Deploy as Web App</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Click <strong>Deploy &gt; New deployment</strong>. Select <em>Web app</em>, set access to <em>Anyone</em>, and copy the Web App URL!
                  </p>
                </div>
              </div>

              {/* Code Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-amber-400" />
                    Google Apps Script Backend Code (Code.gs)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Script Code'}</span>
                  </button>
                </div>

                <div className="relative rounded-xl bg-slate-900 border border-slate-800 p-3 max-h-56 overflow-y-auto font-mono text-[11px] text-slate-300">
                  <pre>{GAS_SCRIPT_CODE}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Got It, Close
          </button>
        </div>
      </div>
    </div>
  );
}
