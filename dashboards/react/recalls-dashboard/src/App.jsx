import React, { useState, useEffect, useMemo } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { DIMENSION_FILTERS, METRICS_CONFIG } from './constants/dashboardConfig';
import { KpiSparkline } from './components/KpiSparkline';
import { TrendChart } from './components/TrendChart';
import { DrilldownTable } from './components/DrilldownTable';
import { SegmentedTable } from './components/SegmentedTable';
import { toISODate } from './utils/formatters';
import { Sidebar } from './components/Sidebar';


export default function DashboardPage() {
  const {
    loading,
    rawData,
    filteredData,
    dimFilteredDf,
    fullyFilteredDf,
    minDataDate,
    maxDataDate,
    startDate,
    endDate,
    preset,
    setPreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dimensionFilters,
    setDimensionFilters,
    handleDimensionChange,
    handleResetFilters,
    activeMetricCol,
    setActiveMetricCol,
    selectedChartDate,
    setSelectedChartDate,
    isSidebarOpen,
    setIsSidebarOpen,
    availableOptions,
  } = useDashboardData();

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard data...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#F8FAFC' }}>
      
      <Sidebar
      isOpen={isSidebarOpen}
      onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      preset={preset}
      setPreset={setPreset}
      customStartDate={customStartDate}
      setCustomStartDate={setCustomStartDate}
      customEndDate={customEndDate}
      setCustomEndDate={setCustomEndDate}
      minDataDate={minDataDate}
      maxDataDate={maxDataDate}
      dimensionFilters={dimensionFilters}
      handleDimensionChange={handleDimensionChange}
      availableOptions={availableOptions}
      onResetFilters={handleResetFilters}
    />

      {/* =================================================================== */}
      {/* MAIN DASHBOARD CONTENT AREA                                        */}
      {/* =================================================================== */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.75rem', color: '#0F172A' }}>GLOBAL FOOD RECALLS</h1>
          <div style={{ fontSize: '0.9rem', color: '#64748B' }}>
            <span style={{ fontWeight: 600 }}>MONTHLY FOOD ENFORCEMENT DATA |</span> ROLLING 10 YEARS
          </div>
        </div>

        {/* Row 1: KPI Cards + Sparklines */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {METRICS_CONFIG.map(({ key, label }) => (
            <KpiSparkline
              dfFull={dimFilteredDf}
              dfFiltered={fullyFilteredDf}
              metricCol={key}
              title={label}
              startDate={startDate}
              endDate={endDate}
            />
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
          {selectedChartDate ? (
            <DrilldownTable
              dfFiltered={dimFilteredDf}
              selectedDate={selectedChartDate}
              onClearSelection={() => setSelectedChartDate(null)}
            />
          ) : (
            <div style={{ 
              padding: '24px', 
              textAlign: 'center', 
              backgroundColor: '#F8FAFC', 
              borderRadius: '6px', 
              border: '1px dashed #CBD5E1',
              color: '#64748B',
              fontSize: '0.875rem' 
            }}>
              💡 Click any data point on the trend chart above to inspect underlying records for that month.
            </div>
          )}
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