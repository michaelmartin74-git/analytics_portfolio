import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { useTrendChartData } from '../hooks/useTrendChartData';
import { parseLocalDate, formatMetricValue } from '../utils/formatters';

export function TrendChart({
  dfFull = []
  , dfFiltered = []
  , metricCol
  , startDate
  , endDate
  , onPointSelect 
  , metricsConfig
  , onMetricChange
}) {
  
  const chartData = useTrendChartData({ dfFull, dfFiltered, metricCol });

  const handleClick = (state) => {
    const clickedDate = state?.activeLabel || state?.activePayload?.[0]?.payload?.date;
    if (clickedDate && onPointSelect) {
      onPointSelect(clickedDate);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        marginBottom: '24px',
      }}
    >
      {/* Header Row: Label & Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#64748B',
            letterSpacing: '0.05em',
          }}
        >
          HISTORICAL TREND ANALYSIS
        </span>
        
        {metricsConfig.length > 0 && (
          <select
            value={metricCol}
            onChange={(e) => onMetricChange?.(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              fontSize: '0.85rem',
            }}
          >
            {metricsConfig.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>
      {/* Actual Chart Visual */} 
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
              onClick={(entry) => {
                if (entry?.payload?.date && onPointSelect) {
                  onPointSelect(entry.payload.date);
                }
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}