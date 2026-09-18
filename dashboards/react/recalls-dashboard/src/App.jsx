import React, { useState, useEffect, useMemo } from 'react';
import {
  KpiSparkline,
  TrendChart,
  SegmentedTable,
  DrilldownTable,
} from './DashboardComponents';

// ==============================================================================
// 1. CONFIGURATION & CONSTANTS
// ==============================================================================
const DIMENSION_FILTERS = [
  { key: 'class', label: 'Class' },
  { key: 'status', label: 'Status' },
  { key: 'reason_category', label: 'Reason Category' },
  { key: 'recalling_firm', label: 'Recalling Firm' },
  { key: 'geo_state', label: 'Geo State' },
  { key: 'geo_city', label: 'Geo City' },
];

const METRICS_CONFIG = [
  { key: 'recalls', label: 'Total Recalls' },
  { key: 'firms', label: 'Affected Firms' },
  { key: 'avg_init_to_class_days', label: 'Avg Init-to-Class (Days)' },
  { key: 'avg_class_to_term_days', label: 'Avg Class-to-Term (Days)' },
];

// Helper to convert JS Date to YYYY-MM-DD
const toISODate = (d) => d.toISOString().split('T')[0];

export default function DashboardPage() {
  // Raw JSON dataset fetched from API/static file
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [preset, setPreset] = useState('Current Year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dimensionFilters, setDimensionFilters] = useState({
    class: 'All',
    status: 'All',
    reason_category: 'All',
    recalling_firm: 'All',
    geo_state: 'All',
    geo_city: 'All',
  });

  // UI Interactive States
  const [activeMetricCol, setActiveMetricCol] = useState('recalls');
  const [selectedChartDate, setSelectedChartDate] = useState(null);

  // Sidebar Show/Hide Feature
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ==============================================================================
  // 2. DATA FETCHING (Simulates Streamlit Parquet/DuckDB Loader)
  // ==============================================================================
useEffect(() => {
  // Relative URL path — works locally AND on a live public website
  fetch('/data/agg_recalls_data.json')
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      setRawData(data);
      setLoading(false);
    })
    .catch((err) => {
      console.error('Error loading static JSON dataset:', err);
      setLoading(false);
    });
}, []);

  // Global Date Bounds calculated from full dataset
  const { minDataDate, maxDataDate } = useMemo(() => {
    if (!rawData.length) return { minDataDate: '', maxDataDate: '' };
    const dates = rawData.map((d) => new Date(d.date)).filter((d) => !isNaN(d));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    return { minDataDate: toISODate(min), maxDataDate: toISODate(max) };
  }, [rawData]);

  // ==============================================================================
  // 3. DATE RANGE PRESET LOGIC
  // ==============================================================================
  const { startDate, endDate } = useMemo(() => {
    if (!rawData.length) return { startDate: '', endDate: '' };

    const resolveBounds = (subset) => {
      if (!subset.length) return { startDate: minDataDate, endDate: maxDataDate };
      const dates = subset.map((d) => new Date(d.date));
      return {
        startDate: toISODate(new Date(Math.min(...dates))),
        endDate: toISODate(new Date(Math.max(...dates))),
      };
    };

    switch (preset) {
      case 'Last Month':
        return resolveBounds(rawData.filter((d) => d.months_ago === 1));
      case 'Last 6 Months':
        return resolveBounds(
          rawData.filter((d) => d.months_ago >= 1 && d.months_ago <= 6)
        );
      case 'Current Year':
        return resolveBounds(rawData.filter((d) => d.years_ago === 0));
      case 'Last Year':
        return resolveBounds(rawData.filter((d) => d.years_ago === 1));
      case 'All Time':
        return { startDate: minDataDate, endDate: maxDataDate };
      case 'Custom':
        return {
          startDate: customStartDate || minDataDate,
          endDate: customEndDate || maxDataDate,
        };
      default:
        return resolveBounds(rawData.filter((d) => d.years_ago === 0));
    }
  }, [preset, rawData, minDataDate, maxDataDate, customStartDate, customEndDate]);

  // ==============================================================================
  // 4. DYNAMIC CROSS-FILTERING PIPELINE
  // ==============================================================================
  
  // Baseline temporal slice used for populating dropdown options
  const baseDateSlice = useMemo(() => {
    if (!startDate || !endDate) return rawData;
    const s = new Date(startDate);
    const e = new Date(endDate);
    return rawData.filter((row) => {
      const d = new Date(row.date);
      return d >= s && d <= e;
    });
  }, [rawData, startDate, endDate]);

  // Dynamic dropdown options calculated using "All-But-Self" subset
  const availableOptions = useMemo(() => {
    const optionsMap = {};

    DIMENSION_FILTERS.forEach(({ key }) => {
      let subset = baseDateSlice;

      // Filter against all ACTIVE selections EXCEPT the current column
      Object.keys(dimensionFilters).forEach((otherKey) => {
        if (otherKey !== key && dimensionFilters[otherKey] !== 'All') {
          subset = subset.filter((row) => row[otherKey] === dimensionFilters[otherKey]);
        }
      });

      const uniqueVals = Array.from(
        new Set(subset.map((row) => row[key]).filter(Boolean))
      ).sort();

      optionsMap[key] = ['All', ...uniqueVals];
    });

    return optionsMap;
  }, [baseDateSlice, dimensionFilters]);

  // Layer 1: Apply attribute filters across full timeframe (preserves baseline gray lines)
  const dimFilteredDf = useMemo(() => {
    return rawData.filter((row) => {
      return Object.entries(dimensionFilters).every(([col, val]) => {
        return val === 'All' || row[col] === val;
      });
    });
  }, [rawData, dimensionFilters]);

  // Layer 2: Slice filtered attributes down to selected temporal range
  const fullyFilteredDf = useMemo(() => {
    if (!startDate || !endDate) return dimFilteredDf;
    const s = new Date(startDate);
    const e = new Date(endDate);
    return dimFilteredDf.filter((row) => {
      const d = new Date(row.date);
      return d >= s && d <= e;
    });
  }, [dimFilteredDf, startDate, endDate]);

  // Handlers
  const handleDimensionChange = (key, value) => {
    setDimensionFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setPreset('Current Year');
    setCustomStartDate(minDataDate);
    setCustomEndDate(maxDataDate);
    setDimensionFilters({
      class: 'All',
      status: 'All',
      reason_category: 'All',
      recalling_firm: 'All',
      geo_state: 'All',
      geo_city: 'All',
    });
    setSelectedChartDate(null);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard data...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#F8FAFC' }}>
      
      {/* =================================================================== */}
      {/* SIDEBAR & INTERACTIVE FILTERS                                      */}
      {/* =================================================================== */}
      
      {/* Toggle Button (Always Visible) */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{
          position: 'absolute',
          top: '25px',
          left: '5px',
          zIndex: 10,
          padding: '3px 3px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
        }}
      >
        {isSidebarOpen ? '✕' : "⚙️"}
      </button>
      
      {/* Conditional Sidebar */}
      {isSidebarOpen && (
        <aside style={{ width: '200px', backgroundColor: '#ffffff', padding: '20px 20px 20px 30px', borderRight: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A' }}>Filters</h3>
            <button
              onClick={handleResetFilters}
              style={{
                padding: '4px 10px',
                fontSize: '0.8rem',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          </div>

          {/* Date Preset Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Date Range Preset
            </label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
            >
              {['Last Month', 'Last 6 Months', 'Current Year', 'Last Year', 'Custom', 'All Time'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Custom Date Inputs */}
            {preset === 'Custom' && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="date"
                  value={customStartDate || minDataDate}
                  min={minDataDate}
                  max={maxDataDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ width: '100%', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                />
                <input
                  type="date"
                  value={customEndDate || maxDataDate}
                  min={minDataDate}
                  max={maxDataDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ width: '100%', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                />
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '20px 0' }} />

          {/* Dimension Selectboxes */}
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#0F172A' }}>Dimension Filters</h4>
          {DIMENSION_FILTERS.map(({ key, label }) => {
            const options = availableOptions[key] || ['All'];
            const currentValue = options.includes(dimensionFilters[key]) ? dimensionFilters[key] : 'All';

            return (
              <div key={key} style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>
                  {label}
                </label>
                <select
                  value={currentValue}
                  onChange={(e) => handleDimensionChange(key, e.target.value)}
                  style={{ width: '100%', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.85rem' }}
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </aside>
      )}

      {/* =================================================================== */}
      {/* MAIN DASHBOARD CONTENT AREA                                        */}
      {/* =================================================================== */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.75rem', color: '#0F172A' }}>Global Food Recalls</h1>
          <div style={{ fontSize: '0.9rem', color: '#64748B' }}>
            Monthly Food Enforcement Data | <span style={{ fontWeight: 600 }}>Rolling 10 Years</span>
          </div>
        </div>

        {/* Row 1: KPI Cards + Sparklines */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {METRICS_CONFIG.map(({ key, label }) => (
            <div key={key} style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <KpiSparkline
                dfFull={dimFilteredDf}
                dfFiltered={fullyFilteredDf}
                metricCol={key}
                title={label}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          ))}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />

        {/* Row 2: Trend Line Chart */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em' }}>
              HISTORICAL TREND ANALYSIS
            </span>
            <select
              value={activeMetricCol}
              onChange={(e) => setActiveMetricCol(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.85rem' }}
            >
              {METRICS_CONFIG.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <TrendChart
            dfFull={dimFilteredDf}
            dfFiltered={fullyFilteredDf}
            metricCol={activeMetricCol}
            startDate={startDate}
            endDate={endDate}
            onPointSelect={(date) => setSelectedChartDate(date)}
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />

        {/* Row 3: Drill-Down Detail Table */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
          <DrilldownTable
            dfFiltered={dimFilteredDf}
            selectedDate={selectedChartDate}
            onClearSelection={() => setSelectedChartDate(null)}
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />

        {/* Row 4: Year x Month Matrix */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em' }}>
              YEAR OVER MONTH MATRIX
            </span>
          </div>

          <SegmentedTable
            dfFull={dimFilteredDf}
            dfFiltered={fullyFilteredDf}
            metricCol={activeMetricCol}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Footer Metadata */}
        <div style={{ fontSize: '0.8rem', color: '#94A3B8', textAlign: 'center', marginTop: '32px' }}>
          Last refresh date of data: {maxDataDate}
        </div>
      </main>
    </div>
  );
}