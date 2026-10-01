import { toISODate } from './formatters';

export const resolveBounds = (subset, fallbackMin = '', fallbackMax = '') => {
  if (!subset || !subset.length) {
    return { startDate: fallbackMin, endDate: fallbackMax };
  }
  
  const timestamps = subset
    .map((d) => new Date(d.date).getTime())
    .filter((t) => !isNaN(t));

  if (!timestamps.length) {
    return { startDate: fallbackMin, endDate: fallbackMax };
  }

  return {
    startDate: toISODate(new Date(Math.min(...timestamps))),
    endDate: toISODate(new Date(Math.max(...timestamps))),
  };
};