import { useMemo } from 'react';
import { parseLocalDate } from '../utils/formatters';

export function useKpiData({ dfFull, dfFiltered, metricCol, startDate, endDate }) {
  return useMemo(() => {
    if (!dfFull?.length) {
      return { currentTotal: 0, sparklineData: [] };
    }

    const isAvg = metricCol.includes('avg');
    const filteredDateSet = new Set(dfFiltered.map((r) => r.date).filter(Boolean));
    const monthlyMap = {};

    dfFull.forEach((row) => {
      const d = parseLocalDate(row.date);
      if (!d || isNaN(d.getTime())) return;

      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const val = Number(row[metricCol]);
      const isValid = row[metricCol] !== null && row[metricCol] !== undefined && !isNaN(val);

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          totalFull: 0,
          countFull: 0,
          totalFiltered: 0,
          countFiltered: 0,
          dateObj: new Date(d.getFullYear(), d.getMonth(), 1)
        };
      }

      if (isValid) {
        monthlyMap[monthKey].totalFull += val;
        monthlyMap[monthKey].countFull += 1;

        if (filteredDateSet.has(row.date)) {
          monthlyMap[monthKey].totalFiltered += val;
          monthlyMap[monthKey].countFiltered += 1;
        }
      }
    });

    const sortedMonths = Object.keys(monthlyMap).sort();

    const sparklineData = sortedMonths.map((key) => {
      const item = monthlyMap[key];
      const valFull = isAvg 
        ? (item.countFull > 0 ? item.totalFull / item.countFull : 0) 
        : item.totalFull;

      const valFiltered = item.countFiltered > 0 
        ? (isAvg ? item.totalFiltered / item.countFiltered : item.totalFiltered) 
        : null;

      return {
        monthKey: key,
        displayDate: item.dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        valFull,
        valFiltered,
      };
    });

    let validCount = 0;
    const rawFilteredSum = dfFiltered.reduce((acc, row) => {
      const val = Number(row[metricCol]);
      if (row[metricCol] !== null && row[metricCol] !== undefined && !isNaN(val)) {
        validCount += 1;
        return acc + val;
      }
      return acc;
    }, 0);

    const currentTotal = isAvg 
      ? (validCount > 0 ? rawFilteredSum / validCount : 0) 
      : rawFilteredSum;

    return { currentTotal, sparklineData };
  }, [dfFull, dfFiltered, metricCol, startDate, endDate]);
}