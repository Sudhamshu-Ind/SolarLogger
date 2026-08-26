import { SAMPLE_LOG_ENTRIES } from '../mock/sampleData';
import { INITIAL_BLOCKS, DEFAULT_SETTINGS } from '../config/defaultSettings';

const STORAGE_KEYS = {
  LOGS: 'cg_solar_logs_v1',
  BLOCKS: 'cg_solar_blocks_v1',
  SETTINGS: 'cg_solar_settings_v1',
};

/**
 * Fetch logs, blocks, and settings
 * Checks Google Apps Script URL if configured; otherwise reads from localStorage / sample data.
 */
export async function fetchSolarData(gasUrl) {
  // If a live Google Apps Script URL is set, attempt to fetch from Google Sheets
  if (gasUrl && gasUrl.trim().startsWith('http')) {
    try {
      const response = await fetch(`${gasUrl}?action=getData`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.logs)) {
          // Cache in localStorage for resilience
          saveToLocalStorage(STORAGE_KEYS.LOGS, json.logs);
          if (Array.isArray(json.blocks) && json.blocks.length > 0) {
            saveToLocalStorage(STORAGE_KEYS.BLOCKS, json.blocks);
          }
          return {
            logs: json.logs,
            blocks: json.blocks && json.blocks.length > 0 ? json.blocks : getStoredBlocks(),
            isLiveSync: true,
          };
        }
      }
    } catch (err) {
      console.warn('Could not connect to Google Apps Script Web App, falling back to local data:', err);
    }
  }

  // Local / Mock fallback
  return {
    logs: getStoredLogs(),
    blocks: getStoredBlocks(),
    isLiveSync: false,
  };
}

/**
 * Add a new log entry
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

  // 2. If GAS URL configured, send POST request
  let remoteSyncSuccess = false;
  if (gasUrl && gasUrl.trim().startsWith('http')) {
    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addLog',
          entry,
        }),
      });
      const json = await response.json();
      if (json.success) {
        remoteSyncSuccess = true;
      }
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
 * Update block metadata
 */
export function saveBlocksConfig(blocks) {
  saveToLocalStorage(STORAGE_KEYS.BLOCKS, blocks);
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
  // Initialize with sample data
  saveToLocalStorage(STORAGE_KEYS.LOGS, SAMPLE_LOG_ENTRIES);
  return SAMPLE_LOG_ENTRIES;
}

export function getStoredBlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOCKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

function saveToLocalStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`Failed to save key ${key} to localStorage`, e);
  }
}
