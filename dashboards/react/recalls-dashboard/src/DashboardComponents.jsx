import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Helper for formatting numeric metrics cleanly
const formatMetricValue = (val, metricKey) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (metricKey.includes('avg')) return Number(val).toFixed(1);
  return Math.round(val).toLocaleString();
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Helper for Date Parsing
const parseLocalDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  
  // Handles "2026-01-01" or "2026-01-01T00:00:00" without UTC shift
  const [datePart] = String(dateInput).split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  
  if (!year || !month) return new Date(dateInput);
  return new Date(year, month - 1, day || 1);
};

// ==============================================================================
// 1. KPI CARD WITH SPARKLINE
// ==============================================================================
export function KpiSparkline({ dfFull = [], dfFiltered = [], metricCol, title, startDate, endDate }) {
  const { currentTotal, sparklineData } = useMemo(() => {
    if (!dfFull.length) {
      return { currentTotal: 0, sparklineData: [] };
    }

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    const isAvg = metricCol.includes('avg');

    // Create a Set of valid filtered dates/keys for fast lookup to mirror TrendChart logic
    const filteredDateSet = new Set(
      dfFiltered.map((r) => r.date).filter(Boolean)
    );

    // Group ALL historical data by Year-Month
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

    // Current period KPI Value (Sum vs True Average)
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

  const dateRangeText = startDate && endDate 
    ? `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}` 
    : '';

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center' }}>
      {/* Left 33%: KPI Info */}
      <div style={{ flex: '0 0 33%', paddingRight: '8px', boxSizing: 'border-box', minWidth: 0 }}>
        <div style={{ 
          fontSize: '0.7rem', 
          color: '#64748B', 
          fontWeight: 500, 
          textTransform: 'uppercase', 
          lineHeight: 1.2,
          wordBreak: 'break-word',
          hyphens: 'auto'
        }}>
          {title}
        </div>

        <div style={{ marginTop: '4px' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
            {formatMetricValue(currentTotal, metricCol)}
          </span>
        </div>

        {dateRangeText && (
          <div 
            style={{ 
              fontSize: '0.65rem', 
              color: '#94A3B8', 
              marginTop: '2px', 
              lineHeight: 1.1,
              wordBreak: 'break-word'
            }}
          >
            {dateRangeText}
          </div>
        )}
      </div>

      {/* Right 67%: Sparkline */}
      <div style={{ flex: '0 0 67%', height: '100%', minHeight: '48px', minWidth: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-filtered-${metricCol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const displayVal = data.valFiltered !== null ? data.valFiltered : data.valFull;
                    return (
                      <div style={{ backgroundColor: '#1E293B', color: '#FFF', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                        <div>{data.displayDate}</div>
                        <div style={{ fontWeight: 700 }}>{formatMetricValue(displayVal, metricCol)}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="valFull"
                stroke="#94A3B8"
                strokeWidth={1.5}
                fill="#F1F5F9"
                fillOpacity={0.5}
                isAnimationActive={false}
              />

              <Area
                type="monotone"
                dataKey="valFiltered"
                stroke="#2563EB"
                strokeWidth={2}
                fill={`url(#grad-filtered-${metricCol})`}
                fillOpacity={1}
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 2. MAIN TREND CHART
// ==============================================================================
export function TrendChart({ dfFull, dfFiltered, metricCol, startDate, endDate, onPointSelect }) {
  const chartData = useMemo(() => {
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

  const handleClick = (state) => {
    if (state && state.activePayload && state.activePayload.length) {
      const clickedDate = state.activePayload[0].payload.date;
      if (onPointSelect) onPointSelect(clickedDate);
    }
  };

  return (
    <div style={{ width: '100%', height: '320px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} onClick={handleClick} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} dy={5} />
          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
          
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const activeVal = data.active !== null ? data.active : data.baseline;

                // Format raw string date into "Mon YYYY"
                const d = parseLocalDate(data.date);
                const formattedDate = d && !isNaN(d.getTime()) 
                  ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : data.date;

                return (
                  <div style={{ backgroundColor: '#1E293B', color: '#FFF', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                    <div>{formattedDate}</div>
                    <div style={{ fontWeight: 700 }}>{formatMetricValue(activeVal, metricCol)}</div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Line
            type="monotone"
            dataKey="baseline"
            name="Dimension Slice (Full Timeline)"
            stroke="#CBD5E1"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="active"
            name="Selected Timeframe"
            stroke="#2563EB"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#2563EB' }}
            activeDot={{ r: 6, cursor: 'pointer' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==============================================================================
// 3. DRILLDOWN DETAIL TABLE
// ==============================================================================
export function DrilldownTable({ dfFiltered, selectedDate, onClearSelection }) {
  const [page, setPage] = useState(0);
  const pageSize = 8;

  const filteredRecords = useMemo(() => {
    if (!selectedDate) return dfFiltered;
    return dfFiltered.filter((r) => r.date === selectedDate);
  }, [dfFiltered, selectedDate]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = page * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em' }}>
            RECORD DRILLDOWN DETAIL
          </span>
          {selectedDate && (
            <span style={{ fontSize: '0.8rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Filtered Date: {selectedDate}
            </span>
          )}
        </div>
        {selectedDate && (
          <button
            onClick={onClearSelection}
            style={{ fontSize: '0.75rem', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear Date Selection
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
              <th style={{ padding: '8px' }}>Date</th>
              <th style={{ padding: '8px' }}>Class</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>Recalling Firm</th>
              <th style={{ padding: '8px' }}>Reason Category</th>
              <th style={{ padding: '8px' }}>State</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Recalls</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', color: '#1E293B' }}>
                  <td style={{ padding: '8px' }}>{row.date}</td>
                  <td style={{ padding: '8px' }}>{row.class || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.status || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.recalling_firm || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.reason_category || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.geo_state || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{row.recalls ?? 1}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                  No drilldown records match the selected parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.8rem', color: '#64748B' }}>
        <span>
          Showing {filteredRecords.length ? page * pageSize + 1 : 0} to {Math.min((page + 1) * pageSize, filteredRecords.length)} of {filteredRecords.length} records
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFF', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFF', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 4. YEAR OVER MONTH MATRIX (SEGMENTED TABLE)
// ==============================================================================
export function SegmentedTable({ dfFiltered, metricCol }) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const { matrix, years, maxVal } = useMemo(() => {
    const grid = {};
    const yearSet = new Set();
    let max = 0;

    dfFiltered.forEach((row) => {
      if (!row.date) return;
      const d = new Date(row.date);
      if (isNaN(d)) return;

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
  }, [dfFiltered, metricCol]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>Year</th>
            {MONTHS.map((m) => (
              <th key={m} style={{ padding: '8px' }}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.length > 0 ? (
            years.map((yr) => (
              <tr key={yr} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '8px', fontWeight: 700, textAlign: 'left', color: '#0F172A' }}>{yr}</td>
                {matrix[yr].map((val, idx) => {
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  const bgAlpha = (intensity * 0.35).toFixed(2);
                  return (
                    <td
                      key={idx}
                      style={{
                        padding: '8px',
                        backgroundColor: val > 0 ? `rgba(37, 99, 235, ${bgAlpha})` : 'transparent',
                        color: val > 0 ? '#0F172A' : '#94A3B8',
                        fontWeight: val > 0 ? 600 : 400,
                      }}
                    >
                      {val > 0 ? formatMetricValue(val, metricCol) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={13} style={{ padding: '20px', color: '#94A3B8' }}>
                No matrix data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}