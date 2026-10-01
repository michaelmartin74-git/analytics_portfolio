// Helper for formatting numeric metrics cleanly
export const formatMetricValue = (val, metricKey) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (metricKey.includes('avg')) return Number(val).toFixed(1);
  return Math.round(val).toLocaleString();
};

// Helper for formatting Date labels
export const formatDateLabel = (dateStr) => {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Helper for Date Parsing
export const parseLocalDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  
  // Handles "2026-01-01" or "2026-01-01T00:00:00" without UTC shift
  const [datePart] = String(dateInput).split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  
  if (!year || !month) return new Date(dateInput);
  return new Date(year, month - 1, day || 1);
};

// Helper to convert JS Date to YYYY-MM-DD
export const toISODate = (d) => {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return dateObj.toISOString().split('T')[0];
};