/**
 * Realistic Mock Data starting from commissioning date (18-Jul-2026)
 * Demonstrates intermittent entries with multi-day gaps that are smoothly pro-rated by the system.
 */

export const SAMPLE_LOG_ENTRIES = [
  // --- INCEPTION / BASELINE (18-Jul-2026) ---
  { date: "2026-07-18", block: "A", cumulativeUnits: 0, dailyUnits: 0, isManualEntry: true, weather: "Sunny", notes: "Commissioning" },
  { date: "2026-07-18", block: "B", cumulativeUnits: 0, dailyUnits: 0, isManualEntry: true, weather: "Sunny", notes: "Commissioning" },
  { date: "2026-07-18", block: "F", cumulativeUnits: 0, dailyUnits: 0, isManualEntry: true, weather: "Sunny", notes: "Commissioning" },

  // --- DAY 1 (19-Jul-2026) ---
  { date: "2026-07-19", block: "A", cumulativeUnits: 34, dailyUnits: 34, isManualEntry: true, weather: "Sunny", notes: "Clear sky" },
  { date: "2026-07-19", block: "B", cumulativeUnits: 88, dailyUnits: 88, isManualEntry: true, weather: "Sunny", notes: "Clear sky" },
  { date: "2026-07-19", block: "F", cumulativeUnits: 135, dailyUnits: 135, isManualEntry: true, weather: "Sunny", notes: "Clear sky" },

  // --- DAY 2 (20-Jul-2026) ---
  { date: "2026-07-20", block: "A", cumulativeUnits: 70, dailyUnits: 36, isManualEntry: true, weather: "Sunny", notes: "" },
  { date: "2026-07-20", block: "B", cumulativeUnits: 178, dailyUnits: 90, isManualEntry: true, weather: "Sunny", notes: "" },
  { date: "2026-07-20", block: "F", cumulativeUnits: 274, dailyUnits: 139, isManualEntry: true, weather: "Sunny", notes: "" },

  // --- 4-DAY GAP -> Next logged on 24-Jul-2026 ---
  { date: "2026-07-24", block: "A", cumulativeUnits: 206, dailyUnits: 34, isManualEntry: true, weather: "Partly Cloudy", notes: "Logged after 4-day weekend" },
  { date: "2026-07-24", block: "B", cumulativeUnits: 526, dailyUnits: 87, isManualEntry: true, weather: "Partly Cloudy", notes: "Logged after 4-day weekend" },
  { date: "2026-07-24", block: "F", cumulativeUnits: 814, dailyUnits: 135, isManualEntry: true, weather: "Partly Cloudy", notes: "Logged after 4-day weekend" },

  // --- Next logged on 28-Jul-2026 ---
  { date: "2026-07-28", block: "A", cumulativeUnits: 342, dailyUnits: 34, isManualEntry: true, weather: "Sunny", notes: "Routine meter check" },
  { date: "2026-07-28", block: "B", cumulativeUnits: 874, dailyUnits: 87, isManualEntry: true, weather: "Sunny", notes: "Routine meter check" },
  { date: "2026-07-28", block: "F", cumulativeUnits: 1354, dailyUnits: 135, isManualEntry: true, weather: "Sunny", notes: "Routine meter check" },

  // --- End of July (31-Jul-2026) ---
  { date: "2026-07-31", block: "A", cumulativeUnits: 447, dailyUnits: 35, isManualEntry: true, weather: "Sunny", notes: "Month-end meter reading" },
  { date: "2026-07-31", block: "B", cumulativeUnits: 1144, dailyUnits: 90, isManualEntry: true, weather: "Sunny", notes: "Month-end meter reading" },
  { date: "2026-07-31", block: "F", cumulativeUnits: 1765, dailyUnits: 137, isManualEntry: true, weather: "Sunny", notes: "Month-end meter reading" },

  // --- 7-DAY GAP -> Next logged on 07-Aug-2026 ---
  { date: "2026-08-07", block: "A", cumulativeUnits: 678, dailyUnits: 33, isManualEntry: true, weather: "Rainy", notes: "Weekly check, monsoon showers" },
  { date: "2026-08-07", block: "B", cumulativeUnits: 1739, dailyUnits: 85, isManualEntry: true, weather: "Rainy", notes: "Weekly check, monsoon showers" },
  { date: "2026-08-07", block: "F", cumulativeUnits: 2689, dailyUnits: 132, isManualEntry: true, weather: "Rainy", notes: "Weekly check, monsoon showers" },

  // --- Next logged on 14-Aug-2026 ---
  { date: "2026-08-14", block: "A", cumulativeUnits: 916, dailyUnits: 34, isManualEntry: true, weather: "Partly Cloudy", notes: "Weekly maintenance" },
  { date: "2026-08-14", block: "B", cumulativeUnits: 2355, dailyUnits: 88, isManualEntry: true, weather: "Partly Cloudy", notes: "Weekly maintenance" },
  { date: "2026-08-14", block: "F", cumulativeUnits: 3648, dailyUnits: 137, isManualEntry: true, weather: "Partly Cloudy", notes: "Weekly maintenance" },

  // --- Latest logged on 21-Aug-2026 ---
  { date: "2026-08-21", block: "A", cumulativeUnits: 1161, dailyUnits: 35, isManualEntry: true, weather: "Sunny", notes: "Yesterday evening reading" },
  { date: "2026-08-21", block: "B", cumulativeUnits: 2985, dailyUnits: 90, isManualEntry: true, weather: "Sunny", notes: "Yesterday evening reading" },
  { date: "2026-08-21", block: "F", cumulativeUnits: 4621, dailyUnits: 139, isManualEntry: true, weather: "Sunny", notes: "Yesterday evening reading" },
];
