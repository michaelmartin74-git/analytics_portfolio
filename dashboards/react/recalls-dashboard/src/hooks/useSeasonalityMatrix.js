import { useState, useMemo } from 'react';
import { parseLocalDate } from '../utils/formatters';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function useSeasonalityMatrix(dfFull = [], metricCol, startDate, endDate) {
  const [viewMode, setViewMode] = useState('totals'); // 'totals' | 'mom'

  // Determine active date boundary limits for styling/opacity filters
  const rangeBounds = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end) return null;
    return {
      startMs: new Date(start.getFullYear(), start.getMonth(), 1).getTime(),
      endMs: new Date(end.getFullYear(), end.getMonth() + 1, 0).getTime(),
    };
  }, [startDate, endDate]);

  // Transform raw row records into an aggregated Year x Month grid
  const { matrix, years, maxVal } = useMemo(() => {
    const grid = {};
    const yearSet = new Set();
    let max = 0;

    dfFull.forEach((row) => {
      if (!row.date) return;
      const d = parseLocalDate(row.date);
      if (!d || isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const val = Number(row[metricCol]) || 0;

      yearSet.add(year);

      if (!grid[year]) grid[year] = Array(12).fill(0);
      grid[year][monthIdx] += val;

      if (grid[year][monthIdx] > max) max = grid[year][monthIdx];
    });

    const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
    return { matrix: grid, years: sortedYears, maxVal: max };
  }, [dfFull, metricCol]);

  // Helper to retrieve prior period's metric value across year boundaries
  const getPriorMonthVal = (year, monthIdx) => {
    if (monthIdx === 0) {
      return matrix[year - 1]?.[11] ?? null;
    }
    return matrix[year]?.[monthIdx - 1] ?? null;
  };

  // Helper to calculate Month-over-Month growth percentage
  const getMomGrowth = (year, monthIdx, currentVal) => {
    const priorVal = getPriorMonthVal(year, monthIdx);
    if (priorVal !== null && priorVal > 0) {
      return ((currentVal - priorVal) / priorVal) * 100;
    }
    return null;
  };

  // Helper to determine if a given cell is inside the selected date range
  const isCellInRange = (year, monthIdx) => {
    if (!rangeBounds) return true;
    const cellMs = new Date(year, monthIdx, 1).getTime();
    return cellMs >= rangeBounds.startMs && cellMs <= rangeBounds.endMs;
  };

  return {
    viewMode,
    setViewMode,
    matrix,
    years,
    maxVal,
    getMomGrowth,
    isCellInRange,
  };
}