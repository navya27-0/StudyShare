import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/api';
import type { AdminReport } from '../../types';

export function useAdminReports(onError: (msg: string) => void) {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'open' | 'reviewed' | 'dismissed' | 'all'>('open');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReports(statusFilter, page, 20);
      setReports(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, onError]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    total,
    statusFilter,
    setStatusFilter,
    loading,
    page,
    setPage,
    refetch: fetchReports,
  };
}
