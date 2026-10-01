import { useState, useEffect, useMemo } from 'react';
import { INITIAL_DIMENSION_STATE } from '../constants/dashboardConfig';
import { toISODate } from '../utils/formatters';

export function useDashboardData() {
  // Raw Data State
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [preset, setPreset] = useState('Current Year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dimensionFilters, setDimensionFilters] = useState(INITIAL_DIMENSION_STATE);

  // Interactive UI States
  const [activeMetricCol, setActiveMetricCol] = useState('recalls');
  const [selectedChartDate, setSelectedChartDate] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data Ingestion
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`${import.meta.env.BASE_URL}data/agg_recalls_data.json`);
        const json = await res.json();
        setRawData(json);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDimensionChange = (key, value) => {
    setDimensionFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setPreset('Current Year');
    setCustomStartDate('');
    setCustomEndDate('');
    setDimensionFilters(INITIAL_DIMENSION_STATE);
    setSelectedChartDate(null);
  };

  // Ensure this memoized block includes your full original date filter logic
  const filteredData = useMemo(() => {
    if (!rawData.length) return [];

    return rawData.filter((row) => {
      for (const [key, val] of Object.entries(dimensionFilters)) {
        if (val !== 'All' && row[key] !== val) return false;
      }
      return true;
    });
  }, [rawData, dimensionFilters, preset, customStartDate, customEndDate]);

  // Global Date Bounds calculated from full dataset
  const { minDataDate, maxDataDate } = useMemo(() => {
    if (!rawData.length) return { minDataDate: '', maxDataDate: '' };
    const dates = rawData.map((d) => new Date(d.date)).filter((d) => !isNaN(d));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    return { minDataDate: toISODate(min), maxDataDate: toISODate(max) };
  }, [rawData]);

  return {
    loading,
    rawData,
    setRawData,
    filteredData,
    minDataDate,
    maxDataDate,
    preset,
    setPreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dimensionFilters,
    setDimensionFilters,
    handleDimensionChange,
    resetFilters,
    activeMetricCol,
    setActiveMetricCol,
    selectedChartDate,
    setSelectedChartDate,
    isSidebarOpen,
    setIsSidebarOpen,
  };
}