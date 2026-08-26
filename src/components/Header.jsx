import React from 'react';
import { Sun, Plus, Settings, Sheet, Download, RefreshCw, CheckCircle2, AlertCircle, Bluetooth, Lock, Unlock, LogOut, Shield } from 'lucide-react';

export default function Header({
  isLiveSync,
  isAdmin,
  onOpenAdminAuth,
  onLogoutAdmin,
  onOpenLogModal,
  onOpenBleScanner,
  onOpenSettings,
  onOpenSetupGuide,
  onRefreshData,
  onExportCsv,
  isLoading,
}) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-30 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-glow-amber text-slate-950 font-bold">
              <Sun className="w-7 h-7 text-slate-950 animate-[spin_16s_linear_infinite]" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-solar-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Casagrand Athens
                </span>
                {isLiveSync ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Live Sheet Sync
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Local / Preview Mode
                  </span>
                )}
                {isAdmin ? (
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Shield className="w-3 h-3 text-amber-400" /> Admin Mode
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
                    <Lock className="w-3 h-3 text-slate-500" /> Community View
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Solar Log <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Monitor</span>
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onRefreshData}
              disabled={isLoading}
              title="Refresh Data"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={onOpenBleScanner}
              title="Inverter Bluetooth (BLE) Extraction"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition shadow-sm active:scale-95"
            >
              <Bluetooth className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Inverter BLE</span>
              <span className="sm:hidden">BLE</span>
            </button>

            <button
              onClick={onExportCsv}
              title="Export Logs as CSV"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:text-white transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onOpenSetupGuide}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition shadow-sm"
            >
              <Sheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Sheet Setup</span>
              <span className="sm:hidden">Sheet</span>
            </button>

            <button
              onClick={onOpenSettings}
              title="Settings & Tariffs (Admin Protected)"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition active:scale-95"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Admin Lock / Unlock Status Button */}
            {isAdmin ? (
              <button
                onClick={onLogoutAdmin}
                title="Logout Admin Mode (Lock to Community View)"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminAuth}
                title="Login with Admin Password (SolarAthens)"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:text-white transition active:scale-95"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline">Admin Login</span>
              </button>
            )}

            {/* Primary Log Action */}
            <button
              onClick={onOpenLogModal}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-glow-amber hover:shadow-amber-500/40 hover:brightness-110 active:scale-95 transition-all duration-200"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Log Reading</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
