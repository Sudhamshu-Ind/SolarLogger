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
  { date: "2026-07-19", block: "A", cumulativeUnits: 172, dailyUnits: 172, isManualEntry: true, weather: "Sunny", notes: "Clear sky" },
  { date: "2026-07-19", block: "B", cumulativeUnits: 195, dailyUnits: 195, isManualEntry: true, weather: "Sunny", notes: "Clear sky" },
  { date: "2026-07-19", block: "F", cumulativeUnits: 148, dailyUnits: 148, isManualEntry: true, weather: "Sunny", notes: "Clear sky" },

  // --- DAY 2 (20-Jul-2026) ---
  { date: "2026-07-20", block: "A", cumulativeUnits: 348, dailyUnits: 176, isManualEntry: true, weather: "Sunny", notes: "" },
  { date: "2026-07-20", block: "B", cumulativeUnits: 396, dailyUnits: 201, isManualEntry: true, weather: "Sunny", notes: "" },
  { date: "2026-07-20", block: "F", cumulativeUnits: 299, dailyUnits: 151, isManualEntry: true, weather: "Sunny", notes: "" },

  // --- 4-DAY GAP -> Next logged on 24-Jul-2026 ---
  { date: "2026-07-24", block: "A", cumulativeUnits: 1012, dailyUnits: 168, isManualEntry: true, weather: "Partly Cloudy", notes: "Logged after 4-day weekend" },
  { date: "2026-07-24", block: "B", cumulativeUnits: 1160, dailyUnits: 192, isManualEntry: true, weather: "Partly Cloudy", notes: "Logged after 4-day weekend" },
  { date: "2026-07-24", block: "F", cumulativeUnits: 875, dailyUnits: 142, isManualEntry: true, weather: "Partly Cloudy", notes: "Logged after 4-day weekend" },

  // --- Next logged on 28-Jul-2026 ---
  { date: "2026-07-28", block: "A", cumulativeUnits: 1675, dailyUnits: 165, isManualEntry: true, weather: "Sunny", notes: "Routine meter check" },
  { date: "2026-07-28", block: "B", cumulativeUnits: 1920, dailyUnits: 190, isManualEntry: true, weather: "Sunny", notes: "Routine meter check" },
  { date: "2026-07-28", block: "F", cumulativeUnits: 1445, dailyUnits: 140, isManualEntry: true, weather: "Sunny", notes: "Routine meter check" },

  // --- End of July (31-Jul-2026) ---
  { date: "2026-07-31", block: "A", cumulativeUnits: 2180, dailyUnits: 170, isManualEntry: true, weather: "Sunny", notes: "Month-end meter reading" },
  { date: "2026-07-31", block: "B", cumulativeUnits: 2510, dailyUnits: 198, isManualEntry: true, weather: "Sunny", notes: "Month-end meter reading" },
  { date: "2026-07-31", block: "F", cumulativeUnits: 1870, dailyUnits: 143, isManualEntry: true, weather: "Sunny", notes: "Month-end meter reading" },

  // --- 7-DAY GAP -> Next logged on 07-Aug-2026 ---
  { date: "2026-08-07", block: "A", cumulativeUnits: 3340, dailyUnits: 166, isManualEntry: true, weather: "Rainy", notes: "Weekly check, monsoon showers" },
  { date: "2026-08-07", block: "B", cumulativeUnits: 3845, dailyUnits: 190, isManualEntry: true, weather: "Rainy", notes: "Weekly check, monsoon showers" },
  { date: "2026-08-07", block: "F", cumulativeUnits: 2855, dailyUnits: 139, isManualEntry: true, weather: "Rainy", notes: "Weekly check, monsoon showers" },

  // --- Next logged on 14-Aug-2026 ---
  { date: "2026-08-14", block: "A", cumulativeUnits: 4510, dailyUnits: 168, isManualEntry: true, weather: "Partly Cloudy", notes: "Weekly maintenance" },
  { date: "2026-08-14", block: "B", cumulativeUnits: 5190, dailyUnits: 194, isManualEntry: true, weather: "Partly Cloudy", notes: "Weekly maintenance" },
  { date: "2026-08-14", block: "F", cumulativeUnits: 3860, dailyUnits: 145, isManualEntry: true, weather: "Partly Cloudy", notes: "Weekly maintenance" },

  // --- Latest logged on 21-Aug-2026 ---
  { date: "2026-08-21", block: "A", cumulativeUnits: 5690, dailyUnits: 172, isManualEntry: true, weather: "Sunny", notes: "Yesterday evening reading" },
  { date: "2026-08-21", block: "B", cumulativeUnits: 6545, dailyUnits: 196, isManualEntry: true, weather: "Sunny", notes: "Yesterday evening reading" },
  { date: "2026-08-21", block: "F", cumulativeUnits: 4865, dailyUnits: 146, isManualEntry: true, weather: "Sunny", notes: "Yesterday evening reading" },
];
