import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { useKpiData } from '../hooks/useKpiData';
import { formatDateLabel, formatMetricValue } from '../utils/formatters';

export function KpiSparkline({ dfFull = [], dfFiltered = [], metricCol, title, startDate, endDate }) {
  const { currentTotal, sparklineData } = useKpiData({ dfFull, dfFiltered, metricCol, startDate, endDate });

  const dateRangeText = startDate && endDate 
    ? `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}` 
    : '';

  return (
      <div 
        style={{ 
          backgroundColor: '#FFFFFF', 
          padding: '16px', 
          borderRadius: '8px', 
          border: '1px solid #E2E8F0',
          display: 'flex', 
          width: '100%', 
          height: '100%', 
          alignItems: 'center',
          boxSizing: 'border-box'
        }}
      >
      {/* Left 33%: KPI Info */}
      <div style={{ flex: '0 0 33%', paddingRight: '8px', boxSizing: 'border-box', minWidth: 0 }}>
        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', lineHeight: 1.2, wordBreak: 'break-word', hyphens: 'auto' }}>
          {title}
        </div>

        <div style={{ marginTop: '4px' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
            {formatMetricValue(currentTotal, metricCol)}
          </span>
        </div>

        {dateRangeText && (
          <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '2px', lineHeight: 1.1, wordBreak: 'break-word' }}>
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