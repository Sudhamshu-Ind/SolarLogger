import { SAMPLE_LOG_ENTRIES } from '../mock/sampleData';
import { INITIAL_BLOCKS, DEFAULT_SETTINGS } from '../config/defaultSettings';

const STORAGE_KEYS = {
  LOGS: 'cg_solar_logs_v2',
  BLOCKS: 'cg_solar_blocks_v2',
  SETTINGS: 'cg_solar_settings_v2',
};

// Automatic cleanup of legacy v1 localStorage caches
function cleanupLegacyStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('cg_solar_logs_v1');
      localStorage.removeItem('cg_solar_blocks_v1');
      localStorage.removeItem('cg_solar_settings_v1');
    }
  } catch {}
}
cleanupLegacyStorage();

/**
 * Normalizes block metadata to ensure correct capacities (8, 20, 31 kWp)
 */
export function normalizeBlocks(rawBlocks) {
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return INITIAL_BLOCKS;
  }
  return rawBlocks.map((b) => {
    const defaultBlock = INITIAL_BLOCKS.find((ib) => ib.id === b.id);
    return {
      ...b,
      // If block has legacy 40/45/35 capacity, correct it to 8/20/31
      capacityKwp: (b.capacityKwp === 40 && b.id === 'A') ? 8 :
                   (b.capacityKwp === 45 && b.id === 'B') ? 20 :
                   (b.capacityKwp === 35 && b.id === 'F') ? 31 :
                   Number(b.capacityKwp || defaultBlock?.capacityKwp || 20),
      inverterModel: b.inverterModel && !b.inverterModel.includes('Growatt') && !b.inverterModel.includes('Sungrow')
        ? b.inverterModel
        : defaultBlock?.inverterModel || 'Deye Inverter',
    };
  });
}

/**
 * Fetch logs, blocks, and settings
 * Checks Google Apps Script URL if configured; otherwise reads from localStorage / clean baseline data.
 */
export async function fetchSolarData(gasUrl) {
  if (gasUrl && gasUrl.trim().startsWith('http')) {
    try {
      const response = await fetch(`${gasUrl}?action=getData`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json.success) {
          const fetchedLogs = Array.isArray(json.logs) && json.logs.length > 0 ? json.logs : getStoredLogs();
          const fetchedBlocks = normalizeBlocks(json.blocks);

          saveToLocalStorage(STORAGE_KEYS.LOGS, fetchedLogs);
          saveToLocalStorage(STORAGE_KEYS.BLOCKS, fetchedBlocks);

          // If Google Sheet blocks had outdated 40/45/35 kWp, push updated 8/20/31 kWp back to Google Sheet
          if (Array.isArray(json.blocks) && json.blocks.some(b => (b.capacityKwp === 40 || b.capacityKwp === 45 || b.capacityKwp === 35))) {
            syncAllToGoogleSheets(fetchedLogs, fetchedBlocks, gasUrl).catch(console.warn);
          }

          return {
            logs: fetchedLogs,
            blocks: fetchedBlocks,
            isLiveSync: true,
          };
        }
      }
    } catch (err) {
      console.warn('Could not connect to Google Apps Script Web App, falling back to local data:', err);
    }
  }

  // Local / Fresh baseline fallback
  return {
    logs: getStoredLogs(),
    blocks: getStoredBlocks(),
    isLiveSync: false,
  };
}

/**
 * Add a new log entry with robust dual-protocol sync to Google Sheets
 */
export async function submitDailyLog(entry, gasUrl) {
  // 1. Save locally first
  const currentLogs = getStoredLogs();
  
  // Check if an entry for this block & date already exists; update it or append
  const existingIdx = currentLogs.findIndex((l) => l.block === entry.block && l.date === entry.date);
  let updatedLogs = [...currentLogs];
  if (existingIdx >= 0) {
    updatedLogs[existingIdx] = { ...updatedLogs[existingIdx], ...entry };
  } else {
    updatedLogs.push(entry);
  }
  
  saveToLocalStorage(STORAGE_KEYS.LOGS, updatedLogs);

  // 2. If GAS URL configured, send to Google Sheets
  let remoteSyncSuccess = false;
  if (gasUrl && gasUrl.trim().startsWith('http')) {
    try {
      // Method A: Send via GET query parameter (No CORS preflight, executes reliably in all browsers)
      const encodedEntry = encodeURIComponent(JSON.stringify(entry));
      const getUrl = `${gasUrl}?action=addLog&entry=${encodedEntry}`;
      
      // Fire GET request
      const getPromise = fetch(getUrl, { method: 'GET', mode: 'no-cors' });

      // Method B: Send via text/plain POST (Bypasses OPTIONS preflight)
      const postPromise = fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addLog',
          entry,
        }),
        mode: 'no-cors',
      });

      await Promise.race([getPromise, postPromise]);
      remoteSyncSuccess = true;
    } catch (err) {
      console.error('Remote sync to Google Apps Script failed:', err);
    }
  }

  return {
    success: true,
    logs: updatedLogs,
    remoteSyncSuccess,
  };
}

/**
 * Synchronizes all local logs and blocks to Google Sheets in one batch
 */
export async function syncAllToGoogleSheets(logs, blocks, gasUrl) {
  if (!gasUrl || !gasUrl.trim().startsWith('http')) {
    return { success: false, message: 'Google Apps Script URL is not configured.' };
  }

  const payload = {
    blocks: normalizeBlocks(blocks),
    logs: logs || getStoredLogs(),
  };

  try {
    // 1. Try GET query parameter
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const getUrl = `${gasUrl}?action=syncAll&payload=${encodedPayload}`;
    
    await fetch(getUrl, { method: 'GET', mode: 'no-cors' });

    // 2. Also send via POST
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'syncAll',
        ...payload,
      }),
      mode: 'no-cors',
    });

    return { success: true, message: 'Successfully pushed all logs and metadata to Google Sheets!' };
  } catch (err) {
    console.error('Batch sync to Google Sheets failed:', err);
    return { success: false, message: 'Sync failed: ' + err.message };
  }
}

/**
 * Update block metadata
 */
export function saveBlocksConfig(blocks) {
  const normalized = normalizeBlocks(blocks);
  saveToLocalStorage(STORAGE_KEYS.BLOCKS, normalized);
}

/**
 * Settings persistence
 */
export function getStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      gasWebAppUrl: (parsed.gasWebAppUrl && parsed.gasWebAppUrl.trim()) ? parsed.gasWebAppUrl : DEFAULT_SETTINGS.gasWebAppUrl,
      adminPin: parsed.adminPin || DEFAULT_SETTINGS.adminPin,
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function getStoredLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse logs from localStorage', e);
  }
  saveToLocalStorage(STORAGE_KEYS.LOGS, SAMPLE_LOG_ENTRIES);
  return SAMPLE_LOG_ENTRIES;
}

export function getStoredBlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOCKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeBlocks(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to parse blocks from localStorage', e);
  }
  saveToLocalStorage(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
  return INITIAL_BLOCKS;
}

export function resetToSampleData() {
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(SAMPLE_LOG_ENTRIES));
  localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(INITIAL_BLOCKS));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  return {
    logs: SAMPLE_LOG_ENTRIES,
    blocks: INITIAL_BLOCKS,
    settings: DEFAULT_SETTINGS,
  };
}

export function zeroiseAllData() {
  const zeroLogs = [
    { date: "2026-07-18", block: "A", cumulativeUnits: 0, dailyUnits: 0, isManualEntry: true, weather: "Sunny", notes: "Commissioning Baseline" },
    { date: "2026-07-18", block: "B", cumulativeUnits: 0, dailyUnits: 0, isManualEntry: true, weather: "Sunny", notes: "Commissioning Baseline" },
    { date: "2026-07-18", block: "F", cumulativeUnits: 0, dailyUnits: 0, isManualEntry: true, weather: "Sunny", notes: "Commissioning Baseline" },
  ];
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(zeroLogs));
  localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(INITIAL_BLOCKS));
  return {
    logs: zeroLogs,
    blocks: INITIAL_BLOCKS,
    settings: getStoredSettings(),
  };
}

function saveToLocalStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`Failed to save key ${key} to localStorage`, e);
  }
}
