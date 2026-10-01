import { useState, useMemo, useEffect } from 'react';

export function useTablePagination(data = [], selectedDate = null, pageSize = 8) {
  const [page, setPage] = useState(0);

  // 1. Filter dataset by selected date
  const filteredRecords = useMemo(() => {
    if (!selectedDate) return data;
    return data.filter((r) => r.date === selectedDate);
  }, [data, selectedDate]);

  // 2. Reset page to 0 whenever filter criteria changes
  useEffect(() => {
    setPage(0);
  }, [selectedDate, data]);

  // 3. Compute total pages and paginated slice
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  const paginatedRows = useMemo(() => {
    const start = page * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const nextPage = () => setPage((p) => Math.min(p + 1, totalPages - 1));
  const prevPage = () => setPage((p) => Math.max(p - 1, 0));

  return {
    page,
    totalPages,
    filteredRecords,
    paginatedRows,
    nextPage,
    prevPage,
    pageSize,
  };
}