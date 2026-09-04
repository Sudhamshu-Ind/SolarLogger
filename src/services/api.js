import { SAMPLE_LOG_ENTRIES } from '../mock/sampleData';
import { INITIAL_BLOCKS, DEFAULT_SETTINGS } from '../config/defaultSettings';
import { normalizeDateToYMD } from './proRataEngine';

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
 * Normalizes block metadata to ensure correct capacities and phases
 */
export function normalizeBlocks(rawBlocks) {
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return INITIAL_BLOCKS;
  }

  // Map incoming blocks
  const mapped = rawBlocks.map((b) => {
    const defaultBlock = INITIAL_BLOCKS.find((ib) => ib.id === b.id);
    const capacity = (b.capacityKwp === 40 && b.id === 'A') ? 8 :
                     (b.capacityKwp === 45 && b.id === 'B') ? 20 :
                     (b.capacityKwp === 35 && b.id === 'F') ? 31 :
                     Number(b.capacityKwp || defaultBlock?.capacityKwp || 15);
    
    return {
      ...b,
      id: String(b.id || '').toUpperCase().trim(),
      name: b.name || defaultBlock?.name || `Block ${b.id} (Rooftop Plant)`,
      capacityKwp: capacity,
      color: b.color || defaultBlock?.color || '#a855f7',
      inverterModel: b.inverterModel && !b.inverterModel.includes('Growatt') && !b.inverterModel.includes('Sungrow')
        ? b.inverterModel
        : defaultBlock?.inverterModel || `Deye SUN-${capacity}K-G04 (BLE)`,
      status: b.status || 'Active',
      phase: Number(b.phase || defaultBlock?.phase || (['A', 'B', 'F'].includes(b.id) ? 1 : 2)),
    };
  });

  // Ensure any core blocks from INITIAL_BLOCKS not present in rawBlocks are retained
  INITIAL_BLOCKS.forEach((ib) => {
    if (!mapped.some((b) => b.id === ib.id)) {
      mapped.push(ib);
    }
  });

  return mapped;
}

/**
 * Deduplicates log entries by date + block, remapping legacy 'D' to 'G'
 */
export function deduplicateLogs(logs, validBlocks = []) {
  if (!Array.isArray(logs)) return [];
  const validIds = new Set(validBlocks.map((b) => b.id));
  const map = new Map();

  logs.forEach((item) => {
    if (!item) return;
    let block = String(item.block || '').toUpperCase().trim();
    // Remap legacy 'D' log to 'G'
    if (block === 'D' && (!validIds.has('D') || validIds.has('G'))) {
      block = 'G';
    }
    if (validIds.size > 0 && !validIds.has(block)) return;

    const dateStr = normalizeDateToYMD(item.date, '2026-07-18');
    const key = `${dateStr}_${block}`;

    const normalizedItem = {
      ...item,
      date: dateStr,
      block,
      cumulativeUnits: Number(item.cumulativeUnits || 0),
      dailyUnits: item.dailyUnits !== null && item.dailyUnits !== undefined && item.dailyUnits !== '' ? Number(item.dailyUnits) : null,
      isManualEntry: item.isManualEntry !== false,
      weather: item.weather || 'Sunny',
      notes: item.notes || '',
      loggedBy: item.loggedBy || 'Staff',
      timestamp: item.timestamp || new Date().toISOString(),
    };

    if (!map.has(key)) {
      map.set(key, normalizedItem);
    } else {
      const existing = map.get(key);
      const existingTime = new Date(existing.timestamp).getTime();
      const newTime = new Date(normalizedItem.timestamp).getTime();
      // Keep entry with newer timestamp or higher cumulative reading
      if (newTime > existingTime || (newTime === existingTime && normalizedItem.cumulativeUnits >= existing.cumulativeUnits)) {
        map.set(key, normalizedItem);
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
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
          // Normalize blocks (preserving all 5 Athens blocks)
          const fetchedBlocks = normalizeBlocks(json.blocks);

          // Deduplicate logs from Google Sheet
          const fetchedLogs = Array.isArray(json.logs) && json.logs.length > 0
            ? deduplicateLogs(json.logs, fetchedBlocks)
            : getStoredLogs();

          saveToLocalStorage(STORAGE_KEYS.LOGS, fetchedLogs);
          saveToLocalStorage(STORAGE_KEYS.BLOCKS, fetchedBlocks);

          // If Google Sheet was missing Block G or K, push updated 5-block metadata back to sheet
          if (!Array.isArray(json.blocks) || json.blocks.length < 5 || json.blocks.some(b => b.capacityKwp === 40 || b.capacityKwp === 45 || b.capacityKwp === 35)) {
            syncBlocksToGoogleSheets(fetchedBlocks, gasUrl).catch(console.warn);
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
  const localBlocks = getStoredBlocks();
  const localLogs = deduplicateLogs(getStoredLogs(), localBlocks);
  return {
    logs: localLogs,
    blocks: localBlocks,
    isLiveSync: false,
  };
}

// In-flight submission lock to prevent duplicate clicks
let isSubmittingLog = false;

/**
 * Add a new log entry with single-request dispatch (no concurrent duplicate requests)
 */
export async function submitDailyLog(entry, gasUrl) {
  if (isSubmittingLog) {
    return { success: false, message: 'Submission already in progress...' };
  }
  isSubmittingLog = true;

  try {
    // Normalize entry date to valid YYYY-MM-DD
    const normalizedEntry = {
      ...entry,
      date: normalizeDateToYMD(entry.date, '2026-08-26'),
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    // 1. Save locally and deduplicate
    const currentLogs = getStoredLogs();
    const updatedLogs = deduplicateLogs([...currentLogs, normalizedEntry]);
    saveToLocalStorage(STORAGE_KEYS.LOGS, updatedLogs);

    // 2. If GAS URL configured, send a SINGLE reliable request to Google Sheets
    let remoteSyncSuccess = false;
    if (gasUrl && gasUrl.trim().startsWith('http')) {
      try {
        // Send via POST (text/plain avoids OPTIONS CORS preflight in browsers)
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'addLog',
            entry: normalizedEntry,
          }),
          mode: 'no-cors',
        });
        remoteSyncSuccess = true;
      } catch (postErr) {
        console.warn('POST failed, attempting fallback GET query request:', postErr);
        try {
          const encodedEntry = encodeURIComponent(JSON.stringify(normalizedEntry));
          const getUrl = `${gasUrl}?action=addLog&entry=${encodedEntry}`;
          await fetch(getUrl, { method: 'GET', mode: 'no-cors' });
          remoteSyncSuccess = true;
        } catch (getErr) {
          console.error('Remote sync to Google Apps Script failed:', getErr);
        }
      }
    }

    return {
      success: true,
      logs: updatedLogs,
      remoteSyncSuccess,
    };
  } finally {
    isSubmittingLog = false;
  }
}

/**
 * Dedicated synchronization of block metadata to Google Sheets
 */
export async function syncBlocksToGoogleSheets(blocks, gasUrl) {
  if (!gasUrl || !gasUrl.trim().startsWith('http')) {
    return { success: false, message: 'Google Apps Script URL is not configured.' };
  }

  const normalized = normalizeBlocks(blocks);

  try {
    // Send POST updateBlocks
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateBlocks',
        blocks: normalized,
      }),
      mode: 'no-cors',
    });

    // Also fallback GET query for maximum serverless compatibility
    const encodedPayload = encodeURIComponent(JSON.stringify({ blocks: normalized }));
    const getUrl = `${gasUrl}?action=syncAll&payload=${encodedPayload}`;
    await fetch(getUrl, { method: 'GET', mode: 'no-cors' }).catch(() => {});

    return { success: true, message: 'Substation blocks synced successfully to Google Sheets!' };
  } catch (err) {
    console.error('Failed to sync blocks to Google Sheets:', err);
    return { success: false, message: 'Failed to sync blocks: ' + err.message };
  }
}

/**
 * Synchronizes all local logs and blocks to Google Sheets in one batch
 */
export async function syncAllToGoogleSheets(logs, blocks, gasUrl) {
  if (!gasUrl || !gasUrl.trim().startsWith('http')) {
    return { success: false, message: 'Google Apps Script URL is not configured.' };
  }

  const normalizedBlocks = normalizeBlocks(blocks);
  const cleanLogs = deduplicateLogs(logs || getStoredLogs(), normalizedBlocks);

  const payload = {
    blocks: normalizedBlocks,
    logs: cleanLogs,
  };

  try {
    // 1. Send via POST
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
 * Update block metadata locally
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
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((l) => ({
          ...l,
          date: normalizeDateToYMD(l.date, '2026-07-18'),
        }));
      }
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
