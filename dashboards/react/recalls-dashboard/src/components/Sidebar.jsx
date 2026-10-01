import React from 'react';
import { DIMENSION_FILTERS } from '../constants/dashboardConfig';

export function Sidebar({
  isOpen,
  onToggle,
  preset,
  setPreset,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  minDataDate,
  maxDataDate,
  dimensionFilters,
  handleDimensionChange,
  availableOptions,
  onResetFilters,
}) {
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
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
        {isOpen ? '✕' : '⚙️'}
      </button>

      {/* Conditional Sidebar */}
      {isOpen && (
        <aside
          style={{
            width: '200px',
            backgroundColor: '#ffffff',
            padding: '20px 20px 20px 30px',
            borderRight: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A' }}>
              Filters
            </h3>
            <button
              onClick={onResetFilters}
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
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              Date Range Preset
            </label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
              }}
            >
              {[
                'Last Month',
                'Last 6 Months',
                'Current Year',
                'Last Year',
                'Custom',
                'All Time',
              ].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Custom Date Inputs */}
            {preset === 'Custom' && (
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <input
                  type="date"
                  value={customStartDate || minDataDate}
                  min={minDataDate}
                  max={maxDataDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                  }}
                />
                <input
                  type="date"
                  value={customEndDate || maxDataDate}
                  min={minDataDate}
                  max={maxDataDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                  }}
                />
              </div>
            )}
          </div>

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid #E2E8F0',
              margin: '20px 0',
            }}
          />

          {/* Dimension Selectboxes */}
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: '0.95rem',
              color: '#0F172A',
            }}
          >
            Dimension Filters
          </h4>
          {DIMENSION_FILTERS.map(({ key, label }) => {
            const options = availableOptions[key] || ['All'];
            const currentValue = options.includes(dimensionFilters[key])
              ? dimensionFilters[key]
              : 'All';

            return (
              <div key={key} style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#475569',
                    marginBottom: '4px',
                  }}
                >
                  {label}
                </label>
                <select
                  value={currentValue}
                  onChange={(e) => handleDimensionChange(key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                  }}
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </aside>
      )}
    </>
  );
}