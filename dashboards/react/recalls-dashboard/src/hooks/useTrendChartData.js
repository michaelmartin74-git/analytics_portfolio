import { useMemo } from 'react';

export function useTrendChartData({ dfFull = [], dfFiltered = [], metricCol }) {
  return useMemo(() => {
    if (!dfFull.length) return [];

    const isAvg = metricCol.includes('avg');

    const processRows = (rows) => {
      const map = new Map();
      rows.forEach((row) => {
        const date = row.date;
        if (!date) return;

        const rawVal = row[metricCol];
        const val = Number(rawVal);
        const isValid = rawVal !== null && rawVal !== undefined && !isNaN(val);

        if (!map.has(date)) {
          map.set(date, { sum: 0, count: 0 });
        }

        if (isValid) {
          const entry = map.get(date);
          entry.sum += val;
          entry.count += 1;
        }
      });
      return map;
    };

    const fullMap = processRows(dfFull);
    const filteredMap = processRows(dfFiltered);

    const allDates = Array.from(new Set([...fullMap.keys()])).sort((a, b) => {
      const [y1, m1, d1] = a.split('T')[0].split('-').map(Number);
      const [y2, m2, d2] = b.split('T')[0].split('-').map(Number);
      return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
    });

    return allDates.map((date) => {
      const fullEntry = fullMap.get(date);
      const filteredEntry = filteredMap.get(date);

      let baseline = 0;
      if (fullEntry && fullEntry.count > 0) {
        baseline = isAvg ? fullEntry.sum / fullEntry.count : fullEntry.sum;
      }

      let active = null;
      if (filteredEntry && filteredEntry.count > 0) {
        active = isAvg ? filteredEntry.sum / filteredEntry.count : filteredEntry.sum;
      }

      return {
        date,
        baseline,
        active,
      };
    });
  }, [dfFull, dfFiltered, metricCol]);
}