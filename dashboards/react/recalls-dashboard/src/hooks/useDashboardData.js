import { useState, useEffect, useMemo } from 'react';
import { INITIAL_DIMENSION_STATE } from '../constants/dashboardConfig';
import { resolveBounds } from '../utils/dateUtils';

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
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
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

  // 1. Dataset Min/Max Bounds
  const { startDate: minDataDate, endDate: maxDataDate } = useMemo(() => {
    return resolveBounds(rawData);
  }, [rawData]);

  // 2. Active Date Range based on Preset / Custom Dates
  const { startDate, endDate } = useMemo(() => {
    if (!rawData.length) return { startDate: '', endDate: '' };

    switch (preset) {
      case 'Last Month':
        return resolveBounds(
          rawData.filter((d) => d.months_ago === 1),
          minDataDate,
          maxDataDate
        );
      case 'Last 6 Months':
        return resolveBounds(
          rawData.filter((d) => d.months_ago >= 1 && d.months_ago <= 6),
          minDataDate,
          maxDataDate
        );
      case 'Current Year':
        return resolveBounds(
          rawData.filter((d) => d.years_ago === 0),
          minDataDate,
          maxDataDate
        );
      case 'Last Year':
        return resolveBounds(
          rawData.filter((d) => d.years_ago === 1),
          minDataDate,
          maxDataDate
        );
      case 'All Time':
        return { startDate: minDataDate, endDate: maxDataDate };
      case 'Custom':
        return {
          startDate: customStartDate || minDataDate,
          endDate: customEndDate || maxDataDate,
        };
      default:
        return resolveBounds(
          rawData.filter((d) => d.years_ago === 0),
          minDataDate,
          maxDataDate
        );
    }
  }, [preset, rawData, minDataDate, maxDataDate, customStartDate, customEndDate]);

  // 3. Derived Filtered Data (Dimensions + Date Range)
  const filteredData = useMemo(() => {
    if (!rawData.length) return [];

    return rawData.filter((row) => {
      // Dimension Filtering
      for (const [key, val] of Object.entries(dimensionFilters)) {
        if (val !== 'All' && row[key] !== val) return false;
      }

      // Date Range Filtering
      if (startDate && row.date < startDate) return false;
      if (endDate && row.date > endDate) return false;

      return true;
    });
  }, [rawData, dimensionFilters, startDate, endDate]);

  return {
    loading,
    rawData,
    setRawData,
    filteredData,
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
    resetFilters,
    activeMetricCol,
    setActiveMetricCol,
    selectedChartDate,
    setSelectedChartDate,
    isSidebarOpen,
    setIsSidebarOpen,
  };
}