// // import React, { useState, useMemo } from 'react';
// // import Plotly from 'plotly.js-dist-min';
// // import createPlotlyComponent from 'react-plotly.js/factory';

// // // Handle CommonJS/ESM interop quirks in Vite
// // const PlotlyLib = Plotly.purge ? Plotly : Plotly.default || Plotly;
// // const Plot = createPlotlyComponent(React, PlotlyLib);

// //import React, { useState, useMemo } from 'react';
// import React, { useState, useMemo, lazy, Suspense } from 'react';

// // 1. Dynamically resolve Plotly before building the component wrapper
// const PlotlyComponent = lazy(async () => {
//   const [ReactModule, PlotlyModule, FactoryModule] = await Promise.all([
//     import('react'),
//     import('plotly.js-dist-min'),
//     import('react-plotly.js/factory'),
//   ]);

//   const ReactLib = ReactModule.default || ReactModule;
//   const createPlotComponent = FactoryModule.default || FactoryModule;

//   let PlotlyObj = PlotlyModule.default || PlotlyModule;
//   if (PlotlyObj.default && typeof PlotlyObj.default.purge === 'function') {
//     PlotlyObj = PlotlyObj.default;
//   }

//   return {
//     default: createPlotComponent(ReactLib, PlotlyObj),
//   };
// });

// // 2. Define the unified Plot component used across KpiSparkline & TrendChart
// const Plot = (props) => (
//   <Suspense fallback={<div style={{ height: props.layout?.height || 200 }} />}>
//     <PlotlyComponent {...props} />
//   </Suspense>
// );

// // ==============================================================================
// // HELPER UTILITIES
// // ==============================================================================
// // ==============================================================================
// // HELPER UTILITIES (JS Equivalents of pandas Data Processing)
// // ==============================================================================

// function prepareTimeSeries(data, metricCol) {
//   if (!data || data.length === 0) return [];

//   const isAvg = metricCol.includes('avg');
//   const aggregated = {};

//   data.forEach((row) => {
//     if (!row.date || row[metricCol] == null) return;
//     const dateStr = new Date(row.date).toISOString().split('T')[0];

//     if (!aggregated[dateStr]) {
//       aggregated[dateStr] = { sum: 0, count: 0 };
//     }
//     aggregated[dateStr].sum += Number(row[metricCol]);
//     aggregated[dateStr].count += 1;
//   });

//   return Object.keys(aggregated)
//     .sort()
//     .map((dateStr) => ({
//       date: dateStr,
//       value: isAvg
//         ? aggregated[dateStr].sum / aggregated[dateStr].count
//         : aggregated[dateStr].sum,
//     }));
// }

// function formatDate(dateObj, format = 'short') {
//   if (!dateObj) return '';
//   const d = new Date(dateObj);
//   if (format === 'monthYear') {
//     return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
//   }
//   return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
// }

// // ==============================================================================
// // PUBLIC RENDERING COMPONENTS
// // ==============================================================================

// /**
//  * 1. KPI Sparkline Component
//  */
// export function KpiSparkline({
//   dfFull = [],
//   dfFiltered = [],
//   metricCol,
//   title,
//   startDate,
//   endDate,
// }) {
//   const chartFull = useMemo(() => prepareTimeSeries(dfFull, metricCol), [dfFull, metricCol]);
//   const chartHighlight = useMemo(() => prepareTimeSeries(dfFiltered, metricCol), [dfFiltered, metricCol]);

//   const currentValue = useMemo(() => {
//     if (!dfFiltered || dfFiltered.length === 0) return 0;
//     const isAvg = metricCol.includes('avg');
//     const total = dfFiltered.reduce((sum, row) => sum + (Number(row[metricCol]) || 0), 0);
//     return isAvg ? total / dfFiltered.length : total;
//   }, [dfFiltered, metricCol]);

//   const timeframeStr = `${formatDate(startDate, 'monthYear')} - ${formatDate(endDate, 'monthYear')}`;

//   const customHoverTemplate = '<b>%{x}</b>: %{y:,.0f}<extra></extra>';

//   return (
//     <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: 'sans-serif' }}>
//       {/* KPI Text Column */}
//       <div style={{ flex: '1' }}>
//         <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>{title}</div>
//         <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A' }}>
//           {currentValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
//         </div>
//         <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{timeframeStr}</div>
//       </div>

//       {/* Sparkline Chart Column */}
//       <div style={{ flex: '2', height: '40px' }}>
//         <Plot
//           data={[
//             {
//               x: chartFull.map((d) => d.date),
//               y: chartFull.map((d) => d.value),
//               mode: 'lines+markers',
//               marker: { size: 4, opacity: 0 },
//               line: { color: '#CBD5E1', width: 1.5 },
//               hovertemplate: customHoverTemplate,
//               type: 'scatter',
//             },
//             {
//               x: chartHighlight.map((d) => d.date),
//               y: chartHighlight.map((d) => d.value),
//               mode: 'lines+markers',
//               marker: { size: 4, opacity: 0 },
//               line: { color: '#2563EB', width: 2.0 },
//               hovertemplate: customHoverTemplate,
//               type: 'scatter',
//             },
//           ]}
//           layout={{
//             margin: { l: 0, r: 0, t: 0, b: 0 },
//             height: 40,
//             paper_bgcolor: 'rgba(0,0,0,0)',
//             plot_bgcolor: 'rgba(0,0,0,0)',
//             showlegend: false,
//             xaxis: { visible: false, fixedrange: true },
//             yaxis: { visible: false, fixedrange: true },
//             hovermode: 'x',
//           }}
//           config={{ displayModeBar: false, responsive: true }}
//           style={{ width: '100%', height: '100%' }}
//         />
//       </div>
//     </div>
//   );
// }

// /**
//  * 2. Main Trend Line Chart Component
//  */
// export function TrendChart({
//   dfFull = [],
//   dfFiltered = [],
//   metricCol,
//   startDate,
//   endDate,
//   onPointSelect,
// }) {
//   const chartFull = useMemo(() => prepareTimeSeries(dfFull, metricCol), [dfFull, metricCol]);
//   const chartHighlight = useMemo(() => prepareTimeSeries(dfFiltered, metricCol), [dfFiltered, metricCol]);

//   const startDt = new Date(startDate);
//   const endDt = new Date(endDate);

//   const baselineHoverControl = useMemo(() => {
//     return chartFull.map((d) => {
//       const dt = new Date(d.date);
//       return dt >= startDt && dt <= endDt ? 'none' : 'all';
//     });
//   }, [chartFull, startDt, endDt]);

//   const handlePlotClick = (event) => {
//     if (event.points && event.points.length > 0) {
//       const clickedX = event.points[0].x;
//       if (onPointSelect) onPointSelect(clickedX);
//     }
//   };

//   return (
//     <div style={{ width: '100%', height: '250px' }}>
//       <Plot
//         data={[
//           {
//             x: chartFull.map((d) => d.date),
//             y: chartFull.map((d) => d.value),
//             mode: 'lines+markers',
//             marker: { size: 4, opacity: 0 },
//             line: { color: '#CBD5E1', width: 1.5 },
//             hovertemplate: '<b>%{x}</b>: %{y:,.0f}<extra></extra>',
//             hoverinfo: baselineHoverControl,
//             type: 'scatter',
//           },
//           {
//             x: chartHighlight.map((d) => d.date),
//             y: chartHighlight.map((d) => d.value),
//             mode: 'lines+markers',
//             marker: { size: 4, opacity: 0 },
//             line: { color: '#2563EB', width: 2.5 },
//             hovertemplate: '<b>%{x}</b>: %{y:,.0f}<extra></extra>',
//             type: 'scatter',
//           },
//         ]}
//         layout={{
//           height: 250,
//           margin: { l: 40, r: 20, t: 10, b: 30 },
//           paper_bgcolor: 'rgba(0,0,0,0)',
//           plot_bgcolor: 'rgba(0,0,0,0)',
//           showlegend: false,
//           xaxis: { type: 'date', showgrid: false },
//           yaxis: { showgrid: true, gridcolor: '#E2E8F0' },
//         }}
//         config={{ displayModeBar: false, responsive: true }}
//         onClick={handlePlotClick}
//         style={{ width: '100%', height: '100%' }}
//       />
//     </div>
//   );
// }

// /**
//  * 3. Segmented Crosstab / Pivot Table Component
//  */
// export function SegmentedTable({ dfFull = [], metricCol, startDate, endDate }) {
//   const [viewMode, setViewMode] = useState('Total');

//   const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

//   // Aggregate matrix by Year x Month
//   const { years, matrix } = useMemo(() => {
//     if (!dfFull.length) return { years: [], matrix: {} };

//     const isAvg = metricCol.includes('avg');
//     const store = {}; // { '2024': { 1: { sum, count }, ... } }
//     const yearSet = new Set();

//     dfFull.forEach((row) => {
//       if (!row.date || row[metricCol] == null) return;
//       const d = new Date(row.date);
//       const y = d.getFullYear();
//       const m = d.getMonth() + 1;

//       yearSet.add(y);
//       if (!store[y]) store[y] = {};
//       if (!store[y][m]) store[y][m] = { sum: 0, count: 0 };

//       store[y][m].sum += Number(row[metricCol]);
//       store[y][m].count += 1;
//     });

//     const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
//     const calculatedMatrix = {};

//     sortedYears.forEach((y) => {
//       calculatedMatrix[y] = {};
//       for (let m = 1; m <= 12; m++) {
//         const item = store[y]?.[m];
//         if (!item) {
//           calculatedMatrix[y][m] = null;
//         } else {
//           calculatedMatrix[y][m] = isAvg ? item.sum / item.count : item.sum;
//         }
//       }
//     });

//     return { years: sortedYears, matrix: calculatedMatrix };
//   }, [dfFull, metricCol]);

//   // Handle Monthly Growth Calculation
//   const finalMatrix = useMemo(() => {
//     if (viewMode === 'Total') return matrix;

//     const growthMatrix = {};
//     const chronologicalYears = [...years].sort((a, b) => a - b);
//     let prevVal = null;

//     chronologicalYears.forEach((y) => {
//       growthMatrix[y] = {};
//       for (let m = 1; m <= 12; m++) {
//         const currVal = matrix[y][m];
//         if (currVal === null || prevVal === null || prevVal === 0) {
//           growthMatrix[y][m] = null;
//         } else {
//           growthMatrix[y][m] = (currVal - prevVal) / prevVal;
//         }
//         if (currVal !== null) prevVal = currVal;
//       }
//     });

//     return growthMatrix;
//   }, [matrix, years, viewMode]);

//   const startDt = new Date(startDate);
//   const endDt = new Date(endDate);

//   const isHighlighted = (year, monthIdx) => {
//     const cellDate = new Date(year, monthIdx, 1);
//     const startCompare = new Date(startDt.getFullYear(), startDt.getMonth(), 1);
//     return cellDate >= startCompare && cellDate <= endDt;
//   };

//   return (
//     <div style={{ fontFamily: 'sans-serif', margin: '16px 0' }}>
//       <div style={{ marginBottom: '12px' }}>
//         <label style={{ marginRight: '12px', fontWeight: 600 }}>Metric View:</label>
//         <button
//           onClick={() => setViewMode('Total')}
//           style={{
//             marginRight: '8px',
//             padding: '4px 12px',
//             backgroundColor: viewMode === 'Total' ? '#2563EB' : '#E2E8F0',
//             color: viewMode === 'Total' ? '#FFF' : '#0F172A',
//             border: 'none',
//             borderRadius: '4px',
//           }}
//         >
//           Total
//         </button>
//         <button
//           onClick={() => setViewMode('Monthly Growth')}
//           style={{
//             padding: '4px 12px',
//             backgroundColor: viewMode === 'Monthly Growth' ? '#2563EB' : '#E2E8F0',
//             color: viewMode === 'Monthly Growth' ? '#FFF' : '#0F172A',
//             border: 'none',
//             borderRadius: '4px',
//           }}
//         >
//           Monthly Growth
//         </button>
//       </div>

//       <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
//         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
//           <thead>
//             <tr style={{ borderBottom: '2px solid #CBD5E1', backgroundColor: '#F8FAFC' }}>
//               <th style={{ padding: '8px', textAlign: 'left' }}>Year</th>
//               {months.map((m) => (
//                 <th key={m} style={{ padding: '8px' }}>{m}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {years.map((yr) => (
//               <tr key={yr} style={{ borderBottom: '1px solid #E2E8F0' }}>
//                 <td style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>{yr}</td>
//                 {months.map((m, idx) => {
//                   const val = finalMatrix[yr]?.[idx + 1];
//                   const highlighted = isHighlighted(yr, idx);

//                   let cellText = '-';
//                   if (val !== null && val !== undefined) {
//                     cellText =
//                       viewMode === 'Monthly Growth'
//                         ? `${(val * 100).toFixed(1)}%`
//                         : val.toLocaleString('en-US', { maximumFractionDigits: 1 });
//                   }

//                   return (
//                     <td
//                       key={m}
//                       style={{
//                         padding: '8px',
//                         backgroundColor: highlighted ? '#1E3A8A' : 'transparent',
//                         color: highlighted ? '#FFFFFF' : '#0F172A',
//                         fontWeight: highlighted ? 600 : 400,
//                       }}
//                     >
//                       {cellText}
//                     </td>
//                   );
//                 })}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// /**
//  * 4. Drill-Down Detail Table Component
//  */
// export function DrilldownTable({ dfFiltered = [], selectedDate, onClearSelection }) {
//   if (!selectedDate) {
//     return (
//       <div style={{ padding: '12px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px' }}>
//         Click any data point on the trend chart above to inspect underlying records for that month.
//       </div>
//     );
//   }

//   const clickedDt = new Date(selectedDate);
//   const targetYear = clickedDt.getFullYear();
//   const targetMonth = clickedDt.getMonth();

//   const drillRecords = dfFiltered.filter((row) => {
//     if (!row.date) return false;
//     const d = new Date(row.date);
//     return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
//   });

//   const displayCols = [
//     'date', 'recalling_firm', 'class', 'reason_category', 'status',
//     'voluntary_mandated', 'geo_state', 'geo_city', 'geo_country',
//     'recalls', 'skus', 'avg_init_to_class_days',
//     'avg_class_to_term_days', 'avg_init_to_term_days'
//   ];

//   return (
//     <div style={{ fontFamily: 'sans-serif', marginTop: '16px' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
//         <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
//           DRILL-DOWN RECORDS: {formatDate(clickedDt, 'monthYear')} ({drillRecords.length.toLocaleString()} records)
//         </span>
//         <button
//           onClick={onClearSelection}
//           style={{
//             padding: '6px 12px',
//             backgroundColor: '#EF4444',
//             color: '#FFF',
//             border: 'none',
//             borderRadius: '4px',
//             cursor: 'pointer',
//           }}
//         >
//           Clear Selection
//         </button>
//       </div>

//       {drillRecords.length === 0 ? (
//         <div style={{ padding: '12px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '4px' }}>
//           No line-item detail found for this month under the active dimension filters.
//         </div>
//       ) : (
//         <div style={{ overflowX: 'auto', maxHeight: '300px', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
//           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
//             <thead>
//               <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
//                 {displayCols.map((col) => (
//                   <th key={col} style={{ padding: '8px', whiteSpace: 'nowrap' }}>{col}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {drillRecords.map((row, idx) => (
//                 <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
//                   {displayCols.map((col) => (
//                     <td key={col} style={{ padding: '8px', whiteSpace: 'nowrap' }}>
//                       {row[col] != null ? String(row[col]) : '-'}
//                     </td>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }


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

// ==============================================================================
// 1. KPI CARD WITH SPARKLINE
// ==============================================================================
export function KpiSparkline({ dfFull, dfFiltered, metricCol, title, startDate, endDate }) {
  const { currentTotal, percentChange, sparklineData } = useMemo(() => {
    if (!dfFiltered.length) {
      return { currentTotal: 0, percentChange: 0, sparklineData: [] };
    }

    // Sort chronologically
    const sorted = [...dfFiltered].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Aggregate Current Period Total
    const currentTotal = sorted.reduce((acc, row) => acc + (Number(row[metricCol]) || 0), 0);

    // Calculate Prior Period for % Change Comparison
    const s = new Date(startDate);
    const e = new Date(endDate);
    const durationMs = e.getTime() - s.getTime();
    const priorStart = new Date(s.getTime() - durationMs);
    const priorEnd = new Date(s.getTime() - 1);

    const priorSubset = dfFull.filter((row) => {
      const d = new Date(row.date);
      return d >= priorStart && d <= priorEnd;
    });

    const priorTotal = priorSubset.reduce((acc, row) => acc + (Number(row[metricCol]) || 0), 0);

    let percentChange = 0;
    if (priorTotal > 0) {
      percentChange = ((currentTotal - priorTotal) / priorTotal) * 100;
    }

    // Prepare Sparkline Series
    const sparklineData = sorted.map((d) => ({
      date: d.date,
      value: Number(d[metricCol]) || 0,
    }));

    return { currentTotal, percentChange, sparklineData };
  }, [dfFull, dfFiltered, metricCol, startDate, endDate]);

  const isPositive = percentChange >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A' }}>
            {formatMetricValue(currentTotal, metricCol)}
          </span>
          {startDate && endDate && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isPositive ? '#16A34A' : '#DC2626',
              }}
            >
              {isPositive ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`}
            </span>
          )}
        </div>
      </div>

      <div style={{ height: '40px', marginTop: '12px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData}>
            <defs>
              <linearGradient id={`grad-${metricCol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2563EB"
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#grad-${metricCol})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
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

    // Map full baseline data
    const fullMap = new Map();
    dfFull.forEach((row) => {
      const val = Number(row[metricCol]) || 0;
      fullMap.set(row.date, (fullMap.get(row.date) || 0) + val);
    });

    // Map time-sliced active data
    const filteredMap = new Map();
    dfFiltered.forEach((row) => {
      const val = Number(row[metricCol]) || 0;
      filteredMap.set(row.date, (filteredMap.get(row.date) || 0) + val);
    });

    // Combine timeline
    const allDates = Array.from(new Set([...fullMap.keys()])).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    return allDates.map((date) => ({
      date,
      baseline: fullMap.get(date) || 0,
      active: filteredMap.get(date) ?? null, // Null prevents line rendering out of date bounds
    }));
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
            contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
            labelStyle={{ fontWeight: 600, color: '#0F172A' }}
          />
          {/* Grayed Baseline */}
          <Line
            type="monotone"
            dataKey="baseline"
            name="Dimension Slice (Full Timeline)"
            stroke="#CBD5E1"
            strokeWidth={1.5}
            dot={false}
          />
          {/* Active Highlighted Period */}
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