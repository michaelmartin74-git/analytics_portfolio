import React from 'react';
import { useSeasonalityMatrix, MONTHS } from '../hooks/useSeasonalityMatrix';

// Adjust path if formatMetricValue lives elsewhere (e.g., '../utils/formatters')
import { formatMetricValue } from '../utils/formatters';

export function SegmentedTable({ dfFull = [], metricCol, startDate, endDate }) {
  const {
    viewMode,
    setViewMode,
    matrix,
    years,
    maxVal,
    getMomGrowth,
    isCellInRange,
  } = useSeasonalityMatrix(dfFull, metricCol, startDate, endDate);

  return (
    <div>
      {/* View Mode Toggle Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em' }}>
          SEASONALITY MATRIX ({viewMode === 'totals' ? 'TOTALS' : 'M/M GROWTH'})
        </span>
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
          <button
            onClick={() => setViewMode('totals')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: viewMode === 'totals' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'totals' ? '#0F172A' : '#64748B',
              boxShadow: viewMode === 'totals' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            Totals
          </button>
          <button
            onClick={() => setViewMode('mom')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: viewMode === 'mom' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'mom' ? '#0F172A' : '#64748B',
              boxShadow: viewMode === 'mom' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            M/M Growth
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Year</th>
              {MONTHS.map((m) => (
                <th key={m} style={{ padding: '8px' }}>{m}</th>
              ))}
              <th style={{ padding: '8px', borderLeft: '1px solid #E2E8F0', fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {years.length > 0 ? (
              years.map((yr) => {
                const annualTotal = matrix[yr].reduce((sum, v) => sum + v, 0);

                return (
                  <tr key={yr} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px', fontWeight: 700, textAlign: 'left', color: '#0F172A' }}>{yr}</td>
                    {matrix[yr].map((val, idx) => {
                      const isInRange = isCellInRange(yr, idx);
                      const momGrowth = getMomGrowth(yr, idx, val);

                      // Heatmap background calculation
                      const intensity = maxVal > 0 ? val / maxVal : 0;
                      const bgAlpha = (intensity * 0.35).toFixed(2);
                      const bgColor = isInRange && val > 0
                        ? `rgba(37, 99, 235, ${bgAlpha})`
                        : 'transparent';

                      return (
                        <td
                          key={idx}
                          style={{
                            padding: '8px',
                            backgroundColor: bgColor,
                            color: isInRange ? '#0F172A' : '#94A3B8',
                            fontWeight: isInRange && val > 0 ? 600 : 400,
                          }}
                        >
                          {viewMode === 'totals' ? (
                            val > 0 ? formatMetricValue(val, metricCol) : '-'
                          ) : (
                            momGrowth !== null ? (
                              <span style={{ color: momGrowth >= 0 ? '#16A34A' : '#DC2626' }}>
                                {momGrowth > 0 ? `+${momGrowth.toFixed(1)}%` : `${momGrowth.toFixed(1)}%`}
                              </span>
                            ) : '-'
                          )}
                        </td>
                      );
                    })}

                    {/* Annual Row Total */}
                    <td
                      style={{
                        padding: '8px',
                        fontWeight: 700,
                        color: '#0F172A',
                        borderLeft: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                      }}
                    >
                      {annualTotal > 0 ? formatMetricValue(annualTotal, metricCol) : '-'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={14} style={{ padding: '20px', color: '#94A3B8' }}>
                  No matrix data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}