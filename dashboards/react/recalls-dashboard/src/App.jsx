import React, { useState, useEffect, useMemo } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { DIMENSION_FILTERS, METRICS_CONFIG } from './constants/dashboardConfig';
import { KpiSparkline } from './components/KpiSparkline';
import { TrendChart } from './components/TrendChart';
import { DrilldownTable } from './components/DrilldownTable';
import { SegmentedTable } from './components/SegmentedTable';
import { SectionDivider } from './components/SectionDivider';
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
              key={key}
              dfFull={dimFilteredDf}
              dfFiltered={fullyFilteredDf}
              metricCol={key}
              title={label}
              startDate={startDate}
              endDate={endDate}
            />

          ))}
        </div>

        <SectionDivider />

        {/* Row 2: Trend Line Chart */}
        <TrendChart
          dfFull={dimFilteredDf}
          dfFiltered={fullyFilteredDf}
          metricCol={activeMetricCol}
          onMetricChange={setActiveMetricCol}
          metricsConfig={METRICS_CONFIG}
          startDate={startDate}
          endDate={endDate}
          onPointSelect={(date) => setSelectedChartDate(date)}
        />

        <SectionDivider />

        {/* Row 3: Drill-Down Detail Table */}
        <DrilldownTable
          dfFiltered={dimFilteredDf}
          selectedDate={selectedChartDate}
          onClearSelection={() => setSelectedChartDate(null)}
        />

        <SectionDivider />

        {/* Row 4: Year x Month Matrix */}
        <SegmentedTable
          dfFull={dimFilteredDf}
          metricCol={activeMetricCol}
          startDate={startDate}
          endDate={endDate}
        />

        {/* Footer Metadata */}
        <div style={{ fontSize: '0.8rem', color: '#94A3B8', textAlign: 'center', marginTop: '32px' }}>
          Last refresh date of data: {maxDataDate}
        </div>
      </main>
        
    </div>
  );
}