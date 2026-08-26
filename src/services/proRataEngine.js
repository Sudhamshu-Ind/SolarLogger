import { parseISO, format, differenceInCalendarDays, addDays, isBefore, isAfter, startOfDay } from 'date-fns';

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
    const inceptionDateStr = block.inceptionDate || '2026-07-18';
    const initialMeter = Number(block.initialMeterReading || 0);

    // Filter and sort entries for this block
    const blockLogs = rawEntries
      .filter((e) => e.block === blockId)
      .map((e) => ({
        ...e,
        dateStr: typeof e.date === 'string' ? e.date.substring(0, 10) : format(new Date(e.date), 'yyyy-MM-dd'),
        cumulativeUnits: Number(e.cumulativeUnits || 0),
        dailyUnits: e.dailyUnits !== undefined && e.dailyUnits !== null && e.dailyUnits !== '' ? Number(e.dailyUnits) : null,
        isManualEntry: e.isManualEntry !== false,
      }))
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
      // If we already have a baseline on this date, update it
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
    const daysSinceLastLog = lastActual ? differenceInCalendarDays(today, parseISO(lastActual.dateStr)) : 999;

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

      const currDate = parseISO(curr.dateStr);
      const nextDate = parseISO(next.dateStr);
      const dayDiff = differenceInCalendarDays(nextDate, currDate);

      if (dayDiff <= 0) continue;

      const meterDelta = Math.max(0, next.cumulativeUnits - curr.cumulativeUnits);
      const avgDailyUnits = meterDelta / dayDiff;

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
        const gapDate = addDays(currDate, dayOffset);
        const gapDateStr = format(gapDate, 'yyyy-MM-dd');
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

  const prevDate = parseISO(lastKnownEntry.dateStr || lastKnownEntry.date);
  const newDate = parseISO(entryDateStr);
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
}
