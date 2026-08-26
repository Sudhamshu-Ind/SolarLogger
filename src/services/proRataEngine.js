import { parseISO, format, differenceInCalendarDays, addDays } from 'date-fns';

/**
 * Normalizes any date string (ISO, DD-MM-YYYY, DD/MM/YYYY, DD-MM-YY, or Google Sheet strings)
 * into a canonical YYYY-MM-DD string with year 2026.
 */
export function normalizeDateToYMD(input, fallback = '2026-07-18') {
  if (!input) return fallback;
  if (input instanceof Date && !isNaN(input.getTime())) {
    let y = input.getFullYear();
    if (y < 2020) y = 2026;
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(input).trim();

  // Pattern 1: YYYY-MM-DD (e.g. 2026-08-26 or 2001-08-26)
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    const month = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const day = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    if (year < 2020) year = 2026;
    return `${year}-${month}-${day}`;
  }

  // Pattern 2: DD-MM-YYYY or DD/MM/YYYY (e.g. 26-08-2026 or 26/08/2026)
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const month = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
    let year = parseInt(dmyMatch[3], 10);
    if (year < 2020) year = 2026;
    return `${year}-${month}-${day}`;
  }

  // Pattern 3: DD-MM-YY or DD/MM/YY (e.g. 26-08-26 or 01-08-26)
  const shortMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (shortMatch) {
    const p1 = parseInt(shortMatch[1], 10);
    const p2 = parseInt(shortMatch[2], 10);
    const p3 = parseInt(shortMatch[3], 10);
    if (p3 === 26) {
      return `2026-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    if (p1 === 26) {
      return `2026-${String(p2).padStart(2, '0')}-${String(p3).padStart(2, '0')}`;
    }
    return `2026-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      let year = d.getFullYear();
      if (year < 2020) year = 2026;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}

  return fallback;
}

/**
 * Safely parses any date string / Date object to a valid Date object or fallback
 */
export function safeParseDate(input, fallback = new Date('2026-07-18')) {
  if (!input) return fallback;
  if (input instanceof Date && !isNaN(input.getTime())) return input;
  try {
    const ymd = normalizeDateToYMD(input);
    const parsed = parseISO(ymd);
    if (!isNaN(parsed.getTime())) return parsed;
    const d = new Date(ymd);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return fallback;
}

/**
 * Safely formats any date input to string without throwing RangeError
 */
export function safeFormatDate(input, formatPattern = 'yyyy-MM-dd', fallbackStr = '2026-07-18') {
  try {
    const ymd = normalizeDateToYMD(input, fallbackStr);
    const d = parseISO(ymd);
    if (d && !isNaN(d.getTime())) {
      return format(d, formatPattern);
    }
  } catch {}
  return fallbackStr;
}

/**
 * Smart Pro-Rata Interpolation Engine for Solar Log
 * Handles missing dates between irregular meter readings by distributing
 * cumulative meter delta smoothly across intermediate days.
 */
export function buildContinuousSolarSeries(rawEntries = [], blocks = []) {
  if (!blocks || blocks.length === 0) return { dailySeries: [], blockLatestStatus: {} };

  const seriesByDate = new Map(); // Key: YYYY-MM-DD -> { date, blocks: { A: { daily, cumulative, isEstimated } }, totalDaily: 0 }
  const blockLatestStatus = {};

  // Process each block independently
  blocks.forEach((block) => {
    const blockId = block.id;
    const inceptionDateStr = normalizeDateToYMD(block.inceptionDate, '2026-07-18');
    const initialMeter = Number(block.initialMeterReading || 0);

    // Filter, clean and sort entries for this block
    const blockLogs = (rawEntries || [])
      .filter((e) => e && e.block === blockId && e.date)
      .map((e) => ({
        ...e,
        dateStr: normalizeDateToYMD(e.date, inceptionDateStr),
        cumulativeUnits: Number(e.cumulativeUnits || 0),
        dailyUnits: e.dailyUnits !== undefined && e.dailyUnits !== null && e.dailyUnits !== '' ? Number(e.dailyUnits) : null,
        isManualEntry: e.isManualEntry !== false,
      }))
      .filter((e) => Boolean(e.dateStr))
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    // Prepare baseline anchor at inception
    const points = [];
    const hasInceptionEntry = blockLogs.some((l) => l.dateStr === inceptionDateStr);
    
    if (!hasInceptionEntry) {
      points.push({
        dateStr: inceptionDateStr,
        cumulativeUnits: initialMeter,
        dailyUnits: 0,
        isManualEntry: true,
        weather: 'Sunny',
        notes: 'Plant Commissioning Baseline',
      });
    }

    // Merge baseline and actual logs
    blockLogs.forEach((log) => {
      const idx = points.findIndex((p) => p.dateStr === log.dateStr);
      if (idx >= 0) {
        points[idx] = log;
      } else {
        points.push(log);
      }
    });

    // Re-sort points
    points.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    // Track latest status
    const actualLogsOnly = points.filter((p) => p.isManualEntry && p.dateStr !== inceptionDateStr);
    const lastActual = actualLogsOnly.length > 0 ? actualLogsOnly[actualLogsOnly.length - 1] : points[0];
    const today = new Date();
    
    let daysSinceLastLog = 0;
    try {
      const lastDate = safeParseDate(lastActual?.dateStr, today);
      daysSinceLastLog = Math.max(0, differenceInCalendarDays(today, lastDate));
    } catch {
      daysSinceLastLog = 0;
    }

    blockLatestStatus[blockId] = {
      blockId,
      blockName: block.name,
      lastLoggedDate: lastActual ? lastActual.dateStr : inceptionDateStr,
      lastCumulativeUnits: lastActual ? lastActual.cumulativeUnits : initialMeter,
      daysSinceLastLog,
      statusLevel: daysSinceLastLog <= 2 ? 'healthy' : daysSinceLastLog <= 7 ? 'warning' : 'overdue',
      totalLogsCount: actualLogsOnly.length,
    };

    // If only 1 point exists (inception), add a single record
    if (points.length === 1) {
      const p = points[0];
      addToSeriesMap(seriesByDate, p.dateStr, blockId, {
        dailyUnits: p.dailyUnits || 0,
        cumulativeUnits: p.cumulativeUnits,
        isEstimated: false,
        isManualEntry: true,
        weather: p.weather,
        notes: p.notes,
      });
      return;
    }

    // Interpolate between consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];

      const currDate = safeParseDate(curr.dateStr);
      const nextDate = safeParseDate(next.dateStr);
      
      let dayDiff = 0;
      try {
        dayDiff = differenceInCalendarDays(nextDate, currDate);
      } catch {
        dayDiff = 0;
      }

      if (isNaN(dayDiff) || dayDiff <= 0) {
        // Same date or invalid, just add next point
        addToSeriesMap(seriesByDate, next.dateStr, blockId, {
          dailyUnits: Number((next.dailyUnits || 0).toFixed(2)),
          cumulativeUnits: next.cumulativeUnits,
          isEstimated: false,
          isManualEntry: true,
          weather: next.weather,
          notes: next.notes,
        });
        continue;
      }

      const meterDelta = Math.max(0, next.cumulativeUnits - curr.cumulativeUnits);
      const avgDailyUnits = dayDiff > 0 ? meterDelta / dayDiff : 0;

      // Fill current date point (if start of series)
      if (i === 0) {
        addToSeriesMap(seriesByDate, curr.dateStr, blockId, {
          dailyUnits: curr.dailyUnits !== null ? curr.dailyUnits : (curr.dateStr === inceptionDateStr ? 0 : avgDailyUnits),
          cumulativeUnits: curr.cumulativeUnits,
          isEstimated: false,
          isManualEntry: true,
          weather: curr.weather,
          notes: curr.notes,
        });
      }

      // Fill in-between gap days (pro-rata estimated)
      for (let dayOffset = 1; dayOffset < dayDiff; dayOffset++) {
        let gapDateStr = '';
        try {
          const gapDate = addDays(currDate, dayOffset);
          gapDateStr = safeFormatDate(gapDate, 'yyyy-MM-dd');
        } catch {
          gapDateStr = curr.dateStr;
        }

        const estCumulative = curr.cumulativeUnits + (avgDailyUnits * dayOffset);

        addToSeriesMap(seriesByDate, gapDateStr, blockId, {
          dailyUnits: Number(avgDailyUnits.toFixed(2)),
          cumulativeUnits: Number(estCumulative.toFixed(2)),
          isEstimated: true,
          isManualEntry: false,
          weather: 'Estimated',
          notes: `Pro-rata average across ${dayDiff}-day gap (${curr.dateStr} to ${next.dateStr})`,
        });
      }

      // Fill next point (actual logged point)
      addToSeriesMap(seriesByDate, next.dateStr, blockId, {
        dailyUnits: Number((next.dailyUnits !== null ? next.dailyUnits : avgDailyUnits).toFixed(2)),
        cumulativeUnits: next.cumulativeUnits,
        isEstimated: false,
        isManualEntry: true,
        weather: next.weather,
        notes: next.notes,
      });
    }
  });

  // Convert map to sorted flat array
  const dates = Array.from(seriesByDate.keys()).sort();
  const dailySeries = dates.map((dateStr) => {
    const entry = seriesByDate.get(dateStr);
    let totalDaily = 0;
    let anyEstimated = false;
    let anyActual = false;

    blocks.forEach((b) => {
      const bData = entry.blockData[b.id];
      if (bData) {
        totalDaily += bData.dailyUnits || 0;
        if (bData.isEstimated) anyEstimated = true;
        if (bData.isManualEntry) anyActual = true;
      }
    });

    return {
      date: dateStr,
      totalDailyUnits: Number(totalDaily.toFixed(2)),
      blockData: entry.blockData,
      isEstimated: anyEstimated && !anyActual,
      hasEstimatedBlock: anyEstimated,
    };
  });

  return { dailySeries, blockLatestStatus };
}

function addToSeriesMap(map, dateStr, blockId, data) {
  if (!dateStr) return;
  if (!map.has(dateStr)) {
    map.set(dateStr, {
      date: dateStr,
      blockData: {},
    });
  }
  const dateObj = map.get(dateStr);
  dateObj.blockData[blockId] = data;
}

/**
 * Preview pro-rata distribution for a new proposed log entry before submitting
 */
export function calculateEntryPreview({ blockId, entryDateStr, newCumulative, newDaily, lastKnownEntry }) {
  if (!lastKnownEntry || !newCumulative) {
    return {
      deltaUnits: Number(newDaily || 0),
      daysDiff: 1,
      avgDailyUnits: Number(newDaily || 0),
      isGap: false,
    };
  }

  try {
    const prevDate = safeParseDate(lastKnownEntry.dateStr || lastKnownEntry.date);
    const newDate = safeParseDate(entryDateStr);
    const daysDiff = differenceInCalendarDays(newDate, prevDate);

    if (daysDiff <= 0) {
      return {
        error: "Selected date must be after the last recorded reading date.",
        daysDiff: 0,
      };
    }

    const deltaUnits = Math.max(0, Number(newCumulative) - Number(lastKnownEntry.cumulativeUnits || 0));
    const avgDailyUnits = daysDiff > 0 ? deltaUnits / daysDiff : deltaUnits;

    return {
      deltaUnits: Number(deltaUnits.toFixed(2)),
      daysDiff,
      avgDailyUnits: Number(avgDailyUnits.toFixed(2)),
      isGap: daysDiff > 1,
    };
  } catch (err) {
    return {
      deltaUnits: Number(newDaily || 0),
      daysDiff: 1,
      avgDailyUnits: Number(newDaily || 0),
      isGap: false,
    };
  }
}
