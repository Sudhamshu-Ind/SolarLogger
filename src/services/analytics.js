import { parseISO, format, isSameMonth, isSameYear, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Analytics and Financial calculation functions
 */

export function calculateSummaryMetrics(dailySeries = [], rawEntries = [], blocks = [], settings = {}) {
  const tariff = Number(settings.gridTariffPerKwh || 8.50);
  const co2Factor = Number(settings.co2FactorKgPerKwh || 0.82);
  const treesFactor = Number(settings.treesFactorPerKwh || 0.041);

  if (!dailySeries || dailySeries.length === 0) {
    return {
      lifetimeUnits: 0,
      lifetimeSavings: 0,
      co2OffsetKg: 0,
      co2OffsetTons: 0,
      treesPlanted: 0,
      todayUnits: 0,
      mtdUnits: 0,
      avgDailyUnits: 0,
      totalCapacityKwp: blocks.reduce((acc, b) => acc + (b.capacityKwp || 0), 0),
      blockSpecificYields: {},
    };
  }

  // Lifetime generation (sum of all daily units)
  let lifetimeUnits = 0;
  let mtdUnits = 0;
  const now = new Date();
  const currentMonthStr = format(now, 'yyyy-MM');
  const todayStr = format(now, 'yyyy-MM-dd');

  // Per block total generation
  const blockTotals = {};
  blocks.forEach((b) => {
    blockTotals[b.id] = 0;
  });

  dailySeries.forEach((day) => {
    lifetimeUnits += day.totalDailyUnits;

    if (day.date.startsWith(currentMonthStr)) {
      mtdUnits += day.totalDailyUnits;
    }

    blocks.forEach((b) => {
      const bData = day.blockData[b.id];
      if (bData && bData.dailyUnits) {
        blockTotals[b.id] += bData.dailyUnits;
      }
    });
  });

  // Today / latest available day's generation
  const latestDay = dailySeries[dailySeries.length - 1];
  const todayUnits = latestDay ? latestDay.totalDailyUnits : 0;

  // Average daily generation
  const daysCount = dailySeries.length || 1;
  const avgDailyUnits = lifetimeUnits / daysCount;

  // Environmental and Financial Metrics
  const lifetimeSavings = lifetimeUnits * tariff;
  const co2OffsetKg = lifetimeUnits * co2Factor;
  const co2OffsetTons = co2OffsetKg / 1000;
  const treesPlanted = Math.round(lifetimeUnits * treesFactor);

  // Total capacity
  const totalCapacityKwp = blocks.reduce((acc, b) => acc + (b.capacityKwp || 0), 0);

  // Specific Yield (kWh per kWp) - measure of plant efficiency
  const blockSpecificYields = {};
  blocks.forEach((b) => {
    const totalGen = blockTotals[b.id] || 0;
    const capacity = b.capacityKwp || 1;
    blockSpecificYields[b.id] = {
      blockId: b.id,
      blockName: b.name,
      totalKwh: Number(totalGen.toFixed(1)),
      capacityKwp: capacity,
      specificYieldKwhPerKwp: Number((totalGen / capacity).toFixed(1)),
      percentageShare: lifetimeUnits > 0 ? Number(((totalGen / lifetimeUnits) * 100).toFixed(1)) : 0,
      color: b.color,
    };
  });

  return {
    lifetimeUnits: Number(lifetimeUnits.toFixed(1)),
    lifetimeMwh: Number((lifetimeUnits / 1000).toFixed(2)),
    lifetimeSavings: Number(lifetimeSavings.toFixed(0)),
    co2OffsetKg: Number(co2OffsetKg.toFixed(1)),
    co2OffsetTons: Number(co2OffsetTons.toFixed(2)),
    treesPlanted,
    todayUnits: Number(todayUnits.toFixed(1)),
    mtdUnits: Number(mtdUnits.toFixed(1)),
    avgDailyUnits: Number(avgDailyUnits.toFixed(1)),
    totalCapacityKwp,
    blockTotals,
    blockSpecificYields,
  };
}

/**
 * Aggregate daily series into monthly bar chart records
 */
export function aggregateMonthlyData(dailySeries = [], blocks = []) {
  const monthMap = new Map();

  dailySeries.forEach((day) => {
    const monthKey = day.date.substring(0, 7); // 'YYYY-MM'
    if (!monthMap.has(monthKey)) {
      const monthDate = parseISO(`${monthKey}-01`);
      const monthLabel = format(monthDate, 'MMM yyyy');
      const record = {
        monthKey,
        monthLabel,
        totalUnits: 0,
      };
      blocks.forEach((b) => {
        record[b.id] = 0;
      });
      monthMap.set(monthKey, record);
    }

    const rec = monthMap.get(monthKey);
    rec.totalUnits += day.totalDailyUnits;

    blocks.forEach((b) => {
      const bData = day.blockData[b.id];
      if (bData && bData.dailyUnits) {
        rec[b.id] += bData.dailyUnits;
      }
    });
  });

  const sorted = Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  
  // Format numbers nicely
  return sorted.map((row) => {
    const formatted = { ...row, totalUnits: Number(row.totalUnits.toFixed(1)) };
    blocks.forEach((b) => {
      formatted[b.id] = Number((row[b.id] || 0).toFixed(1));
    });
    return formatted;
  });
}

/**
 * Format daily series for Recharts trend chart
 */
export function formatDailyChartData(dailySeries = [], blocks = []) {
  return dailySeries.map((day) => {
    const dateObj = parseISO(day.date);
    const item = {
      date: day.date,
      formattedDate: format(dateObj, 'dd MMM'),
      total: day.totalDailyUnits,
      isEstimated: day.isEstimated,
      hasEstimatedBlock: day.hasEstimatedBlock,
    };

    blocks.forEach((b) => {
      const bData = day.blockData[b.id];
      item[b.id] = bData ? bData.dailyUnits : 0;
      item[`${b.id}_cumulative`] = bData ? bData.cumulativeUnits : 0;
      item[`${b.id}_isEstimated`] = bData ? bData.isEstimated : false;
    });

    return item;
  });
}

/**
 * Format currency in Indian numbering format (₹ Lakhs / Crores / Thousands)
 */
export function formatINR(amount) {
  if (amount === undefined || amount === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
