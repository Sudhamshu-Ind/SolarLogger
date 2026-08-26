/**
 * Clean Baseline Data starting from commissioning date (18-Jul-2026)
 * Initialized to 0 kWh baseline so you can enter your live readings.
 */

export const SAMPLE_LOG_ENTRIES = [
  // --- INCEPTION BASELINE (18-Jul-2026: 0 kWh) ---
  { date: "2026-07-18", block: "A", cumulativeUnits: 0, dailyUnits: 0, isManualEntry: true, weather: "Sunny", notes: "Commissioning Baseline" },
  { date: "2026-07-18", block: "B", cumulativeUnits: 0, dailyUnits: 0, isManualEntry: true, weather: "Sunny", notes: "Commissioning Baseline" },
  { date: "2026-07-18", block: "F", cumulativeUnits: 0, dailyUnits: 0, isManualEntry: true, weather: "Sunny", notes: "Commissioning Baseline" },
];
