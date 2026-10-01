import { useState, useEffect, useMemo } from 'react';
import { INITIAL_DIMENSION_STATE, DIMENSION_FILTERS } from '../constants/dashboardConfig';
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

  // Reset all filters back to default
  const handleResetFilters = () => {
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

  // ==============================================================================
  // DYNAMIC CROSS-FILTERING PIPELINE
  // ==============================================================================

  // Baseline temporal slice used for populating dropdown options
  const baseDateSlice = useMemo(() => {
    if (!startDate || !endDate) return rawData;
    return rawData.filter((row) => row.date >= startDate && row.date <= endDate);
  }, [rawData, startDate, endDate]);

  // Dynamic dropdown options calculated using "All-But-Self" subset
  const availableOptions = useMemo(() => {
    const optionsMap = {};

    DIMENSION_FILTERS.forEach(({ key }) => {
      let subset = baseDateSlice;

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
    return dimFilteredDf.filter((row) => row.date >= startDate && row.date <= endDate);
  }, [dimFilteredDf, startDate, endDate]);

  return {
    loading,
    rawData,
    setRawData,
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
    availableOptions
  };
}