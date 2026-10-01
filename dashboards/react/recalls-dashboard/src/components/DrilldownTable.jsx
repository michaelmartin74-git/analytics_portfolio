import { useTablePagination } from '../hooks/useTablePagination';

export function DrilldownTable({ dfFiltered = [], selectedDate, onClearSelection }) {
  const {
    page,
    totalPages,
    filteredRecords,
    paginatedRows,
    nextPage,
    prevPage,
    pageSize,
  } = useTablePagination(dfFiltered, selectedDate, 8);

  const startRecord = filteredRecords.length ? page * pageSize + 1 : 0;
  const endRecord = Math.min((page + 1) * pageSize, filteredRecords.length);

  return (
    <div>
      {/* Table Header / Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em' }}>
            RECORD DRILLDOWN DETAIL
          </span>
          {selectedDate && (
            <span style={{ fontSize: '0.8rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Filtered Date: {selectedDate}
            </span>
          )}
        </div>
        {selectedDate && (
          <button
            onClick={onClearSelection}
            style={{ fontSize: '0.75rem', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear Date Selection
          </button>
        )}
      </div>

      {/* Table Data Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
              <th style={{ padding: '8px' }}>Date</th>
              <th style={{ padding: '8px' }}>Class</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>Recalling Firm</th>
              <th style={{ padding: '8px' }}>Reason Category</th>
              <th style={{ padding: '8px' }}>State</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Recalls</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', color: '#1E293B' }}>
                  <td style={{ padding: '8px' }}>{row.date}</td>
                  <td style={{ padding: '8px' }}>{row.class || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.status || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.recalling_firm || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.reason_category || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.geo_state || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{row.recalls ?? 1}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                  No drilldown records match the selected parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.8rem', color: '#64748B' }}>
        <span>
          Showing {startRecord} to {endRecord} of {filteredRecords.length} records
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            disabled={page === 0}
            onClick={prevPage}
            style={{ padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFF', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages - 1}
            onClick={nextPage}
            style={{ padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFF', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}