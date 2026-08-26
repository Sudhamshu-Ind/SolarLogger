import { parseISO, format, differenceInCalendarDays, addDays } from 'date-fns';

/**
 * Safely parses any date string / Date object to a valid Date object or fallback
 */
export function safeParseDate(input, fallback = new Date('2026-07-18')) {
  if (!input) return fallback;
  if (input instanceof Date && !isNaN(input.getTime())) return input;
  try {
    const str = String(input).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parsed = parseISO(str.substring(0, 10));
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return fallback;
}

/**
 * Safely formats any date input to string without throwing RangeError
 */
export function safeFormatDate(input, formatPattern = 'yyyy-MM-dd', fallbackStr = '2026-07-18') {
  try {
    const d = safeParseDate(input, null);
    if (d && !isNaN(d.getTime())) {
      return format(d, formatPattern);
    }
    if (typeof input === 'string' && input.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(input)) {
      return input.substring(0, 10);
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
    const inceptionDateStr = safeFormatDate(block.inceptionDate, 'yyyy-MM-dd', '2026-07-18');
    const initialMeter = Number(block.initialMeterReading || 0);

    // Filter, clean and sort entries for this block
    const blockLogs = (rawEntries || [])
      .filter((e) => e && e.block === blockId && e.date)
      .map((e) => ({
        ...e,
        dateStr: safeFormatDate(e.date, 'yyyy-MM-dd', inceptionDateStr),
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
