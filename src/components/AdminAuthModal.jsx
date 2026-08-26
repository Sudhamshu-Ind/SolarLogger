import React, { useState } from 'react';
import { X, Lock, Unlock, ShieldAlert, KeyRound, ArrowRight } from 'lucide-react';

export default function AdminAuthModal({
  isOpen,
  onClose,
  onSuccess,
  adminPassword = 'SolarAthens',
  actionTitle = 'Admin Authentication Required',
  actionDescription = 'Enter the community admin password to modify configuration or record solar logs.',
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === adminPassword) {
      setError('');
      setPassword('');
      onSuccess();
    } else {
      setError('Incorrect admin password. Access denied.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{actionTitle}</h2>
            <p className="text-xs text-slate-400">Casagrand Athens • Protected Configuration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              {actionDescription}
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter admin password..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white font-mono text-sm"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-glow-amber hover:brightness-110 active:scale-95 transition"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Authenticate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
