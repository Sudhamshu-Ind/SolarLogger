import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import LoggingHealthBadge from './components/LoggingHealthBadge';
import DailyTrendChart from './components/Charts/DailyTrendChart';
import MonthlyComparisonChart from './components/Charts/MonthlyComparisonChart';
import BlockDistributionChart from './components/Charts/BlockDistributionChart';
import LogTable from './components/LogTable';
import LogEntryModal from './components/LogEntryModal';
import BleInverterScannerModal from './components/BleInverterScannerModal';
import SettingsModal from './components/SettingsModal';
import SetupGuideModal from './components/SetupGuideModal';
import AdminAuthModal from './components/AdminAuthModal';

import {
  fetchSolarData,
  submitDailyLog,
  getStoredSettings,
  saveStoredSettings,
  saveBlocksConfig,
  resetToSampleData,
} from './services/api';
import { buildContinuousSolarSeries } from './services/proRataEngine';
import { calculateSummaryMetrics } from './services/analytics';
import { Sun, ShieldCheck, Sparkles, Building2, MapPin } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState(() => getStoredSettings());
  const [blocks, setBlocks] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [isLiveSync, setIsLiveSync] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Admin authentication state (persisted per browser session)
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return sessionStorage.getItem('cg_solar_is_admin') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState(null);
  const [authModalConfig, setAuthModalConfig] = useState({
    title: 'Admin Authentication Required',
    description: 'Enter the community admin password to modify configuration or record solar logs.',
  });

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isBleModalOpen, setIsBleModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [selectedBlockForLog, setSelectedBlockForLog] = useState('A');
  const [selectedBlockForBle, setSelectedBlockForBle] = useState('A');
  const [pendingBleReading, setPendingBleReading] = useState(null);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSolarData(settings.gasWebAppUrl);
      setRawLogs(data.logs || []);
      setBlocks(data.blocks || []);
      setIsLiveSync(data.isLiveSync);
    } catch (err) {
      console.error('Failed to load solar data', err);
    } finally {
      setIsLoading(false);
    }
  }, [settings.gasWebAppUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute Pro-Rata continuous day-by-day series
  const { dailySeries, blockLatestStatus } = useMemo(() => {
    return buildContinuousSolarSeries(rawLogs, blocks);
  }, [rawLogs, blocks]);

  // Compute analytics & financial metrics
  const metrics = useMemo(() => {
    return calculateSummaryMetrics(dailySeries, rawLogs, blocks, settings);
  }, [dailySeries, rawLogs, blocks, settings]);

  // Handle new log submission
  const handleSubmitLog = async (entry) => {
    const res = await submitDailyLog(entry, settings.gasWebAppUrl);
    if (res.success) {
      setRawLogs(res.logs);
      if (res.remoteSyncSuccess) {
        setIsLiveSync(true);
      }
    }
  };

  // Handle settings update
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  // Handle blocks update
  const handleSaveBlocks = (newBlocks) => {
    setBlocks(newBlocks);
    saveBlocksConfig(newBlocks);
  };

  // Handle data reset
  const handleResetData = () => {
    const res = resetToSampleData();
    setRawLogs(res.logs);
    setBlocks(res.blocks);
    setSettings(res.settings);
    setIsLiveSync(false);
  };

  // Admin authentication handlers
  const handleProtectedAction = (actionCallback, title = 'Admin Authentication Required', description = 'Enter admin password (SolarAthens) to proceed.') => {
    if (isAdmin) {
      actionCallback();
    } else {
      setAuthModalConfig({ title, description });
      setPendingAdminAction(() => actionCallback);
      setIsAdminAuthModalOpen(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    try {
      sessionStorage.setItem('cg_solar_is_admin', 'true');
    } catch {}
    setIsAdminAuthModalOpen(false);

    if (pendingAdminAction) {
      pendingAdminAction();
      setPendingAdminAction(null);
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      sessionStorage.removeItem('cg_solar_is_admin');
    } catch {}
  };

  // Quick log trigger from block badge
  const handleLogBlock = (blockId) => {
    handleProtectedAction(
      () => {
        setSelectedBlockForLog(blockId);
        setPendingBleReading(null);
        setIsLogModalOpen(true);
      },
      `Log Substation ${blockId} Meter`,
      `Enter admin password to record new meter readings for Substation Block ${blockId}.`
    );
  };

  // Open BLE scanner for a specific block
  const handleOpenBleScanner = (blockId = 'A') => {
    handleProtectedAction(
      () => {
        setSelectedBlockForBle(blockId);
        setIsBleModalOpen(true);
      },
      'Inverter Bluetooth Extraction',
      'Enter admin password to connect to rooftop inverters and sync telemetry via BLE.'
    );
  };

  // Open Settings Modal
  const handleOpenSettings = () => {
    handleProtectedAction(
      () => setIsSettingsOpen(true),
      'System Settings & Parameters',
      'Enter admin password to modify tariffs, Google Sheet URL, or substation blocks.'
    );
  };

  // Open Primary Log Modal
  const handleOpenLogModal = () => {
    handleProtectedAction(
      () => {
        setSelectedBlockForLog('A');
        setPendingBleReading(null);
        setIsLogModalOpen(true);
      },
      'Log Inverter Meter Reading',
      'Enter admin password to submit new solar generation records.'
    );
  };

  // Apply reading extracted from BLE into LogEntryModal
  const handleApplyBleReading = (readingData) => {
    setSelectedBlockForLog(readingData.blockId || selectedBlockForBle);
    setPendingBleReading(readingData);
    setIsLogModalOpen(true);
  };

  // CSV Export (Freely accessible to all residents)
  const handleExportCsv = () => {
    if (!dailySeries || dailySeries.length === 0) return;

    const headers = ['Date', 'Block', 'CumulativeUnits_kWh', 'DailyUnits_kWh', 'EntryType', 'Weather', 'Notes', 'LoggedBy'];
    const rows = [];

    dailySeries.forEach((day) => {
      blocks.forEach((b) => {
        const bData = day.blockData[b.id];
        if (bData) {
          rows.push([
            day.date,
            b.id,
            bData.cumulativeUnits,
            bData.dailyUnits,
            bData.isEstimated ? 'Pro-Rata Estimated' : 'Direct Inverter Reading',
            `"${bData.weather || 'Sunny'}"`,
            `"${bData.notes || ''}"`,
            bData.isEstimated ? 'System' : 'Staff',
          ]);
        }
      });
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Casagrand_Athens_Solar_Log_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <Header
        isLiveSync={isLiveSync}
        isLoading={isLoading}
        isAdmin={isAdmin}
        onOpenAdminAuth={() =>
          handleProtectedAction(
            () => {},
            'Admin Authentication',
            'Enter the community admin password (SolarAthens) to unlock configuration and logging capabilities.'
          )
        }
        onLogoutAdmin={handleAdminLogout}
        onOpenLogModal={handleOpenLogModal}
        onOpenBleScanner={() => handleOpenBleScanner('A')}
        onOpenSettings={handleOpenSettings}
        onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
        onRefreshData={loadData}
        onExportCsv={handleExportCsv}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Community Banner & Overview */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" /> Casagrand Athens Gated Community
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> Chennai
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Rooftop Solar Generation & Inverter Log
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
                Active Substations: <strong className="text-slate-200">Blocks {blocks.map((b) => b.id).join(', ')}</strong> • Commissioned on <strong className="text-amber-400">18-Jul-2026</strong> • Total Installed Peak Capacity: <strong className="text-slate-200">{metrics.totalCapacityKwp} kWp</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Inverter BLE Tracking Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Executive Metric Cards */}
        <MetricCards metrics={metrics} settings={settings} inceptionDate="2026-07-18" />

        {/* Substation Logging Health Status */}
        <LoggingHealthBadge
          blocks={blocks}
          blockLatestStatus={blockLatestStatus}
          onLogBlock={handleLogBlock}
          onBleScanBlock={handleOpenBleScanner}
        />

        {/* Primary Trend Chart */}
        <DailyTrendChart dailySeries={dailySeries} blocks={blocks} />

        {/* Secondary Charts: Monthly Comparison & Block Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyComparisonChart dailySeries={dailySeries} blocks={blocks} />
          <BlockDistributionChart metrics={metrics} blocks={blocks} />
        </div>

        {/* Inverter Audit Log & Historical Records Table */}
        <LogTable
          rawLogs={rawLogs}
          dailySeries={dailySeries}
          blocks={blocks}
          onExportCsv={handleExportCsv}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Casagrand Athens Solar Energy Management • Commissioned 18-Jul-2026
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Sun className="w-3.5 h-3.5 text-amber-400" /> Powered by Clean Solar Power
          </span>
        </div>
      </footer>

      {/* Modals */}
      <LogEntryModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setPendingBleReading(null);
        }}
        onSubmitLog={handleSubmitLog}
        blocks={blocks}
        rawLogs={rawLogs}
        initialBlockId={selectedBlockForLog}
        settings={settings}
        isAdmin={isAdmin}
        onOpenBleScanner={(blockId) => {
          setIsLogModalOpen(false);
          handleOpenBleScanner(blockId);
        }}
        initialBleReading={pendingBleReading}
      />

      <BleInverterScannerModal
        isOpen={isBleModalOpen}
        onClose={() => setIsBleModalOpen(false)}
        blocks={blocks}
        rawLogs={rawLogs}
        initialBlockId={selectedBlockForBle}
        onApplyReading={handleApplyBleReading}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        blocks={blocks}
        onSaveSettings={handleSaveSettings}
        onSaveBlocks={handleSaveBlocks}
        onResetData={handleResetData}
      />

      <SetupGuideModal
        isOpen={isSetupGuideOpen}
        onClose={() => setIsSetupGuideOpen(false)}
      />

      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => {
          setIsAdminAuthModalOpen(false);
          setPendingAdminAction(null);
        }}
        onSuccess={handleAdminLoginSuccess}
        adminPassword={settings.adminPin || 'SolarAthens'}
        actionTitle={authModalConfig.title}
        actionDescription={authModalConfig.description}
      />
    </div>
  );
}
